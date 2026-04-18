'use client';

import { useMemo, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { PPGPoint } from '@/lib/store';

interface PPGWaveformProps {
  data       : PPGPoint[];
  windowSecs ?: number;   // How many seconds to display (default 10)
  height     ?: number;
  showGrid   ?: boolean;
  color      ?: string;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function PPGTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PPGPoint;
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1" style={{ minWidth: 140 }}>
      <p style={{ color: 'var(--text-muted)' }}>{format(d.ts, 'HH:mm:ss.SSS')}</p>
      <p className="font-mono font-semibold" style={{ color: '#10b981' }}>
        {d.voltage_v.toFixed(4)} V
      </p>
      <p style={{ color: 'var(--text-faint)' }}>RAW: {d.raw} / seq: {d.seq}</p>
    </div>
  );
}

export default function PPGWaveform({
  data,
  windowSecs = 10,
  height     = 260,
  showGrid   = true,
  color      = '#10b981',
}: PPGWaveformProps) {

  // Slice to last `windowSecs` of data
  const displayed = useMemo(() => {
    if (!data.length) return [];
    const cutoff = data[data.length - 1].ts - windowSecs * 1000;
    const sliced = data.filter(p => p.ts >= cutoff);
    return sliced;
  }, [data, windowSecs]);

  const domain = useMemo(() => {
    if (!displayed.length) return [0, windowSecs * 1000];
    const last = displayed[displayed.length - 1].ts;
    return [last - windowSecs * 1000, last];
  }, [displayed, windowSecs]);

  const xTickFormatter = useCallback((ts: number) => format(ts, 'ss.S') + 's', []);

  if (!displayed.length) {
    return (
      <div className="flex items-center justify-center text-sm"
           style={{ height, color: 'var(--text-faint)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-0.5 bg-white/10 relative overflow-hidden rounded">
            <div className="absolute inset-y-0 w-8 animate-scan-line"
                 style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
          </div>
          <span>Waiting for signal from FPGA…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayed} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={domain}
            tickFormatter={xTickFormatter}
            tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />

          <YAxis
            domain={[0, 1]}
            tickCount={6}
            tickFormatter={(v) => v.toFixed(1)}
            tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={36}
            label={{ value: 'V', position: 'insideTopLeft', fill: 'var(--text-faint)', fontSize: 10, dy: -4 }}
          />

          <Tooltip
            content={<PPGTooltip />}
            isAnimationActive={false}
            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {/* 0.5V centre reference line */}
          <ReferenceLine
            y={0.5}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="6 4"
          />

          <Line
            type="monotone"
            dataKey="voltage_v"
            stroke={color}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
