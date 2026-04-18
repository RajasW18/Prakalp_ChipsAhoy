'use strict';

const mqtt       = require('mqtt');
const { PrismaClient } = require('@prisma/client');
const { broadcast }    = require('./websocket');

const prisma = new PrismaClient();

// ─── In-memory caches (avoid per-packet DB round trips at 100 Hz) ────────────
// mac → device record
const deviceCache  = new Map();
// deviceId → session record
const sessionCache = new Map();
// Per-device packet counter used to throttle DB writes
const writeCounter = new Map();
const DB_WRITE_EVERY = 50;   // Write 1 in every 50 packets (~2/s at 100 Hz)

// ─── MQTT Topic Patterns ───────────────────────────────────────────────────────
// We subscribe to wildcards and parse the device MAC from the topic string.
const TOPICS = {
  DATA:   'ppg/device/+/data',
  PRED:   'ppg/device/+/prediction',
  STATUS: 'ppg/device/+/status',
  ERROR:  'ppg/device/+/error',
};

// ─── Initialise MQTT Connection ───────────────────────────────────────────────
function initMQTT() {
  const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    username : process.env.MQTT_USERNAME,
    password : process.env.MQTT_PASSWORD,
    clientId : `ppg_backend_${Date.now()}`,
    clean    : true,
    reconnectPeriod: 3000,
    connectTimeout : 10000,
    // TLS is implicit from the mqtts:// protocol in MQTT_BROKER_URL
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    Object.values(TOPICS).forEach(topic => {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) console.error(`[MQTT] Subscribe error on ${topic}:`, err.message);
        else      console.log(`[MQTT] Subscribed: ${topic}`);
      });
    });
  });

  client.on('message', (topic, payload) => {
    handleMessage(topic, payload).catch(err =>
      console.error('[MQTT] handleMessage error:', err.message)
    );
  });

  client.on('error',       (e) => console.error('[MQTT] Error:', e.message));
  client.on('reconnect',   ()  => console.warn ('[MQTT] Reconnecting...'));
  client.on('offline',     ()  => console.warn ('[MQTT] Broker offline'));
  client.on('disconnect',  ()  => console.warn ('[MQTT] Disconnected'));

  return client;
}

// ─── Message Router ───────────────────────────────────────────────────────────
async function handleMessage(topic, payload) {
  let data;
  try {
    data = JSON.parse(payload.toString());
  } catch {
    console.warn('[MQTT] Non-JSON payload on topic:', topic);
    return;
  }

  // Extract device MAC from topic: "ppg/device/AA:BB:CC:DD:EE:FF/data"
  const parts    = topic.split('/');
  const deviceId = parts[2];   // MAC address string
  const msgType  = parts[3];   // "data" | "prediction" | "status" | "error"

  switch (msgType) {
    case 'data':       await handlePPGData(deviceId, data); break;
    case 'prediction': await handlePrediction(deviceId, data); break;
    case 'status':     await handleStatus(deviceId, data); break;
    case 'error':      await handleErrorReport(deviceId, data); break;
    default:
      console.warn('[MQTT] Unknown message type:', msgType);
  }
}

// ─── PPG Data Handler ─────────────────────────────────────────────────────────
async function handlePPGData(macAddress, data) {
  // 1. Resolve device from cache (only hits DB on first packet per MAC)
  const device = await upsertDevice(macAddress);

  // 2. Resolve session from cache (only hits DB once per device boot)
  const session = await ensureActiveSession(device);

  // 3. Broadcast IMMEDIATELY — never blocked by DB
  broadcast(macAddress, {
    type      : 'ppg',
    ts        : data.ts,
    raw       : data.raw,
    voltage_v : data.voltage_v,
    seq       : data.seq,
    sessionId : session.id,
  });

  // 4. Throttled DB write — only 1 in every DB_WRITE_EVERY packets
  const count = (writeCounter.get(macAddress) || 0) + 1;
  writeCounter.set(macAddress, count);
  if (count % DB_WRITE_EVERY !== 0) return;  // Skip this packet

  if (count % (DB_WRITE_EVERY * 10) === 0) {
    console.log(`[PPG] ${macAddress} seq=${data.seq} raw=${data.raw} (db write)`);
  }

  await prisma.ppgReading.create({
    data: {
      ts      : new Date(Number(data.ts)),
      seq     : BigInt(data.seq || 0),
      raw12bit: data.raw,
      voltageV: data.voltage_v ?? (data.raw / 4095.0),  // ADC → voltage if not provided
      session : { connect: { id: session.id } },
      device  : { connect: { id: device.id  } },
    },
  });
}


