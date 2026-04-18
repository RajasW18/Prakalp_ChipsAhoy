'use strict';

const WebSocket = require('ws');
const jwt       = require('jsonwebtoken');
const url       = require('url');

// ─── Client Registry ──────────────────────────────────────────────────────────
// Map: deviceMac → Set<WebSocket>
// Each client subscribes to one or more device MAC addresses.
const rooms = new Map();

// ─── Init ──────────────────────────────────────────────────────────────────────
function initWebSocket(httpServer) {
  const wss = new WebSocket.Server({
    server    : httpServer,
    path      : '/ws',
    maxPayload: 64 * 1024,   // 64 KB max message size
  });

  wss.on('connection', (ws, req) => {
    // ── Authentication ─────────────────────────────────────────────────────
    // Clients send JWT as query param: /ws?token=<JWT>&device=<MAC>
    const query      = url.parse(req.url, true).query;
    const token      = query.token;
    const deviceMac  = query.device;   // MAC to subscribe to

    if (!token) {
      ws.close(4001, 'Missing auth token');
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4003, 'Invalid or expired token');
      return;
    }

    // ── Subscribe to device room ───────────────────────────────────────────
    const room = deviceMac || '_all';
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);

    ws._userId    = decoded.sub;
    ws._deviceMac = room;
    ws._alive     = true;

    console.log(`[WS] Client ${decoded.email} connected → room "${room}"`);

    // ── Heartbeat pong ─────────────────────────────────────────────────────
    ws.on('pong', () => { ws._alive = true; });

    // ── Client messages (subscribe/unsubscribe commands) ───────────────────
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'subscribe' && msg.device) {
          // Move client to a different device room
          leaveRoom(ws, room);
          if (!rooms.has(msg.device)) rooms.set(msg.device, new Set());
          rooms.get(msg.device).add(ws);
          ws._deviceMac = msg.device;
          ws.send(JSON.stringify({ type: 'subscribed', device: msg.device }));
        }
      } catch {
        // Non-JSON client messages are ignored
      }
    });

    // ── Cleanup on close ───────────────────────────────────────────────────
    ws.on('close', () => {
      leaveRoom(ws, ws._deviceMac);
      console.log(`[WS] Client ${decoded.email} disconnected`);
    });

    ws.on('error', (err) => console.error('[WS] Client error:', err.message));

    // ── Welcome frame ──────────────────────────────────────────────────────
    ws.send(JSON.stringify({
      type     : 'connected',
      device   : room,
      userId   : decoded.sub,
      serverTs : Date.now(),
    }));
  });

  // ── Ping all clients every 30 s to detect stale connections ────────────────
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws._alive) {
        leaveRoom(ws, ws._deviceMac);
        ws.terminate();
        return;
      }
      ws._alive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(pingInterval));

  return wss;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────
// Send a JSON message to all clients subscribed to `deviceMac`.
// Also broadcasts to the "_all" room (clients watching all devices).
function broadcast(deviceMac, payload) {
  const msg = JSON.stringify(payload);

  const sendToRoom = (room) => {
    const clients = rooms.get(room);
    if (!clients) return;
    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  };

  sendToRoom(deviceMac);
  sendToRoom('_all');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function leaveRoom(ws, room) {
  const clients = rooms.get(room);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) rooms.delete(room);
  }
}

module.exports = { initWebSocket, broadcast };
