'use strict';
'use client';

import { useEffect, useState } from 'react';
import { sessionsApi } from '@/lib/api';
import { format } from 'date-fns';
import { Activity, Calendar, Clock, ChevronRight, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import Link from 'next/link';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    sessionsApi.list()
      .then(res => setSessions(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(34,211,238,0.03)] to-transparent">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity size={24} className="text-cyan-400" />
          Monitoring Sessions
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Review historical PPG recordings and AI predictions.
        </p>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full skeleton" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
            <Activity size={32} className="mb-4 opacity-50" />
            <p>No recording sessions found.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0 bg-[#030712]/95 backdrop-blur z-10 font-medium">
                <tr>
                  <th className="w-12 pl-6">Status</th>
                  <th>Patient</th>
                  <th>Started At</th>
                  <th>Duration</th>
                  <th>Device</th>
                  <th>Data Points</th>
                  <th className="pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {sessions.map((s) => {
                  const isActive = s.status === 'ACTIVE';
                  const durMs = s.endedAt ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime() : Date.now() - new Date(s.startedAt).getTime();
                  const durMin = Math.max(1, Math.round(durMs / 60000));

                  return (
                    <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0 relative">
                      <td className="pl-6 py-4">
                        <div title={s.status} className="w-8 h-8 rounded flex items-center justify-center bg-black/20 border border-white/5">
                          {isActive ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> :
                           s.status === 'ERROR' ? <AlertTriangle size={16} className="text-red-400" /> :
                           <CheckCircle2 size={16} className="text-slate-500" />}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                            <User size={14} />
                          </div>
                          <div>
                            <div className="font-medium text-white">{s.patient.name}</div>
                            <div className="text-xs text-slate-500">{s.patient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar size={14} className="text-slate-500" />
                          {format(new Date(s.startedAt), 'MMM dd, HH:mm')}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock size={14} className="text-slate-500" />
                          {isActive ? 'Ongoing' : `${durMin} min`}
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-400 font-mono">
                        {s.device.label || s.device.macAddress.slice(-8)}
                      </td>
                      <td className="py-4 text-sm">
                        <span className="font-mono text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                          {s._count.ppgReadings.toLocaleString()}
                        </span>
                      </td>
                      <td className="pr-6 py-4 text-right">
                        <Link href={`/dashboard/sessions/${s.id}`} className="btn-ghost px-3 py-1.5 inline-flex items-center gap-1 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                          View
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
