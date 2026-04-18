import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id           : string;
  email        : string;
  name         : string;
  avatarUrl    ?: string;
  phoneNumber  ?: string;
  role         : 'PATIENT' | 'DOCTOR' | 'ADMIN';
  totpEnabled  : boolean;
  age          ?: number;
  gender       ?: string;
  weight       ?: number;
  height       ?: number;
  createdAt    ?: string;
}

export interface PPGPoint {
  ts        : number;   // Unix ms
  raw       : number;   // 0–4095
  voltage_v : number;   // 0.0–1.0
  seq       : number;
}

export interface Prediction {
  ts           : number;
  class_id     : number;
  class_label  : string;
  confidence   : number;
  sessionId    : string;
}

export interface DeviceStatus {
  status  : 'online' | 'offline';
  rssi_dbm?: number;
  heap_free?: number;
  uptime_s ?: number;
  lastTs   ?: number;
}

// ── Sliding window config ─────────────────────────────────────────────────────
const WINDOW_POINTS  = 3000;   // Keep last 3000 points in memory (~10 s at 300 Hz)
const MAX_PREDICTIONS = 50;

// ── Store ─────────────────────────────────────────────────────────────────────
interface AppState {
  // Auth
  user           : User | null;
  setUser        : (u: User | null) => void;

  // JWT token (for WS auth)
  accessToken    : string | null;
  setAccessToken : (t: string | null) => void;

  // Active device being monitored
  activeDevice   : string | null;   // MAC address
  setActiveDevice: (mac: string | null) => void;

  // Live PPG buffer (circular sliding window)
  ppgBuffer      : PPGPoint[];
  appendPPG      : (point: PPGPoint) => void;
  clearPPGBuffer : () => void;

  // Latest prediction
  predictions    : Prediction[];
  latestPrediction: Prediction | null;
  appendPrediction: (pred: Prediction) => void;

  // Device connectivity
  deviceStatus   : DeviceStatus;
  setDeviceStatus: (s: Partial<DeviceStatus>) => void;

  // Connection state
  wsConnected    : boolean;
  setWsConnected : (v: boolean) => void;

  // Framing error stats
  framingErrors  : number;
  totalPackets   : number;
  setErrorStats  : (fe: number, tp: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user          : null,
  setUser       : (user) => set({ user }),

  accessToken   : null,
  setAccessToken: (accessToken) => set({ accessToken }),

  activeDevice  : null,
  setActiveDevice: (activeDevice) => set({ activeDevice }),

  ppgBuffer     : [],
  appendPPG     : (point) =>
    set((s) => ({
      ppgBuffer: s.ppgBuffer.length >= WINDOW_POINTS
        ? [...s.ppgBuffer.slice(1), point]
        : [...s.ppgBuffer, point],
    })),
  clearPPGBuffer: () => set({ ppgBuffer: [] }),

  predictions   : [],
  latestPrediction: null,
  appendPrediction: (pred) =>
    set((s) => ({
      latestPrediction: pred,
      predictions: s.predictions.length >= MAX_PREDICTIONS
        ? [...s.predictions.slice(1), pred]
        : [...s.predictions, pred],
    })),

  deviceStatus  : { status: 'offline' },
  setDeviceStatus: (s) =>
    set((state) => ({ deviceStatus: { ...state.deviceStatus, ...s } })),

  wsConnected   : false,
  setWsConnected: (wsConnected) => set({ wsConnected }),

  framingErrors : 0,
  totalPackets  : 0,
  setErrorStats : (framingErrors, totalPackets) => set({ framingErrors, totalPackets }),
}));
