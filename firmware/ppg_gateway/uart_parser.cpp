#include "uart_parser.h"

// ═══════════════════════════════════════════════════════════════════════════════
//  UARTParser — Implementation
// ═══════════════════════════════════════════════════════════════════════════════

UARTParser::UARTParser()
  : _serial(nullptr),
    _state(State::WAIT_HEADER),
    _byte0(0),
    _byte_deadline(0),
    _seq_counter(0),
    _framing_errors(0),
    _total_packets(0)
{}

void UARTParser::begin(HardwareSerial& serial) {
  _serial = &serial;
}

void UARTParser::_reset() {
  _state = State::WAIT_HEADER;
}

// ─────────────────────────────────────────────────────────────────────────────
//  update() — call every loop() tick
//  Reads all available bytes from the UART RX buffer and runs the state machine.
//  Returns true (exactly once per complete packet) and fills `result`.
// ─────────────────────────────────────────────────────────────────────────────
bool UARTParser::update(ParseResult& result) {
  if (!_serial) return false;

  result.type = PacketType::NONE;

  // ── Timeout check BEFORE reading: if we've been waiting too long, re-sync ──
  if (_state != State::WAIT_HEADER && millis() > _byte_deadline) {
    _framing_errors++;
    _reset();
    result.type = PacketType::FRAMING_ERROR;
    return true;  // Let caller log the error
  }

  if (!_serial->available()) return false;

  // Process one byte at a time so we don't starve the loop
  uint8_t b = (uint8_t)_serial->read();
  unsigned long now = millis();

  switch (_state) {

    // ── WAIT_HEADER ────────────────────────────────────────────────────────
    case State::WAIT_HEADER:
      if (b == PKT_HEADER_PPG) {
        _byte_deadline = now + PKT_TIMEOUT_MS;
        _state = State::WAIT_D1;
      } else if (b == PKT_HEADER_PRED) {
        _byte_deadline = now + PKT_TIMEOUT_MS;
        _state = State::WAIT_PRED_CLASS;
      }
      // Any other byte → silently skip (re-sync in progress)
      break;

    // ── PPG: WAIT_D1 ───────────────────────────────────────────────────────
    case State::WAIT_D1:
      _byte0         = b;
      _byte_deadline = now + PKT_TIMEOUT_MS;
      _state         = State::WAIT_D2;
      break;

    // ── PPG: WAIT_D2 ───────────────────────────────────────────────────────
    case State::WAIT_D2: {
      // Validate: lower nibble of D2 MUST be 0000 (FPGA guarantees this)
      if ((b & 0x0F) != 0x00) {
        _framing_errors++;
        _reset();
        result.type = PacketType::FRAMING_ERROR;
        return true;
      }

      // Extract 12-bit value: left-aligned, MSB-first
      // D1 holds the upper 8 bits; upper nibble of D2 holds bits [3:0]
      uint16_t raw = ((uint16_t)_byte0 << 4) | (b >> 4);

      result.type          = PacketType::PPG_DATA;
      result.ppg.raw_12bit = raw;
      result.ppg.voltage_v = (raw / 4095.0f);   // 0–1 V (no scale factor needed)
      result.ppg.seq       = _seq_counter++;
      _total_packets++;
      _reset();
      return true;
    }

    // ── PRED: WAIT_PRED_CLASS ───────────────────────────────────────────────
    case State::WAIT_PRED_CLASS:
      _byte0         = b;   // Store class_id
      _byte_deadline = now + PKT_TIMEOUT_MS;
      _state         = State::WAIT_PRED_CONF;
      break;

    // ── PRED: WAIT_PRED_CONF ───────────────────────────────────────────────
    case State::WAIT_PRED_CONF: {
      uint8_t class_id = _byte0;
      uint8_t conf_raw = b;

      // Validate class_id is within known range
      if (class_id >= PRED_CLASS_COUNT) {
        _framing_errors++;
        _reset();
        result.type = PacketType::FRAMING_ERROR;
        return true;
      }

      result.type                = PacketType::ML_PREDICTION;
      result.pred.class_id       = class_id;
      result.pred.confidence_raw = conf_raw;
      result.pred.confidence     = conf_raw / 255.0f;
      result.pred.class_label    = PRED_CLASS_LABELS[class_id];
      _total_packets++;
      _reset();
      return true;
    }
  }

  return false;  // No complete packet yet
}
