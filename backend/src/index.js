'use strict';

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const cookieParser = require('cookie-parser');
const http        = require('http');
const passport    = require('passport');

const { initMQTT }      = require('./mqtt');
const { initWebSocket } = require('./websocket');
const { setupPassport } = require('./auth');
const authRouter        = require('./routes/auth');
const patientsRouter    = require('./routes/patients');
const sessionsRouter    = require('./routes/sessions');
const devicesRouter     = require('./routes/devices');
const consultRouter     = require('./routes/consult');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,   // Relax for API server (no served HTML)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,              // Allow cookies for JWT
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Passport (OAuth) ─────────────────────────────────────────────────────────
setupPassport();
app.use(passport.initialize());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status : 'ok',
    service: 'ppg-gateway-backend',
    time   : new Date().toISOString(),
    uptime : Math.floor(process.uptime()),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',            authRouter);
app.use('/api/patients',    patientsRouter);
app.use('/api/sessions',    sessionsRouter);
app.use('/api/devices',     devicesRouter);
app.use('/api/consult',     consultRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error  : err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  PPG Gateway Backend — Port ${PORT}       ║`);
  console.log(`║  Env: ${(process.env.NODE_ENV || 'development').padEnd(32)}║`);
  console.log(`╚════════════════════════════════════════╝\n`);

  // Initialise WebSocket server (attaches to same HTTP server)
  initWebSocket(server);
  console.log('[WS]   WebSocket server attached');

  // Connect to MQTT broker and start subscribing
  initMQTT();
  console.log('[MQTT] Subscriber initialised');
});

module.exports = { app, server };
