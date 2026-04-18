'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAppStore } from '@/lib/store';
import { authApi, storeToken, getStoredToken } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setAccessToken } = useAppStore();
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract token from Google OAuth redirect URL (?token=xxx)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      storeToken(urlToken);
      // Clean the URL so the token isn't visible
      window.history.replaceState({}, '', '/dashboard');
    }

    authApi.me()
      .then(({ data }) => {
        const { accessToken, ...user } = data;
        setUser(user);
        if (accessToken) {
          setAccessToken(accessToken);
          storeToken(accessToken); // Refresh stored token
        }
      })
      .catch(() => router.replace('/'));  // Not logged in → back to landing
  }, [setUser, setAccessToken, router, searchParams]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
