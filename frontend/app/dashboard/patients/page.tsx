'use strict';
'use client';

import { useEffect, useState } from 'react';
import { patientsApi } from '@/lib/api';
import { Users, Search, UserPlus, Clock } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    patientsApi.list()
      .then(res => setPatients(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-8 pb-12 flex flex-col min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(16,185,129,0.03)] to-transparent">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Users size={24} className="text-emerald-400" />
            Patient Directory
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
             Manage registered patients and assigned hardware.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 py-2 px-4 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-gradient-to-r from-emerald-500 to-teal-400" disabled>
          <UserPlus size={16} /> New Patient
        </button>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex gap-4 bg-white/[0.01]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 w-full skeleton" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
            <Users size={32} className="mb-4 opacity-50" />
            <p>No patients registered.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => (
              <div key={p.id} className="glass-card p-4 hover:border-emerald-500/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4 mb-4">
                  {p.avatarUrl ? (
                     <Image src={p.avatarUrl} alt={p.name} width={48} height={48} className="rounded-full bg-black/20 shrink-0 border border-white/10 group-hover:border-emerald-500/50 transition-colors" />
                  ) : (
                    <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-bold bg-gradient-to-br from-emerald-400 to-teal-500 text-black">
                      {p.name[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-white font-medium truncate">{p.name}</h3>
                    <p className="text-sm text-slate-400 truncate">{p.email}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 text-xs text-slate-500 flex flex-col gap-1.5">
                   <div className="flex items-center gap-2">
                     <Clock size={12} />
                     Joined {new Date(p.createdAt).toLocaleDateString()}
                   </div>
                   <div className="flex items-center gap-2 font-mono">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                     {p.devices.length} Assigned {p.devices.length === 1 ? 'Device' : 'Devices'}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
