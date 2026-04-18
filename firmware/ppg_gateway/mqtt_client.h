#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <time.h>
#include "config.h"
#include "uart_parser.h"

// ═══════════════════════════════════════════════════════════════════════════════
//  MQTTClient — Manages TLS connection to HiveMQ Cloud,
//               JSON payload construction, QoS-1 publishing,
//               and SPIFFS offline buffering when Wi-Fi is down.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── HiveMQ Cloud Root CA Certificate ─────────────────────────────────────────
// HiveMQ Cloud uses Let's Encrypt (ISRG Root X1). This cert is embedded so the
// ESP32 can verify the broker's identity (prevents MITM attacks).
// Expiry: 2035-06-04 — update if your cluster shows cert errors after that date.
static const char HIVEMQ_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoBggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6
UA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+
sWT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3
qyHB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3
x+UCB5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0
SHzUvKBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0
ahmbWnOlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3
SzynTnjh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBf
EbwrbwqHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef
4Y53CIrU7m2Ys6ht0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAP
BgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjAN
BgkqhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V
9lZLubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPb
k6ZGQ3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRc
Oj/KKNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzkt
HCgKQ5ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzq
vHu7UrTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRl
N8NwdCjNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+
ZAJzVcoyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqK
OJ2qxq4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9
d11TPAmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEz
wxA57demyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iIt
reGCc=
-----END CERTIFICATE-----
)EOF";

// ─────────────────────────────────────────────────────────────────────────────

class MQTTClient {
public:
  MQTTClient();
  void begin();                 // Call in setup() — connects Wi-Fi, NTP, MQTT
  void loop();                  // Call every loop() — maintain connection
  bool isConnected();

  // Publish a validated PPG sample (buffers to SPIFFS if offline)
  void publishPPG(const PPGPacket& pkt);

  // Publish an ML prediction (buffers to SPIFFS if offline)
  void publishPrediction(const PredPacket& pkt);

  // Publish a framing error counter update
  void publishError(uint32_t framing_errors, uint32_t total_packets);

private:
  WiFiClientSecure _wifiClient;
  PubSubClient     _mqttClient;

  char  _deviceId[18];          // MAC address string "AA:BB:CC:DD:EE:FF"
  char  _topicData[64];
  char  _topicPred[64];
  char  _topicStatus[64];
  char  _topicError[64];

  unsigned long _lastStatusMs;  // Last heartbeat publish timestamp
  unsigned long _lastReconnMs;  // Last reconnect attempt timestamp
  bool  _spiffsReady;

  void  _connectWifi();
  void  _syncNTP();
  void  _connectMQTT();
  void  _publishStatus();
  bool  _publishJSON(const char* topic, const JsonDocument& doc);

  // Offline SPIFFS buffer
  void  _bufferToSPIFFS(const char* json);
  void  _drainSPIFFS();
  bool  _isFileTooLarge();

  // Helpers
  unsigned long long _nowMs();  // NTP-derived Unix milliseconds
};
