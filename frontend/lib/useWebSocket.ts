'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
const RECONNECT_DELAY = 3000;

export function useWebSocket(deviceMac: string | null) {
  const wsRef      = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const shouldConnect = useRef(true);

  const {
    accessToken, appendPPG, appendPrediction, setDeviceStatus,
    setWsConnected, setErrorStats,
  } = useAppStore();

  const connect = useCallback(() => {
    if (!deviceMac || !accessToken || !shouldConnect.current) return;

    const url = `${WS_URL}?token=${encodeURIComponent(accessToken)}&device=${encodeURIComponent(deviceMac)}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to live stream');
      setWsConnected(true);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        switch (msg.type) {
          case 'ppg':
            appendPPG({
              ts       : msg.ts,
              raw      : msg.raw,
              voltage_v: msg.voltage_v,
              seq      : msg.seq,
            });
            break;

          case 'prediction':
            appendPrediction({
              ts          : msg.ts,
              class_id    : msg.class_id,
              class_label : msg.class_label,
              confidence  : msg.confidence,
              sessionId   : msg.sessionId,
            });
            break;

          case 'status':
            setDeviceStatus({
              status  : msg.status,
              rssi_dbm: msg.rssi_dbm,
              heap_free: msg.heap_free,
              uptime_s: msg.uptime_s,
              lastTs  : Date.now(),
            });
            break;

          case 'error':
            setErrorStats(msg.framing_errors, msg.total_packets);
            break;

          default:
            break;
        }
      } catch {
        // Malformed frame — ignore
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onclose = (evt) => {
      setWsConnected(false);
      wsRef.current = null;
      if (evt.code !== 4001 && evt.code !== 4003 && shouldConnect.current) {
        // Reconnect unless auth failure
        retryTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, [deviceMac, accessToken, appendPPG, appendPrediction, setDeviceStatus, setWsConnected, setErrorStats]);

  useEffect(() => {
    shouldConnect.current = true;
    connect();

    return () => {
      shouldConnect.current = false;
      clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const sendSubscribe = useCallback((mac: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', device: mac }));
    }
  }, []);

  return { sendSubscribe };
}
