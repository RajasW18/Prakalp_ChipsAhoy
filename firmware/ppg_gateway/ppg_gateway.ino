// ═══════════════════════════════════════════════════════════════════════════════
//  PPG IoT Gateway — Main Sketch
//  Board  : ESP32 DevKit V1 (ESP32-WROOM-32)
//  Project: FPGA-Based PPG Waveform Analysis & Disease Prediction
//  Author : [Your Name]
//
//  Pin Connections:
//    FPGA TX  → ESP32 GPIO16 (RX2)   [UART2 RX — hardware UART]
//    ESP32 GND ← GND → FPGA GND      [MANDATORY shared ground]
//    GPIO17 (TX2) — wired but unused (simplex RX only)
//
//  Required Libraries (install via Arduino Library Manager):
//    • PubSubClient  by Nick O'Leary   (v2.8+)
//    • ArduinoJson   by Benoit Blanchon (v6.x)
//    SPIFFS, WiFi, WiFiClientSecure — bundled with ESP32 Arduino Core
//
//  Upload settings (Arduino IDE):
//    Board   : "ESP32 Dev Module"
//    Upload  : 921600 baud
//    CPU     : 240 MHz
//    Flash   : 4MB (Scheme: Default 4MB with spiffs)
// ═══════════════════════════════════════════════════════════════════════════════

#include "config.h"
#include "uart_parser.h"
#include "mqtt_client.h"

// ─── Global Instances ─────────────────────────────────────────────────────────
UARTParser  parser;
MQTTClient  mqtt;

// ─── Framing error reporting throttle ─────────────────────────────────────────
static uint32_t lastErrorReportMs = 0;
static uint32_t lastReportedErrors = 0;
constexpr uint32_t ERROR_REPORT_INTERVAL_MS = 30000;  // Report errors every 30 s

// ═══════════════════════════════════════════════════════════════════════════════
//  setup()
// ═══════════════════════════════════════════════════════════════════════════════
void setup() {
  // Debug serial (USB)
  Serial.begin(115200);
  while (!Serial) delay(10);
  Serial.println("\n\n========================================");
  Serial.println("  PPG IoT Gateway — ESP32 DevKit V1");
  Serial.printf ("  UART Baud: %d  |  Sampling: 500 Hz\n", UART_BAUD_RATE);
  Serial.println("========================================\n");

  // FPGA UART — Hardware UART2 on GPIO16 (RX) / GPIO17 (TX, unused)
  // NOTE: UART2 is used deliberately so USB Serial (UART0) stays free for debug.
  // Serial2.begin(UART_BAUD_RATE, SERIAL_8N1, FPGA_RX_PIN, FPGA_TX_PIN);
parser.begin(Serial);   // TESTING: read dummy data from USB instead of GPIO16

  Serial.printf("[UART] Listening on UART2 (GPIO%d) at %d baud\n",
                FPGA_RX_PIN, UART_BAUD_RATE);

  // MQTT + Wi-Fi + NTP + SPIFFS
  mqtt.begin();

  Serial.println("\n[READY] Gateway operational. Waiting for FPGA packets...\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  loop()
// ═══════════════════════════════════════════════════════════════════════════════
void loop() {
  // 1. Maintain MQTT connection (reconnect if dropped, drain SPIFFS on recovery)
  mqtt.loop();

  // 2. Parse incoming UART bytes from FPGA
  ParseResult result;
  if (parser.update(result)) {
    switch (result.type) {

      case PacketType::PPG_DATA:
        // Every so often print a sample to Serial for debug (not every packet,
        // that would saturate the USB serial and slow the loop)
        if (result.ppg.seq % 100 == 0) {
          Serial.printf("[PPG] seq=%-6u  raw=%-4u  voltage=%.4fV\n",
                        result.ppg.seq,
                        result.ppg.raw_12bit,
                        result.ppg.voltage_v);
        }
        mqtt.publishPPG(result.ppg);
        break;

      case PacketType::ML_PREDICTION:
        Serial.printf("[PRED] class=%u (%s)  conf=%.1f%%\n",
                      result.pred.class_id,
                      result.pred.class_label,
                      result.pred.confidence * 100.0f);
        mqtt.publishPrediction(result.pred);
        break;

      case PacketType::FRAMING_ERROR:
        // Don't print every error — that would flood Serial at 9600 baud
        // Instead, batch-report them every 30 seconds
        break;

      default:
        break;
    }
  }

  // 3. Periodic framing-error report (throttled to avoid MQTT spam)
  uint32_t now = millis();
  if (now - lastErrorReportMs >= ERROR_REPORT_INTERVAL_MS) {
    lastErrorReportMs = now;
    uint32_t currentErrors = parser.getFramingErrors();
    if (currentErrors != lastReportedErrors) {
      mqtt.publishError(currentErrors, parser.getTotalPackets());
      Serial.printf("[ERROR] Framing errors: %u / %u packets\n",
                    currentErrors, parser.getTotalPackets());
      lastReportedErrors = currentErrors;
    }
  }

  // 4. Yield to FreeRTOS (prevents WDT reset)
  yield();
}
