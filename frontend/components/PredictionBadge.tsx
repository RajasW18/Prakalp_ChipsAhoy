'use client';

import { clsx } from 'clsx';

interface PredictionBadgeProps {
  classLabel  : string;
  confidence  : number;     // 0.0–1.0
  size       ?: 'sm' | 'md' | 'lg';
  showBar    ?: boolean;
}

function getColor(label: string) {
  const l = label.toLowerCase();
  if (l === 'normal')             return { dot: '#10b981', badge: 'badge-normal'  };
  if (l === 'tachycardia')        return { dot: '#f59e0b', badge: 'badge-monitor' };
  if (l === 'bradycardia')        return { dot: '#f59e0b', badge: 'badge-monitor' };
  return                                 { dot: '#ef4444', badge: 'badge-urgent'  };  // AFib, Arrhythmia
}

export default function PredictionBadge({
  classLabel, confidence, size = 'md', showBar = false,
}: PredictionBadgeProps) {
  const { dot, badge } = getColor(classLabel);
  const pct            = Math.round(confidence * 100);

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }[size];

  return (
    <div className="flex flex-col gap-2">
      <div className={clsx('inline-flex items-center gap-2 rounded-full font-semibold border', sizeClass, badge)}>
        {/* Pulsing dot */}
        <span className="relative flex-shrink-0">
          <span className="w-2 h-2 rounded-full block" style={{ background: dot }} />
          {classLabel.toLowerCase() !== 'normal' && (
            <span className="absolute inset-0 w-2 h-2 rounded-full animate-ping-slow opacity-60"
                  style={{ background: dot }} />
          )}
        </span>
        {classLabel}
        <span className="opacity-75">·</span>
        <span className="font-mono">{pct}%</span>
      </div>

      {showBar && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out"
               style={{
                 width     : `${pct}%`,
                 background: dot,
                 boxShadow : `0 0 6px ${dot}`,
               }} />
        </div>
      )}
    </div>
  );
}
