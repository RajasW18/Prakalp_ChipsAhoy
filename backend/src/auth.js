'use strict';

const passport  = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const jwt       = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');
const crypto    = require('crypto');
const prisma = require('./db');

// ─── Encryption helpers (AES-256-CBC) for TOTP secrets at rest ────────────────
const ENC_KEY = Buffer.from(process.env.TOTP_ENCRYPTION_KEY || '0'.repeat(64), 'hex');
const IV_LEN  = 16;

function encryptSecret(text) {
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decryptSecret(encrypted) {
  const [ivHex, encHex] = encrypted.split(':');
  const iv      = Buffer.from(ivHex, 'hex');
  const encBuf  = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, totpEnabled: user.totpEnabled },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
}

function setCookies(res, user) {
  const access  = signAccessToken(user);
  const refresh = signRefreshToken(user);

  const secure   = process.env.COOKIE_SECURE === 'true';
  // Cross-domain (Vercel ↔ Render) requires 'none'; local dev uses 'lax'
  const sameSite = secure ? 'none' : 'lax';

  res.cookie('ppg_access', access, {
    httpOnly: true, secure, sameSite,
    maxAge  : 60 * 60 * 1000,       // 1 h
  });
  res.cookie('ppg_refresh', refresh, {
    httpOnly: true, secure, sameSite,
    maxAge  : 7 * 24 * 60 * 60 * 1000,  // 7 d
    path    : '/auth/refresh',
  });

  return access;   // Also returned so WS clients can get it
}

// ─── Passport Google Strategy ─────────────────────────────────────────────────
function setupPassport() {
  passport.use(new GoogleStrategy(
    {
      clientID    : process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL : process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value;
        const oauthSub  = profile.id;

        // Upsert: find by oauthSub or email, create if not exists
        let user = await prisma.user.findFirst({
          where: { OR: [{ oauthSub }, { email }] },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name     : profile.displayName,
              avatarUrl,
              oauthSub ,
              role     : 'PATIENT',   // Default role; doctors are promoted manually
            },
          });
          console.log(`[AUTH] New user registered: ${email}`);
        } else {
          // Update oauth sub and avatar in case they changed
          user = await prisma.user.update({
            where: { id: user.id },
            data : { oauthSub, avatarUrl, updatedAt: new Date() },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Passport doesn't use session serialization (we use JWT cookies instead)
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}

// ─── 2FA (TOTP) helpers ───────────────────────────────────────────────────────

// Generate a new TOTP secret for a user, store it encrypted, return QR URL
async function setup2FA(userId) {
  const secret = speakeasy.generateSecret({
    name  : `${process.env.TOTP_ISSUER} (doctor)`,
    length: 20,
  });

  // Persist encrypted secret (not yet enabled — enabled only after first verify)
  await prisma.user.update({
    where: { id: userId },
    data : {
      totpSecret : encryptSecret(secret.base32),
      totpEnabled: false,
    },
  });

  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
  return { qrDataUrl, manualKey: secret.base32 };
}

// Verify a TOTP token and enable 2FA on the user's account if not yet enabled
async function verify2FA(userId, token) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw new Error('2FA not set up for this user');

  const rawSecret = decryptSecret(user.totpSecret);
  const valid = speakeasy.totp.verify({
    secret  : rawSecret,
    encoding: 'base32',
    token,
    window  : 1,   // Allow 30 s clock drift on either side
  });

  if (!valid) return false;

  // First successful verify → enable 2FA permanently
  if (!user.totpEnabled) {
    await prisma.user.update({
      where: { id: userId },
      data : { totpEnabled: true },
    });
  }

  return true;
}

module.exports = {
  setupPassport,
  signAccessToken,
  setCookies,
  setup2FA,
  verify2FA,
};
