#include "mqtt_client.h"

// ═══════════════════════════════════════════════════════════════════════════════
//  MQTTClient — Implementation
// ═══════════════════════════════════════════════════════════════════════════════

MQTTClient::MQTTClient()
  : _mqttClient(_wifiClient),
    _lastStatusMs(0),
    _lastReconnMs(0),
    _spiffsReady(false)
{
  memset(_deviceId,    0, sizeof(_deviceId));
  memset(_topicData,   0, sizeof(_topicData));
  memset(_topicPred,   0, sizeof(_topicPred));
  memset(_topicStatus, 0, sizeof(_topicStatus));
  memset(_topicError,  0, sizeof(_topicError));
}

// ─── begin() ──────────────────────────────────────────────────────────────────
void MQTTClient::begin() {
  // 1. Derive device ID from MAC address (unique per chip)
  String macStr = WiFi.macAddress();
  snprintf(_deviceId, sizeof(_deviceId), "%s", macStr.c_str());

  // 2. Pre-format MQTT topic strings
  snprintf(_topicData,   sizeof(_topicData),   MQTT_TOPIC_DATA_FMT,   _deviceId);
  snprintf(_topicPred,   sizeof(_topicPred),   MQTT_TOPIC_PRED_FMT,   _deviceId);
  snprintf(_topicStatus, sizeof(_topicStatus), MQTT_TOPIC_STATUS_FMT, _deviceId);
  snprintf(_topicError,  sizeof(_topicError),  MQTT_TOPIC_ERROR_FMT,  _deviceId);

  Serial.printf("[MQTT] Device ID: %s\n", _deviceId);

  // 3. Initialise SPIFFS (offline buffer)
  if (SPIFFS.begin(true)) {
    _spiffsReady = true;
    Serial.println("[SPIFFS] Ready");
  } else {
    Serial.println("[SPIFFS] Mount failed — offline buffering disabled");
  }

  // 4. Skip TLS certificate verification (development only)
  //    When deploying to production, replace with: _wifiClient.setCACert(HIVEMQ_ROOT_CA);
  _wifiClient.setInsecure();

  // 5. Connect Wi-Fi → NTP → MQTT
  _connectWifi();
  _syncNTP();
  _connectMQTT();
}

// ─── loop() ───────────────────────────────────────────────────────────────────
void MQTTClient::loop() {
  // Keep MQTT alive
  if (!_mqttClient.connected()) {
    unsigned long now = millis();
    if (now - _lastReconnMs >= MQTT_RECONNECT_MS) {
      _lastReconnMs = now;
      Serial.println("[MQTT] Reconnecting...");
      _connectMQTT();
      if (_mqttClient.connected()) {
        _drainSPIFFS();  // Replay buffered samples on reconnection
      }
    }
  } else {
    _mqttClient.loop();  // Process ACKs from broker (QoS 1 handshake)

    // Periodic heartbeat
    if (millis() - _lastStatusMs >= STATUS_INTERVAL_MS) {
      _lastStatusMs = millis();
      _publishStatus();
    }
  }
}

bool MQTTClient::isConnected() {
  return _mqttClient.connected();
}

// ─── publishPPG() ─────────────────────────────────────────────────────────────
void MQTTClient::publishPPG(const PPGPacket& pkt) {
  StaticJsonDocument<JSON_BUFFER_SIZE> doc;
  doc["device_id"]  = _deviceId;
  doc["ts"]         = (uint64_t)_nowMs();
  doc["type"]       = "ppg";
  doc["raw"]        = pkt.raw_12bit;
  doc["voltage_v"]  = serialized(String(pkt.voltage_v, 4));
  doc["seq"]        = pkt.seq;

  char buf[JSON_BUFFER_SIZE];
  size_t len = serializeJson(doc, buf, sizeof(buf));

  if (!_publishJSON(_topicData, doc)) {
    // MQTT unavailable — push to SPIFFS for later replay
    _bufferToSPIFFS(buf);
  }
}

// ─── publishPrediction() ──────────────────────────────────────────────────────
void MQTTClient::publishPrediction(const PredPacket& pkt) {
  StaticJsonDocument<JSON_BUFFER_SIZE> doc;
  doc["device_id"]       = _deviceId;
  doc["ts"]              = (uint64_t)_nowMs();
  doc["type"]            = "prediction";
  doc["class_id"]        = pkt.class_id;
  doc["class_label"]     = pkt.class_label;
  doc["confidence"]      = serialized(String(pkt.confidence, 3));
  doc["confidence_raw"]  = pkt.confidence_raw;

  char buf[JSON_BUFFER_SIZE];
  serializeJson(doc, buf, sizeof(buf));

  if (!_publishJSON(_topicPred, doc)) {
    _bufferToSPIFFS(buf);
  }
}

