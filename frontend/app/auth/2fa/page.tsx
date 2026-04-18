'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function TwoFAPage() {
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const inputs                = useRef<(HTMLInputElement | null)[]>([]);
  const router                = useRouter();

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < 6) { setError('Enter all 6 digits'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.verify2fa(token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(34,211,238,0.08) 0%, #030712 60%)' }}>

      <div className="glass-card w-full max-w-sm p-8 animate-slide-up text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
             style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
          <ShieldCheck size={26} style={{ color: '#8b5cf6' }} />
        </div>

        <h1 className="text-xl font-bold text-white mb-1">Two-Factor Authentication</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Enter the 6-digit code from your authenticator app
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Grid */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold font-mono rounded-xl outline-none transition-all duration-150"
                style={{
                  background  : digit ? 'rgba(139,92,246,0.15)' : 'var(--bg-card)',
                  border      : `2px solid ${digit ? 'rgba(139,92,246,0.5)' : 'var(--border)'}`,
                  color       : '#f0f9ff',
                  caretColor  : '#8b5cf6',
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#22d3ee)' }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        <p className="text-xs mt-6" style={{ color: 'var(--text-faint)' }}>
          Use Google Authenticator or Authy to get your code.
          <br />
          <a href="/" className="underline mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
            ← Back to login
          </a>
        </p>
      </div>
    </main>
  );
}
