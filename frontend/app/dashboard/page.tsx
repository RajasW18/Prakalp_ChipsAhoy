'use strict';
'use client';

import { useAppStore } from '@/lib/store';
import { Activity, Clock, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const { user } = useAppStore();
  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'ADMIN';

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(139,92,246,0.03)] to-transparent">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome, {user?.name || 'User'}</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isDoctor ? 'Doctor Portal Overview' : 'Patient Health Summary'}
        </p>

        {!isDoctor && (user?.age || user?.weight || user?.height) && (
          <div className="flex gap-4 mt-4">
            {user.age && (
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-slate-500 uppercase tracking-tighter mr-2">Age</span>
                <span className="text-white font-medium">{user.age} Yrs</span>
              </div>
            )}
            {user.weight && (
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-slate-500 uppercase tracking-tighter mr-2">Weight</span>
                <span className="text-white font-medium">{user.weight} kg</span>
              </div>
            )}
            {user.height && (
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <span className="text-slate-500 uppercase tracking-tighter mr-2">Height</span>
                <span className="text-white font-medium">{user.height} cm</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-cyan-500/10 border border-cyan-500/20">
              <Activity size={20} className="text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Live Monitor</h2>
            <p className="text-sm text-slate-400 mb-6">Connect to an active ESP32 gateway to stream real-time PPG analysis.</p>
          </div>
          <Link href="/dashboard/live" className="btn-primary w-fit text-sm py-2 px-4 flex items-center gap-2">
            Start Live Session
          </Link>
        </div>

        {/* Recent Sessions Link */}
        <div className="glass-card p-6 flex flex-col justify-between group hover:glass-card-active transition-all cursor-pointer">
          <Link href="/dashboard/sessions" className="flex flex-col h-full">
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-purple-500/10 border border-purple-500/20 group-hover:scale-105 transition-transform">
                <Clock size={20} className="text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Session History</h2>
              <p className="text-sm text-slate-400">Review past recordings and AI predictions.</p>
            </div>
          </Link>
        </div>

        {/* Doctor Action */}
        {isDoctor && (
           <div className="glass-card p-6 flex flex-col justify-between group hover:glass-card-active transition-all cursor-pointer border-amber-500/20">
             <Link href="/dashboard/consult" className="flex flex-col h-full">
               <div>
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-amber-500/10 border border-amber-500/20 group-hover:scale-105 transition-transform">
                   <Stethoscope size={20} className="text-amber-400" />
                 </div>
                 <h2 className="text-lg font-semibold text-white mb-2">Consultations</h2>
                 <p className="text-sm text-slate-400">Add medical findings to patient sessions.</p>
               </div>
             </Link>
           </div>
        )}
      </div>

      {/* Security Status */}
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 bg-white/[0.02]">
        <div className="p-3 bg-emerald-500/10 rounded-lg shrink-0">
          <ShieldCheck size={24} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Secure Connection Active</h3>
          <p className="text-xs text-slate-400 mt-1">End-to-End TLS 1.3 Encryption Enabled. HIPAA-ready transport protocol.</p>
        </div>
      </div>
    </div>
  );
}
