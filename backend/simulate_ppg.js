'use strict';

/**
 * PPG Simulation Script
 * --------------------
 * Connects to your HiveMQ broker and sends synthetic PPG data.
 * Ideal for testing the frontend dashboard when hardware is unavailable.
 */

require('dotenv').config();
const mqtt = require('mqtt');

// Frequency settings
const HZ = 100; // 100 Hz (standard for PPG)
const PREDICTION_EVERY_MS = 10000; // Send an ML prediction every 10 seconds

// Simulated Device Identifier (Use valid MAC format)
const DEVICE_ID = '00:1A:22:33:44:55';

// Topics
const TOPICS = {
  DATA: `ppg/device/${DEVICE_ID}/data`,
  PRED: `ppg/device/${DEVICE_ID}/prediction`,
  STATUS: `ppg/device/${DEVICE_ID}/status`,
};

// ─── MQTT Client Setup ───────────────────────────────────────────────────────
const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clientId: `ppg_simulator_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ Broker');
  console.log(`📡 Simulating Device: ${DEVICE_ID}`);
  console.log(`📈 Sending data at ${HZ}Hz...`);
  
  startSimulation();
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  process.exit(1);
});

// ─── Simulation Logic ────────────────────────────────────────────────────────
let seq = 0;
let startTime = Date.now();

function startSimulation() {
  // 1. Send initial online status
  client.publish(TOPICS.STATUS, JSON.stringify({
    status: 'online',
    rssi_dbm: -45,
    heap_free: 240000,
    uptime_s: 0
  }));

  // 2. Continuous PPG Data Loop
  setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;

    /**
     * Generate synthetic PPG Wave (Simplified Model)
     * PPG is roughly a sine wave + a secondary "dicrotic notch"
     */
    const frequency = 1.2; // ~72 BPM
    const baseWave = Math.sin(2 * Math.PI * frequency * elapsedSeconds);
    const notch = 0.4 * Math.sin(2 * Math.PI * frequency * 2 * elapsedSeconds + 1.2);
    const noise = (Math.random() - 0.5) * 0.05;
    
    // Normalize to 0.0 - 1.0 range
    let normalizedValue = (baseWave + notch + 2) / 4 + noise;
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));
    
    // Convert to 12-bit ADC raw value (0 - 4095)
    const raw = Math.round(normalizedValue * 4095);

    const payload = {
      ts: now,
      seq: seq++,
      raw: raw,
      voltage_v: normalizedValue * 3.3
    };

    client.publish(TOPICS.DATA, JSON.stringify(payload));
  }, 1000 / HZ);

  // 3. Periodic Prediction Engine Simulation
  setInterval(() => {
    const labels = ['Normal Sinus Rhythm', 'Premature Ventricular Contraction', 'Sinus Tachycardia'];
    const idx = Math.floor(Math.random() * labels.length);
    
    const prediction = {
      ts: Date.now(),
      class_id: idx,
      class_label: labels[idx],
      confidence: 0.85 + (Math.random() * 0.14) // 85% - 99%
    };

    console.log(`🤖 Sending Fake Prediction: ${prediction.class_label}`);
    client.publish(TOPICS.PRED, JSON.stringify(prediction));
  }, PREDICTION_EVERY_MS);
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping simulation...');
  client.publish(TOPICS.STATUS, JSON.stringify({ status: 'offline' }), () => {
    client.end();
    process.exit();
  });
});