// ─── ML Prediction Handler ────────────────────────────────────────────────────
async function handlePrediction(macAddress, data) {
  const device  = await upsertDevice(macAddress);
  const session = await ensureActiveSession(device);

  // Accept both naming conventions:
  //   real firmware → class_id, class_label, confidence_raw
  //   test_sender   → class, label  (computed confidence_raw)
  const classId       = data.class_id       ?? data.class   ?? 0;
  const classLabel    = data.class_label    ?? data.label   ?? 'Unknown';
  const confidence    = data.confidence     ?? 0;
  const confidenceRaw = data.confidence_raw ?? Math.round(confidence * 255);

  // Broadcast first — never blocked by DB
  broadcast(macAddress, {
    type        : 'prediction',
    ts          : data.ts,
    class_id    : classId,
    class_label : classLabel,
    confidence,
    sessionId   : session.id,
  });

  console.log(`[PRED] ${macAddress} → ${classLabel} (${(confidence * 100).toFixed(1)}%)`);

  await prisma.mlPrediction.create({
    data: {
      ts            : new Date(Number(data.ts)),
      classId,
      classLabel,
      confidence,
      confidenceRaw,
      session       : { connect: { id: session.id } },
    },
  });
}

// ─── Status / Heartbeat Handler ───────────────────────────────────────────────
async function handleStatus(macAddress, data) {
  // Update device's lastSeenAt and RSSI
  await prisma.device.updateMany({
    where : { macAddress },
    data  : {
      lastSeenAt : new Date(),
      rssiDbm    : data.rssi_dbm || null,
    },
  });

  broadcast(macAddress, {
    type     : 'status',
    status   : data.status,
    rssi_dbm : data.rssi_dbm,
    heap_free: data.heap_free,
    uptime_s : data.uptime_s,
  });
}

// ─── Error Report Handler ─────────────────────────────────────────────────────
async function handleErrorReport(macAddress, data) {
  console.warn(
    `[ERROR] ${macAddress} — framing errors: ${data.framing_errors} / ${data.total_packets} pkts ` +
    `(${data.packet_loss_pct}% loss)`
  );
  broadcast(macAddress, { type: 'error', ...data });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Upsert a device by MAC address. Returns the DB device record.
// Uses an in-memory cache so we only hit the DB once per unique MAC.
async function upsertDevice(macAddress) {
  if (deviceCache.has(macAddress)) return deviceCache.get(macAddress);

  const device = await prisma.device.upsert({
    where  : { macAddress },
    update : { lastSeenAt: new Date() },
    create : { macAddress, label: `Device ${macAddress.slice(-5)}` },
  });
  deviceCache.set(macAddress, device);
  return device;
}

// Find or create an ACTIVE session for this device.
// A new session is created if none exists or the latest one was completed/errored.
async function ensureActiveSession(device) {
  // Check cache first
  const cached = sessionCache.get(device.id);
  if (cached) return cached;

  // Try to find an existing active session
  let session = await prisma.session.findFirst({
    where  : { deviceId: device.id, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) {
    // Create a new session; use device's assigned patient (if any)
    session = await prisma.session.create({
      data: {
        deviceId : device.id,
        patientId: device.patientId || (await getOrCreateDefaultPatient()).id,
        status   : 'ACTIVE',
      },
    });
    console.log(`[SESSION] New session ${session.id} for device ${device.macAddress}`);
  }

  sessionCache.set(device.id, session);
  return session;
}

// Fallback: create a placeholder "unassigned" patient when a device has no patient linked
async function getOrCreateDefaultPatient() {
  let user = await prisma.user.findFirst({ where: { email: 'unassigned@ppg.local' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'unassigned@ppg.local',
        name : 'Unassigned Patient',
        role : 'PATIENT',
      },
    });
  }
  return user;
}

module.exports = { initMQTT };
