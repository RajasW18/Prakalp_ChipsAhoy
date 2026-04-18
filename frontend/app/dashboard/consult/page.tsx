'use strict';
'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { consultApi, sessionsApi } from '@/lib/api';
import { Stethoscope, FileText, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ConsultationsPage() {
  const { user } = useAppStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  // Doctors need to see sessions that need consultation. Simple approach: showing all sessions for now.
  useEffect(() => {
    sessionsApi.list()
      .then(res => setSessions(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(245,158,11,0.03)] to-transparent">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Stethoscope size={24} className="text-amber-400" />
          Clinical Consultations
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
           Review patient sessions and submit medical findings.
        </p>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full skeleton" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
            <FileText size={32} className="mb-4 opacity-50" />
            <p>No recent sessions available for review.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="data-table">
              <thead className="sticky top-0 bg-[#030712]/95 backdrop-blur z-10 font-medium">
                <tr>
                  <th className="pl-6">Patient</th>
                  <th>Session Date</th>
                  <th>AI Predictions</th>
                  <th>Consult Status</th>
                  <th className="pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {sessions.map((s) => {
                  const urgentCount = s._count?.predictions || 0; // Simplified
                  const hasConsult = s._count?.consultations > 0;

                  return (
                    <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0 relative">
                      <td className="pl-6 py-4">
                        <div className="font-medium text-white">{s.patient.name}</div>
                        <div className="text-xs text-slate-500">{s.patient.email}</div>
                      </td>
                      <td className="py-4 text-sm">
                         {formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}
                      </td>
                      <td className="py-4">
                        {urgentCount > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
                             <AlertTriangle size={12} /> {urgentCount} events detected
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-4">
                         {hasConsult ? (
                           <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Reviewed</span>
                         ) : (
                           <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800 text-slate-400 border border-white/10">Pending Review</span>
                         )}
                      </td>
                      <td className="pr-6 py-4 text-right">
                        <button className="btn-ghost px-3 py-1.5 inline-flex items-center gap-1 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-colors">
                          Evaluate
                          <ChevronRight size={14} />
                        </button>
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
