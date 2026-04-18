'use strict';

const jwt = require('jsonwebtoken');

// ─── authenticate middleware ───────────────────────────────────────────────────
// Reads JWT from HttpOnly cookie OR Authorization: Bearer header (for WS clients)
function authenticate(req, res, next) {
  let token = req.cookies?.ppg_access;

  if (!token) {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) token = auth.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── requireDoctor middleware ──────────────────────────────────────────────────
function requireDoctor(req, res, next) {
  if (req.user?.role !== 'DOCTOR' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
}

// ─── requireAdmin middleware ───────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireDoctor, requireAdmin };
