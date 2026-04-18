#pragma once
#include <Arduino.h>
#include "config.h"

// ═══════════════════════════════════════════════════════════════════════════════
//  UART Parser — State Machine
//  Handles two packet types from the FPGA:
//    • 0xFF  →  PPG data      [0xFF][D1][D2]
//    • 0xFE  →  ML prediction [0xFE][CLASS][CONF]
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Packet Type Tag ──────────────────────────────────────────────────────────
enum class PacketType : uint8_t {
  NONE,           // Parser has no result yet
  PPG_DATA,       // Valid PPG data packet
  ML_PREDICTION,  // Valid ML prediction packet
  FRAMING_ERROR   // Packet rejected (bad nibble / timeout / out-of-range class)
};

// ─── PPG Data Packet ──────────────────────────────────────────────────────────
struct PPGPacket {
  uint16_t raw_12bit;   // 0–4095 raw ADC count
  float    voltage_v;   // 0.0000–1.0000 V  (raw / 4095.0)
  uint32_t seq;         // Monotonically increasing sequence number
};

// ─── ML Prediction Packet ─────────────────────────────────────────────────────
struct PredPacket {
  uint8_t     class_id;        // 0–(PRED_CLASS_COUNT-1)
  uint8_t     confidence_raw;  // 0–255 raw FPGA output
  float       confidence;      // 0.0–1.0  =  confidence_raw / 255.0
  const char* class_label;     // Pointer to string in PRED_CLASS_LABELS[]
};

// ─── Parse Result ─────────────────────────────────────────────────────────────
struct ParseResult {
  PacketType type;    // What we found
  PPGPacket  ppg;    // Valid only when type == PPG_DATA
  PredPacket pred;   // Valid only when type == ML_PREDICTION
};

// ─── Parser Class ─────────────────────────────────────────────────────────────
class UARTParser {
public:
  UARTParser();

  // Call once in setup() after Serial2.begin()
  void begin(HardwareSerial& serial);

  // Call every loop() iteration.
  // Returns true and populates `result` when a complete packet is decoded.
  bool update(ParseResult& result);

  // Diagnostic counters (for MQTT error topic)
  uint32_t getFramingErrors() const { return _framing_errors; }
  uint32_t getTotalPackets()  const { return _total_packets;  }
  uint32_t getSeqCounter()    const { return _seq_counter;    }

private:
  // ── Internal state machine states ──────────────────────────────────────────
  enum class State : uint8_t {
    WAIT_HEADER,      // Scanning for 0xFF or 0xFE
    WAIT_D1,          // PPG: waiting for first data byte
    WAIT_D2,          // PPG: waiting for second data byte (with nibble validation)
    WAIT_PRED_CLASS,  // Prediction: waiting for class byte
    WAIT_PRED_CONF    // Prediction: waiting for confidence byte
  };

  HardwareSerial* _serial;
  State           _state;
  uint8_t         _byte0;          // Holds D1 (PPG) or class_id (Pred) between states
  unsigned long   _byte_deadline;  // Absolute millis() deadline for next byte
  uint32_t        _seq_counter;
  uint32_t        _framing_errors;
  uint32_t        _total_packets;

  void _reset(); // Return to WAIT_HEADER
};
