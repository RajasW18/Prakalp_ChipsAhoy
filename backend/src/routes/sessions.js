'use strict';
const express = require('express');
const { authenticate, requireDoctor } = require('../middleware/authenticate');
const router = express.Router();
const prisma = require('../db');

// GET /api/sessions/:id/data — paginated PPG readings for a session
router.get('/:id/data', authenticate, async (req, res, next) => {
  try {
    const { id }    = req.params;
    const limit     = Math.min(parseInt(req.query.limit)  || 500,  2000);
    const cursor    = req.query.cursor ? BigInt(req.query.cursor) : undefined;

    const readings = await prisma.ppgReading.findMany({
      where  : { sessionId: id },
      orderBy: { ts: 'asc' },
      take   : limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select : { id: true, ts: true, seq: true, raw12bit: true, voltageV: true },
    });

    const nextCursor = readings.length === limit
      ? readings[readings.length - 1].id.toString()
      : null;

    res.json({ data: readings.map(r => ({ ...r, id: r.id.toString(), seq: r.seq.toString() })), nextCursor });
  } catch (err) { next(err); }
});

// GET /api/sessions/:id — session metadata + predictions
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where  : { id: req.params.id },
      include: {
        device     : { select: { macAddress: true, label: true } },
        patient    : { select: { id: true, name: true, email: true } },
        predictions: { orderBy: { ts: 'desc' }, take: 50 },
        consultations: {
          include: { doctor: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) { next(err); }
});

// GET /api/sessions — list sessions (doctors see all; patients see only theirs)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    const sessions = await prisma.session.findMany({
      where  : isDoctor ? {} : { patientId: req.user.sub },
      orderBy: { startedAt: 'desc' },
      take   : 50,
      include: {
        device : { select: { macAddress: true, label: true } },
        patient: { select: { name: true, email: true } },
        _count : { select: { ppgReadings: true, predictions: true, consultations: true } },
      },
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

// PATCH /api/sessions/:id/end — mark session as completed
router.patch('/:id/end', authenticate, requireDoctor, async (req, res, next) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data : { status: 'COMPLETED', endedAt: new Date() },
    });
    res.json(session);
  } catch (err) { next(err); }
});

// GET /api/sessions/:id/export — download all data for a session as CSV
router.get('/:id/export', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true } } }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Permissions: Only owner or doctor
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    if (!isDoctor && session.patientId !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all readings (might be large, but for now we fetch all)
    const readings = await prisma.ppgReading.findMany({
      where: { sessionId: id },
      orderBy: { ts: 'asc' },
      select: { ts: true, seq: true, raw12bit: true, voltageV: true }
    });

    const filename = `ppg_session_${id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write CSV header
    res.write('Timestamp,Sequence,RawValue,Voltage\n');

    // Write data rows
    readings.forEach(r => {
      res.write(`${r.ts.toISOString()},${r.seq},${r.raw12bit},${r.voltageV}\n`);
    });

    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
