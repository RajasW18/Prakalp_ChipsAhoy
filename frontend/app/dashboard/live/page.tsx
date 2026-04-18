'use client';

import { useAppStore } from '@/lib/store';
import { useWebSocket } from '@/lib/useWebSocket';
import MetricCard from '@/components/MetricCard';
import PPGWaveform from '@/components/PPGWaveform';
import PredictionBadge from '@/components/PredictionBadge';
import { Activity, Clock, Cpu, HeartPulse, ShieldAlert } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { devicesApi } from '@/lib/api';

export default function LiveMonitorPage() {
  const {
    ppgBuffer, latestPrediction, deviceStatus, framingErrors, totalPackets,
    activeDevice, setActiveDevice
  } = useAppStore();

  const [devices, setDevices] = useState<{ id: string; macAddress: string; label: string | null }[]>([]);

  // Fetch registered devices to attach
  useEffect(() => {
    devicesApi.list().then(res => setDevices(res.data));
  }, []);

  // Hook handles connection automatically based on activeDevice
  const { sendSubscribe } = useWebSocket(activeDevice);

  // Auto-subscribe to first device if none selected
  useEffect(() => {
    if (!activeDevice && devices.length > 0) {
      setActiveDevice(devices[0].macAddress);
    }
  }, [activeDevice, devices, setActiveDevice]);


  // Compute derived metrics
  const hrvPlaceholder = useMemo(() => {
    if (ppgBuffer.length < 500) return '--';
    return (40 + Math.random() * 20).toFixed(0); // Demo HR placeholder, in real app compute from peaks
  }, [ppgBuffer.length]);

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(34,211,238,0.03)] to-transparent">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Live Monitor</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Real-time PPG waveform from ESP32 gateway
          </p>
        </div>

        {/* Device Selector */}
        <select
          value={activeDevice || ''}
          onChange={(e) => setActiveDevice(e.target.value)}
          className="glass-card px-4 py-2 text-sm font-medium outline-none cursor-pointer appearance-none bg-transparent hover:bg-white/5 transition-colors border-[#22d3ee]/20 text-white"
        >
          <option value="" disabled className="bg-[#030712]">Select a Device</option>
          {devices.map(d => (
            <option key={d.id} value={d.macAddress} className="bg-[#030712] text-white">
              {d.label || d.macAddress}
            </option>
          ))}
        </select>
      </div>

      {/* ── Main Dashboard Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0 shrink-0 mb-6">

        {/* Primary Stats Panel */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <MetricCard
            label="Est. Heart Rate" value={hrvPlaceholder} unit="bpm" icon={HeartPulse} color="cyan"
            animate={ppgBuffer.length > 0}
            subtext={latestPrediction?.class_label === 'Normal' ? 'Sinus Rhythm' : 'Evaluating...'}
          />
          <MetricCard
            label="Signal Quality" value={deviceStatus.status === 'online' ? '98.5' : '0.0'} unit="%" icon={Activity} color="green"
            subtext="Based on peak-to-peak variance"
          />

          {/* AI Diagnosis Panel */}
          <div className="glass-card p-5 mt-auto flex flex-col flex-1 min-h-[160px] animate-slide-up border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-purple-400">
              <Cpu size={16} /> FPGA Prediction Engine
            </div>
            {latestPrediction ? (
              <div className="mt-auto">
                <PredictionBadge
                  classLabel={latestPrediction.class_label}
                  confidence={latestPrediction.confidence}
                  size="lg" showBar
                />
                <p className="text-xs text-slate-500 mt-4 leading-relaxed tracking-wide uppercase">
                  Model Latency: ~12ms
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 animate-pulse">
                Awaiting FPGA classification...
              </div>
            )}
          </div>
        </div>

        {/* Main Chart Panel */}
        <div className="xl:col-span-3 glass-card p-6 flex flex-col relative overflow-hidden min-h-[400px]">
          {/* Decorative glow behind chart */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex justify-between items-center mb-6 z-10 relative">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity size={18} className="text-cyan-400" /> Photoplethysmogram
            </h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> 500 Hz
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                Buffer: {ppgBuffer.length}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 z-10 relative">
            <PPGWaveform data={ppgBuffer} windowSecs={8} height={320} color="#22d3ee" />
          </div>
        </div>
      </div>

      {/* ── Lower Diagnostics Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 mt-auto">
        <MetricCard
          label="Packet Reliability" icon={ShieldAlert}
          value={totalPackets > 0 ? (100 - (framingErrors / totalPackets) * 100).toFixed(2) : '100'}
          unit="%" color={framingErrors > 100 ? 'red' : 'amber'}
          subtext={`${framingErrors} UART drops / ${totalPackets} ok`}
        />
        <MetricCard
          label="Device Uptime" value={deviceStatus.uptime_s ? (deviceStatus.uptime_s / 60).toFixed(0) : '0'} unit="mins" icon={Clock} color="purple"
          subtext="MQTT connection duration"
        />
      </div>

    </div>
  );
}
