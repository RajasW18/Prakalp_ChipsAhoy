'use strict';

const express  = require('express');
const passport = require('passport');
const jwt      = require('jsonwebtoken');
const { setCookies, setup2FA, verify2FA } = require('../auth');
const { authenticate, requireDoctor }     = require('../middleware/authenticate');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../mailer');


const router = express.Router();
const prisma = new PrismaClient();

// ── Step 1: Redirect to Google ────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', {
    scope  : ['profile', 'email'],
    session: false,
  })
);

// ── Passwordless OTP Login ───────────────────────────────────────────────────

router.post('/email/request-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Using raw SQL upsert equivalent, but for prisma just use standard upsert if there's a unique constraint on email
    await prisma.otpCode.upsert({
      where: { email },
      update: { codeHash: otpHash, expiresAt },
      create: { email, codeHash: otpHash, expiresAt }
    });

    await sendOtpEmail(email, otp);
    res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) { next(err); }
});

router.post('/email/verify-otp', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and OTP are required' });

    const record = await prisma.otpCode.findUnique({ where: { email } });
    if (!record || record.expiresAt < new Date()) {
      return res.status(401).json({ error: 'OTP expired or invalid' });
    }

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) return res.status(401).json({ error: 'Invalid OTP' });

    await prisma.otpCode.delete({ where: { email } });

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      // Direct login
      const accessToken = setCookies(res, user);
      return res.json({ success: true, registered: true, accessToken });
    } else {
      // Signal UI to show registration form, issue short-lived JWT token
      const regToken = jwt.sign({ email, verified: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
      return res.json({ success: true, registered: false, regToken });
    }
  } catch (err) { next(err); }
});

router.post('/email/register', async (req, res, next) => {
  try {
    const { regToken, name, phoneNumber } = req.body;
    if (!regToken || !name) return res.status(400).json({ error: 'Registration Token and Name are required' });

    let decoded;
    try {
      decoded = jwt.verify(regToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Registration token expired or invalid' });
    }

    const { email } = decoded;

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) return res.status(400).json({ error: 'User already exists' });

    user = await prisma.user.create({
      data: {
        email,
        name,
        phoneNumber,
        role: 'PATIENT' // default role
      }
    });

    const accessToken = setCookies(res, user);
    res.json({ success: true, registered: true, accessToken });
  } catch (err) { next(err); }
});


// ── Step 2: Google callback ───────────────────────────────────────────────────
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/error' }),
  (req, res) => {
    const user  = req.user;
    const token = setCookies(res, user);

    // Doctors with 2FA enabled must verify TOTP before accessing dashboard
    if (user.role === 'DOCTOR' && user.totpEnabled) {
      // Store a pending-2fa token scoped only for TOTP verification
      const pending = jwt.sign(
        { sub: user.id, pending2fa: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      res.cookie('ppg_pending2fa', pending, { httpOnly: true, maxAge: 5 * 60 * 1000 });
      // Clear the full access cookie until 2FA is satisfied
      res.clearCookie('ppg_access');
      return res.redirect(`${process.env.FRONTEND_URL}/auth/2fa`);
    }

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
  }
);

// ── 2FA Setup (doctors only) ─────────────────────────────────────────────────
// POST /auth/2fa/setup → returns QR code data URL
router.post('/2fa/setup', authenticate, requireDoctor, async (req, res, next) => {
  try {
    const result = await setup2FA(req.user.sub);
    res.json(result);
  } catch (err) { next(err); }
});

// ── 2FA Verify (used on login for doctors, and to enable 2FA first time) ──────
// POST /auth/2fa/verify  body: { token: "123456" }
router.post('/2fa/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'TOTP token required' });

    // Read pending-2fa cookie to get user id
    const pending = req.cookies?.ppg_pending2fa;
    if (!pending) return res.status(400).json({ error: 'No pending 2FA session' });

    let decoded;
    try {
      decoded = jwt.verify(pending, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Pending 2FA token expired. Please log in again.' });
    }

    const valid = await verify2FA(decoded.sub, token);
    if (!valid) return res.status(401).json({ error: 'Invalid TOTP code' });

    // 2FA passed — issue full access token
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    setCookies(res, user);
    res.clearCookie('ppg_pending2fa');
    res.json({ success: true, redirectTo: '/dashboard' });
  } catch (err) { next(err); }
});

// ── Token Refresh ─────────────────────────────────────────────────────────────
// POST /auth/refresh — reads ppg_refresh cookie, issues new access token
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.ppg_refresh;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user    = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const access = setCookies(res, user);
    res.json({ accessToken: access });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }
    next(err);
  }
});

// ── Get current user (me) ─────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where : { id: req.user.sub },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, totpEnabled: true, createdAt: true },
    });
    // Return a fresh access token alongside user so WS clients can store it
    const { signAccessToken } = require('../auth');
    const accessToken = signAccessToken(user);
    res.json({ ...user, accessToken });
  } catch (err) { next(err); }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('ppg_access');
  res.clearCookie('ppg_refresh', { path: '/auth/refresh' });
  res.json({ success: true });
});

// ── DEV ONLY: Test Login (bypasses Google OAuth for local testing) ────────────
// GET /auth/test-login → creates a test doctor user and sets JWT cookies
// REMOVE THIS BEFORE DEPLOYING TO PRODUCTION
router.get('/test-login', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Only available in development mode' });
  }
  try {
    const user = await prisma.user.upsert({
      where : { email: 'test@prakalp.dev' },
      update: { name: 'Test Doctor', role: 'DOCTOR' },
      create: {
        email      : 'test@prakalp.dev',
        name       : 'Test Doctor',
        role       : 'DOCTOR',
        oauthSub   : 'test-oauth-sub-12345',
        totpEnabled: false,
      },
    });
    setCookies(res, user);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) { next(err); }
});

module.exports = router;
