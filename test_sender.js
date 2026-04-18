/**
 * test_sender.js — Sends simulated PPG + prediction data directly to HiveMQ
 * Run: node test_sender.js
 * This bypasses the ESP32 and tests the Backend → WebSocket → Frontend pipeline.
 */

const mqtt   = require('mqtt');
const crypto = require('crypto');

// ── Config (matches config.h and .env) ────────────────────────────────────────
const BROKER   = 'mqtts://bf78d68774914aa684fdddd52e574e1d.s1.eu.hivemq.cloud:8883';
const USERNAME = 'prakalp4.0';
const PASSWORD = 'Prakalp4';
const MAC      = 'AA:BB:CC:DD:EE:FF';   // Simulated device MAC

const TOPIC_DATA   = `ppg/device/${MAC}/data`;
const TOPIC_PRED   = `ppg/device/${MAC}/prediction`;
const TOPIC_STATUS = `ppg/device/${MAC}/status`;

// ── Connect ───────────────────────────────────────────────────────────────────
console.log('Connecting to HiveMQ...');
const client = mqtt.connect(BROKER, {
  username          : USERNAME,
  password          : PASSWORD,
  rejectUnauthorized: false,
});

// ── Simulate PPG waveform ─────────────────────────────────────────────────────
let t = 0;
let seq = 0;

function ppgSample() {
  // Realistic PPG: 1.2 Hz heartbeat + noise
  const base  = 2048;
  const pulse = 1200 * Math.pow(Math.sin(Math.PI * ((t * 1.2) % 1)), 8);
  const noise = (Math.random() - 0.5) * 40;
  return Math.round(base + pulse + noise);
}

client.on('connect', () => {
  console.log(`✅ Connected! Publishing to ${MAC}`);
  console.log('   Topics:');
  console.log(`   • ${TOPIC_DATA}`);
  console.log(`   • ${TOPIC_PRED}`);
  console.log(`   • ${TOPIC_STATUS}`);
  console.log('\n📡 Sending PPG data at 100 Hz... (Ctrl+C to stop)\n');

  // Publish status heartbeat
  const status = {
    mac     : MAC,
    rssi    : -65,
    ip      : '192.168.0.146',
    uptime  : 0,
    freeHeap: 200000,
    ts      : Date.now(),
  };
  client.publish(TOPIC_STATUS, JSON.stringify(status), { qos: 1 });

  // Publish PPG data at 100 Hz
  let predTimer = 0;
  const interval = setInterval(() => {
    const raw = ppgSample();
    const payload = {
      seq  : seq++,
      raw,
      bpm  : Math.round(72 + 4 * Math.sin(t * 0.1)),
      temp : 36.8,
      spo2 : 98,
      ts   : Date.now(),
    };
    client.publish(TOPIC_DATA, JSON.stringify(payload), { qos: 1 });
    t += 1 / 100;
    predTimer += 1 / 100;

    // Send prediction every 5 seconds
    if (predTimer >= 5) {
      predTimer = 0;
      const classes = ['Normal Sinus Rhythm', 'Atrial Fibrillation', 'Bradycardia', 'Tachycardia', 'Noisy Signal'];
      const pred = {
        class      : 0,
        label      : classes[0],
        confidence : 0.94,
        ts         : Date.now(),
      };
      client.publish(TOPIC_PRED, JSON.stringify(pred), { qos: 1 });
      console.log(`[PRED] ${pred.label} (${(pred.confidence * 100).toFixed(0)}%)`);
    }

    if (seq % 100 === 0) {
      process.stdout.write(`\r[PPG] seq=${seq}  raw=${raw}  bpm=${payload.bpm}`);
    }
  }, 10); // 100 Hz

  client.on('close', () => { clearInterval(interval); console.log('\nDisconnected.'); });
});

client.on('error', (err) => console.error('MQTT error:', err.message));
