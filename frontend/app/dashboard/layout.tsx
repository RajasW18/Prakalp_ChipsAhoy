'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';
import { authApi } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setAccessToken } = useAppStore();
  const router      = useRouter();

  useEffect(() => {
    authApi.me()
      .then(({ data }) => {
        const { accessToken, ...user } = data;
        setUser(user);
        if (accessToken) setAccessToken(accessToken);
      })
      .catch(() => router.replace('/'));  // Not logged in → back to landing
  }, [setUser, setAccessToken, router]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
