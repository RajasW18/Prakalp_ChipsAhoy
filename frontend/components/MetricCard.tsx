'use client';

import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label    : string;
  value    : string | number;
  unit    ?: string;
  icon     : LucideIcon;
  color   ?: 'cyan' | 'green' | 'purple' | 'amber' | 'red';
  trend   ?: 'up' | 'down' | 'neutral';
  subtext ?: string;
  animate ?: boolean;
}

const COLOR_MAP = {
  cyan  : { text: '#22d3ee', bg: 'rgba(34,211,238,0.1)',   border: 'rgba(34,211,238,0.2)'  },
  green : { text: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)'  },
  purple: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.2)'  },
  amber : { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)'  },
  red   : { text: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)'   },
};

export default function MetricCard({
  label, value, unit, icon: Icon,
  color = 'cyan', trend, subtext, animate = false,
}: MetricCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div className={clsx(
      'glass-card p-4 flex flex-col gap-3 animate-slide-up',
      animate && 'animate-glow-pulse'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="metric-label">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon size={17} style={{ color: c.text }} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-bold tracking-tight"
              style={{ color: c.text }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{subtext}</p>
      )}
    </div>
  );
}
