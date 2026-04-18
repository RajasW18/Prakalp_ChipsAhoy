import Link from 'next/link';
import { Activity, Shield, Zap, Cpu, Brain, ArrowRight, Wifi, Lock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const FEATURES = [
  { icon: Activity, title: 'Real-Time PPG Waveform',  desc: 'Live plotting of photoplethysmography signals sampled at 500 Hz from the Artix-7 FPGA.',  color: '#10b981' },
  { icon: Brain,    title: 'AI Disease Prediction',   desc: 'On-chip ML detects Arrhythmia, AFib, Tachycardia & Bradycardia with confidence scoring.',    color: '#8b5cf6' },
  { icon: Wifi,     title: 'IoT MQTT Gateway',        desc: 'ESP32 bridges FPGA to cloud via MQTT QoS-1 over TLS. Zero data loss with offline buffering.', color: '#22d3ee' },
  { icon: Shield,   title: 'Secure Telemedicine',     desc: 'OAuth 2.0 + TOTP 2FA. End-to-end TLS 1.3 encryption for every data hop.',                    color: '#f59e0b' },
  { icon: Lock,     title: 'Doctor Portal',           desc: 'Physicians review session data securely and submit clinical consultations in real time.',       color: '#ef4444' },
  { icon: Zap,      title: 'Sub-Second Latency',      desc: 'WebSocket relay delivers readings from sensor to browser in under 300 ms end-to-end.',        color: '#22d3ee' },
];

const STATS = [
  { value: '500 Hz', label: 'Sampling Rate' },
  { value: '12-bit', label: 'ADC Resolution' },
  { value: 'TLS 1.3', label: 'Encryption' },
  { value: 'QoS 1',  label: 'MQTT Delivery' },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: '#030712' }}>

      {/* ── Background Orbs ──────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="bg-orb bg-orb-cyan w-[600px] h-[600px] -top-40 -left-40 opacity-60" />
        <div className="bg-orb bg-orb-purple w-[500px] h-[500px] top-1/2 -right-32 opacity-50"
             style={{ animationDelay: '3s' }} />
        <div className="bg-orb bg-orb-cyan w-[400px] h-[400px] bottom-0 left-1/3 opacity-30"
             style={{ animationDelay: '6s' }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                      backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b"
           style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-glow-pulse"
               style={{ background: 'linear-gradient(135deg,#22d3ee,#8b5cf6)' }}>
            <Cpu size={18} className="text-[#030712]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg text-white">PPG Monitor</span>
        </div>
        <Link href="/auth/login" id="nav-login-btn">
          <button className="btn-ghost text-sm px-4 py-2">Sign In</button>
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold"
             style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)',
                      color: '#22d3ee' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
          Artix-7 FPGA · ESP32 · MQTT · PostgreSQL
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 max-w-4xl">
          <span className="text-white">AI-Powered </span>
          <span className="gradient-text">PPG Health</span>
          <br />
          <span className="text-white">Monitoring</span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
           style={{ color: 'var(--text-muted)' }}>
          From FPGA sensor to doctor&apos;s browser — real-time photoplethysmography
          waveforms, on-chip AI disease detection, and a secure telemedicine portal.
          All in one platform.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link href="/auth/login" id="hero-login-btn">
            <button className="btn-primary flex items-center justify-center gap-2 px-8 py-3.5 text-base">
              Get Started <ArrowRight size={18} />
            </button>
          </Link>
          <Link href="#features" id="learn-more-btn">
            <button className="btn-ghost flex items-center gap-2">
              Learn More <ArrowRight size={15} />
            </button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-6 mt-14">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold font-mono gradient-text">{value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Animated ECG Divider ─────────────────────────────────────────── */}
      <div className="relative z-10 w-full overflow-hidden" style={{ height: 80 }}>
        <svg viewBox="0 0 1200 80" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            points="0,40 100,40 140,40 160,10 180,70 200,15 220,60 240,40 300,40 400,40 440,40 460,5 480,75 500,10 520,65 540,40 600,40 700,40 740,40 760,8 780,72 800,12 820,62 840,40 900,40 1000,40 1040,40 1060,6 1080,74 1100,11 1120,64 1140,40 1200,40"
            stroke="#10b981" strokeWidth="2" strokeOpacity="0.6"
            style={{ filter: 'drop-shadow(0 0 6px #10b981)' }}
          />
        </svg>
      </div>

      {/* ── Features Grid ─────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-6 md:px-12 pb-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="gradient-text">Everything</span>
          <span className="text-white"> you need</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass-card p-6 group hover:glass-card-active transition-all duration-200">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                   style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={20} style={{ color }} strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t py-6 px-8 text-center"
              style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
        <p className="text-xs">
          FPGA-Based PPG Waveform Analysis & Disease Prediction · Academic Project ·
          Built with Artix-7, ESP32, MQTT, PostgreSQL & Next.js
        </p>
      </footer>
    </main>
  );
}
