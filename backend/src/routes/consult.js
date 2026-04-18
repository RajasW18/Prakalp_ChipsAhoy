'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireDoctor } = require('../middleware/authenticate');
const router = express.Router();
const prisma = require('../db');

// POST /api/consult/:sessionId — doctor adds a consultation to a session
router.post('/:sessionId',
  authenticate, requireDoctor,
  body('findings').optional().isString().trim(),
  body('recommendation').optional().isString().trim(),
  body('severity').isIn(['NORMAL', 'MONITOR', 'URGENT']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { sessionId } = req.params;
      const { findings, recommendation, severity } = req.body;

      const session = await prisma.session.findUnique({
        where  : { id: sessionId },
        select : { patientId: true },
      });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const consult = await prisma.consultation.create({
        data: {
          sessionId,
          doctorId : req.user.sub,
          patientId: session.patientId,
          findings,
          recommendation,
          severity,
        },
        include: { doctor: { select: { name: true, email: true } } },
      });

      res.status(201).json(consult);
    } catch (err) { next(err); }
  }
);

// GET /api/consult/session/:sessionId — list all consultations for a session
router.get('/session/:sessionId', authenticate, async (req, res, next) => {
  try {
    const consults = await prisma.consultation.findMany({
      where  : { sessionId: req.params.sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { select: { name: true, email: true, avatarUrl: true } },
      },
    });
    res.json(consults);
  } catch (err) { next(err); }
});

// GET /api/consult/patient/:patientId — all consultations for a patient
router.get('/patient/:patientId', authenticate, async (req, res, next) => {
  try {
    const isSelf   = req.user.sub === req.params.patientId;
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    if (!isSelf && !isDoctor) return res.status(403).json({ error: 'Access denied' });

    const consults = await prisma.consultation.findMany({
      where  : { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor : { select: { name: true, email: true } },
        session: { select: { startedAt: true, endedAt: true } },
      },
    });
    res.json(consults);
  } catch (err) { next(err); }
});

module.exports = router;
