#pragma once

// ═══════════════════════════════════════════════════════════════════════════════
//  PPG Gateway — Configuration
//  Board  : ESP32 DevKit V1 (ESP32-WROOM-32)
//  Project: FPGA-Based PPG Waveform Analysis & Disease Prediction
// ═══════════════════════════════════════════════════════════════════════════════

// ─── UART Configuration ───────────────────────────────────────────────────────
// At 115200 baud, max throughput ≈ 11520 bytes/sec (3 bytes/packet → ~3840 pkts/sec).
// This comfortably handles the FPGA's 500 Hz sample rate (1500 bytes/sec needed).
#define UART_BAUD_RATE       115200   // Matches FPGA UART output and Python GUI baud rate
#define FPGA_UART_PORT       2        // Hardware UART2 (leaves UART0 for debug)
#define FPGA_RX_PIN          16       // GPIO16 = RX2 → wire to FPGA UART TX
#define FPGA_TX_PIN          17       // GPIO17 = TX2 → not used (simplex RX only)

// ─── Packet Protocol ──────────────────────────────────────────────────────────
// PPG Packet   : [0xFF][D1][D2]  — 3 bytes, 12-bit left-aligned ADC value
//   12-bit val : (D1 << 4) | (D2 >> 4),  D2 & 0x0F must == 0x00
//   Voltage    : (raw / 4095.0) * 1.0V
//
// Prediction   : [0xFE][CLASS][CONF] — 3 bytes, ML output from FPGA
//   CLASS      : 0–4 (see PRED_CLASS_LABELS below)
//   CONF       : 0–255 → confidence = CONF / 255.0
#define PKT_HEADER_PPG       0xFF
#define PKT_HEADER_PRED      0xFE
#define PKT_TIMEOUT_MS       10       // Max wait (ms) for bytes after header

// ─── Wi-Fi Credentials ────────────────────────────────────────────────────────
#define WIFI_SSID            "Wagle2"       // << PUT YOUR WIFI NAME HERE
#define WIFI_PASSWORD        "9757135664"   // << PUT YOUR WIFI PASSWORD HERE
#define WIFI_RETRY_LIMIT     20       // attempts before giving up

// ─── MQTT Broker (HiveMQ Cloud — Free Tier) ───────────────────────────────────
// Sign up at: https://www.hivemq.com/mqtt-cloud-broker/
// Replace <YOUR_CLUSTER> with your cluster subdomain.
#define MQTT_BROKER          "bf78d68774914aa684fdddd52e574e1d.s1.eu.hivemq.cloud"
#define MQTT_PORT            8883     // MQTTS — MQTT over TLS 1.3
#define MQTT_USERNAME        "prakalp4.0"
#define MQTT_PASSWORD        "Prakalp4"
#define MQTT_KEEPALIVE_SEC   60
#define MQTT_RECONNECT_MS    3000     // delay between reconnect attempts
#define MQTT_QOS             1        // QoS 1 — at least once delivery

// ─── MQTT Topics (device MAC is appended at runtime) ────────────────────────
// Format: ppg/device/<MAC>/data | prediction | status | error
#define MQTT_TOPIC_DATA_FMT   "ppg/device/%s/data"
#define MQTT_TOPIC_PRED_FMT   "ppg/device/%s/prediction"
#define MQTT_TOPIC_STATUS_FMT "ppg/device/%s/status"
#define MQTT_TOPIC_ERROR_FMT  "ppg/device/%s/error"

// ─── NTP Time Synchronisation ─────────────────────────────────────────────────
#define NTP_SERVER1          "pool.ntp.org"
#define NTP_SERVER2          "time.google.com"
#define NTP_GMT_OFFSET_SEC   19800   // IST = UTC+5:30
#define NTP_DAYLIGHT_SEC     0

// ─── ML Prediction Class Labels ───────────────────────────────────────────────
// ⚠ These indices MUST match the FPGA's ML model output class encoding.
//   Update if your model uses different classes or ordering.
constexpr const char* PRED_CLASS_LABELS[] = {
  "Normal",
  "Arrhythmia",
  "Atrial Fibrillation",
  "Tachycardia",
  "Bradycardia"
};
constexpr uint8_t PRED_CLASS_COUNT = 5;

// ─── Operational Timing ───────────────────────────────────────────────────────
#define STATUS_INTERVAL_MS   5000    // Heartbeat publish every 5 s
#define JSON_BUFFER_SIZE     256     // ArduinoJson document size (bytes)

// ─── SPIFFS Offline Buffer ────────────────────────────────────────────────────
#define OFFLINE_BUFFER_FILE  "/offline_buf.jsonl"
#define OFFLINE_MAX_BYTES    (200 * 1024)  // 200 KB — stay within SPI flash limit