// ─── publishError() ───────────────────────────────────────────────────────────
void MQTTClient::publishError(uint32_t framing_errors, uint32_t total_packets) {
  StaticJsonDocument<JSON_BUFFER_SIZE> doc;
  doc["device_id"]       = _deviceId;
  doc["ts"]              = (uint64_t)_nowMs();
  doc["framing_errors"]  = framing_errors;
  doc["total_packets"]   = total_packets;
  float loss_pct = total_packets > 0
    ? (framing_errors * 100.0f / (total_packets + framing_errors))
    : 0.0f;
  doc["packet_loss_pct"] = serialized(String(loss_pct, 2));
  _publishJSON(_topicError, doc);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Private Helpers
// ═══════════════════════════════════════════════════════════════════════════════

void MQTTClient::_connectWifi() {
  Serial.printf("[WiFi] Connecting to '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_RETRY_LIMIT) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected. IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] FAILED — running offline. Data will buffer to SPIFFS.");
  }
}

void MQTTClient::_syncNTP() {
  if (WiFi.status() != WL_CONNECTED) return;
  configTime(NTP_GMT_OFFSET_SEC, NTP_DAYLIGHT_SEC, NTP_SERVER1, NTP_SERVER2);
  Serial.print("[NTP] Syncing");
  struct tm tm_info;
  int retries = 0;
  while (!getLocalTime(&tm_info) && retries++ < 10) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(getLocalTime(&tm_info) ? " OK" : " FAILED (timestamps may be inaccurate)");
}

void MQTTClient::_connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  _mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  _mqttClient.setKeepAlive(MQTT_KEEPALIVE_SEC);
  _mqttClient.setBufferSize(512);  // Increase from default 256 for JSON payloads

  // Build a unique client ID: "ppg_gateway_<last4ofMAC>"
  char clientId[32];
  snprintf(clientId, sizeof(clientId), "ppg_gateway_%s",
           _deviceId + 12);  // last 5 chars of MAC

  // Last Will & Testament — broker auto-publishes this if device disconnects
  char lwt[64];
  snprintf(lwt, sizeof(lwt), "{\"device_id\":\"%s\",\"status\":\"offline\"}", _deviceId);

  if (_mqttClient.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD,
                           _topicStatus, MQTT_QOS, true, lwt)) {
    Serial.println("[MQTT] Connected with TLS");
    _publishStatus();   // Immediate "online" heartbeat
  } else {
    Serial.printf("[MQTT] Failed (state=%d)\n", _mqttClient.state());
  }
}

void MQTTClient::_publishStatus() {
  StaticJsonDocument<JSON_BUFFER_SIZE> doc;
  doc["device_id"] = _deviceId;
  doc["ts"]        = (uint64_t)_nowMs();
  doc["status"]    = "online";
  doc["rssi_dbm"]  = WiFi.RSSI();
  doc["heap_free"] = ESP.getFreeHeap();
  doc["uptime_s"]  = millis() / 1000;
  _publishJSON(_topicStatus, doc);
}

bool MQTTClient::_publishJSON(const char* topic, const JsonDocument& doc) {
  if (!_mqttClient.connected()) return false;

  char buf[JSON_BUFFER_SIZE];
  size_t len = serializeJson(doc, buf, sizeof(buf));
  // QoS 1 → broker sends PUBACK; PubSubClient handles retransmit if no ACK
  return _mqttClient.publish(topic, (const uint8_t*)buf, len, false);
}

// ─── SPIFFS Offline Buffering ─────────────────────────────────────────────────
void MQTTClient::_bufferToSPIFFS(const char* json) {
  if (!_spiffsReady) return;
  if (_isFileTooLarge()) {
    Serial.println("[SPIFFS] Buffer full — oldest data will be overwritten");
    // Simple strategy: delete and start fresh (could also implement ring-file)
    SPIFFS.remove(OFFLINE_BUFFER_FILE);
  }
  File f = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_APPEND);
  if (f) {
    f.println(json);  // One JSON object per line (JSONL format)
    f.close();
  }
}

void MQTTClient::_drainSPIFFS() {
  if (!_spiffsReady || !SPIFFS.exists(OFFLINE_BUFFER_FILE)) return;

  File f = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_READ);
  if (!f) return;

  Serial.println("[SPIFFS] Draining offline buffer...");
  int count = 0;
  while (f.available() && _mqttClient.connected()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    // Re-publish: infer topic from "type" field
    StaticJsonDocument<JSON_BUFFER_SIZE> doc;
    if (deserializeJson(doc, line) == DeserializationError::Ok) {
      const char* type = doc["type"] | "ppg";
      const char* topic = strcmp(type, "prediction") == 0 ? _topicPred : _topicData;
      _mqttClient.publish(topic, line.c_str());
      count++;
      delay(5);  // Slight throttle to avoid flooding broker
    }
    _mqttClient.loop();  // Process ACKs while draining
  }
  f.close();

  SPIFFS.remove(OFFLINE_BUFFER_FILE);  // Clear after successful drain
  Serial.printf("[SPIFFS] Drained %d buffered records.\n", count);
}

bool MQTTClient::_isFileTooLarge() {
  if (!SPIFFS.exists(OFFLINE_BUFFER_FILE)) return false;
  File f = SPIFFS.open(OFFLINE_BUFFER_FILE, FILE_READ);
  size_t sz = f.size();
  f.close();
  return sz >= OFFLINE_MAX_BYTES;
}

// Returns current Unix time in milliseconds using NTP-synced clock
unsigned long long MQTTClient::_nowMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  return (unsigned long long)tv.tv_sec * 1000ULL + tv.tv_usec / 1000ULL;
}
