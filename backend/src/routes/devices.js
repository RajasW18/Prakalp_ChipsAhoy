'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireDoctor } = require('../middleware/authenticate');
const router = express.Router();
const prisma = require('../db');

// GET /api/devices — list all devices (doctors see all; patients see theirs)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isDoctor = ['DOCTOR', 'ADMIN'].includes(req.user.role);
    const devices  = await prisma.device.findMany({
      where  : isDoctor ? {} : {
        OR: [
          { patientId: req.user.sub },
          { patientId: null } // Show unassigned devices for testing
        ]
      },
      orderBy: { registeredAt: 'desc' },
      include: { patient: { select: { name: true, email: true } } },
    });
    res.json(devices);
  } catch (err) { next(err); }
});

// POST /api/devices — link a device MAC to a patient (doctor only)
router.post('/',
  authenticate, requireDoctor,
  body('macAddress').matches(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i),
  body('patientId').isUUID(),
  body('label').optional().trim(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { macAddress, patientId, label } = req.body;
      const device = await prisma.device.upsert({
        where : { macAddress },
        update: { patientId, label: label || undefined },
        create: { macAddress, patientId, label },
      });
      res.status(201).json(device);
    } catch (err) { next(err); }
  }
);

// GET /api/devices/:id/status — latest status for a device
router.get('/:id/status', authenticate, async (req, res, next) => {
  try {
    const device = await prisma.device.findUnique({
      where  : { id: req.params.id },
      select : { macAddress: true, label: true, lastSeenAt: true, rssiDbm: true },
    });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const online = device.lastSeenAt &&
      (Date.now() - device.lastSeenAt.getTime()) < 30_000;
    res.json({ ...device, online });
  } catch (err) { next(err); }
});

module.exports = router;
