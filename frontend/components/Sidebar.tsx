'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Activity, LayoutDashboard, Users, ClipboardList,
  MonitorDot, Cpu, LogOut, ChevronRight, UserCircle
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Overview'    },
  { href: '/dashboard/live',     icon: Activity,        label: 'Live Monitor' },
  { href: '/dashboard/sessions', icon: MonitorDot,      label: 'Sessions'    },
  { href: '/dashboard/patients', icon: Users,           label: 'Patients'    },
  { href: '/dashboard/profile',  icon: UserCircle,      label: 'My Profile'  },
];

const DOCTOR_ITEMS = [
  { href: '/dashboard/consult',  icon: ClipboardList,   label: 'Consultations' },
];

export default function Sidebar() {
  const pathname     = usePathname();
  const { user, wsConnected, deviceStatus } = useAppStore();

  const handleLogout = async () => {
    await authApi.logout();
    window.location.href = '/';
  };

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'ADMIN';
  const allNav   = isDoctor ? [...NAV_ITEMS, ...DOCTOR_ITEMS] : NAV_ITEMS;

  return (
    <aside className="fixed top-0 left-0 h-full w-64 flex flex-col border-r z-50"
      style={{ background: 'rgba(3,7,18,0.95)', borderColor: 'var(--border)',
               backdropFilter: 'blur(20px)' }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b"
           style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#22d3ee,#8b5cf6)' }}>
          <Cpu size={18} className="text-[#030712]" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-bold text-sm text-white">PPG Monitor</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>FPGA IoT Platform</p>
        </div>
      </div>

      {/* ── Live Status Pill ─────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="glass-card px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={clsx('w-2 h-2 rounded-full',
              deviceStatus.status === 'online' ? 'bg-emerald-400 animate-ping-slow' : 'bg-slate-600')} />
            <span className="text-xs font-medium"
                  style={{ color: deviceStatus.status === 'online' ? '#10b981' : 'var(--text-faint)' }}>
              {deviceStatus.status === 'online' ? 'Device Online' : 'No Device'}
            </span>
          </div>
          {wsConnected && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">WS</span>
          )}
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {allNav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
                  className={clsx('nav-item', active && 'active')}>
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* ── RSSI bar ─────────────────────────────────────────────────────── */}
      {deviceStatus.rssi_dbm && (
        <div className="px-4 pb-2">
          <div className="glass-card px-3 py-2">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              Wi-Fi Signal
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full"
                     style={{
                       width : `${Math.min(100, Math.max(0, (deviceStatus.rssi_dbm + 100) * 2))}%`,
                       background: deviceStatus.rssi_dbm > -60 ? '#10b981' :
                                   deviceStatus.rssi_dbm > -75 ? '#f59e0b' : '#ef4444',
                     }} />
              </div>
              <span className="text-xs font-mono tabular-nums"
                    style={{ color: 'var(--text-faint)' }}>
                {deviceStatus.rssi_dbm} dBm
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── User Profile ─────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
             style={{ background: 'var(--bg-card)' }}>
          {user?.avatarUrl
            ? <Image src={user.avatarUrl} alt="Avatar" width={32} height={32}
                     className="rounded-full" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                   style={{ background: 'linear-gradient(135deg,#22d3ee,#8b5cf6)', color: '#030712' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
              {user?.role?.toLowerCase()}
            </p>
          </div>
          <button onClick={handleLogout} title="Log out"
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-muted)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
