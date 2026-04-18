'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireDoctor } = require('../middleware/authenticate');
const router = express.Router();
const prisma = require('../db');

// GET /api/patients — doctors/admins see all; patients see only themselves
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    if (!isDoctor) {
      const me = await prisma.user.findUnique({
        where : { id: req.user.sub },
        select: { id: true, name: true, email: true, createdAt: true, avatarUrl: true },
      });
      return res.json([me]);
    }
    const patients = await prisma.user.findMany({
      where  : { role: 'PATIENT' },
      orderBy: { name: 'asc' },
      select : { id: true, name: true, email: true, createdAt: true, avatarUrl: true,
                 devices: { select: { macAddress: true, label: true, lastSeenAt: true } } },
    });
    res.json(patients);
  } catch (err) { next(err); }
});

// GET /api/patients/:id — patient detail with sessions summary
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const isSelf   = req.user.sub === req.params.id;
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    if (!isSelf && !isDoctor) return res.status(403).json({ error: 'Access denied' });

    const patient = await prisma.user.findUnique({
      where  : { id: req.params.id },
      select : {
        id: true, name: true, email: true, avatarUrl: true, createdAt: true,
        devices  : { select: { id: true, macAddress: true, label: true, lastSeenAt: true } },
        patientSessions: {
          orderBy: { startedAt: 'desc' },
          take   : 20,
          select : { id: true, startedAt: true, endedAt: true, status: true,
                     _count: { select: { ppgReadings: true, predictions: true } } },
        },
      },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) { next(err); }
});

// POST /api/patients — register a new patient (doctors only)
router.post('/',
  authenticate, requireDoctor,
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, name } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const patient = await prisma.user.create({
        data: { email, name, role: 'PATIENT' },
      });
      res.status(201).json(patient);
    } catch (err) { next(err); }
  }
);

// GET /api/patients/:id/sessions — all sessions for a patient
router.get('/:id/sessions', authenticate, async (req, res, next) => {
  try {
    const isSelf   = req.user.sub === req.params.id;
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    if (!isSelf && !isDoctor) return res.status(403).json({ error: 'Access denied' });

    const sessions = await prisma.session.findMany({
      where  : { patientId: req.params.id },
      orderBy: { startedAt: 'desc' },
      include: {
        device: { select: { macAddress: true, label: true } },
        _count: { select: { ppgReadings: true, predictions: true, consultations: true } },
      },
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

module.exports = router;
