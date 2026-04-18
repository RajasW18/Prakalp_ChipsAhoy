import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title       : 'PPG Health Monitor — AI-Powered Telemedicine',
  description : 'Real-time FPGA PPG waveform monitoring with AI disease prediction. Secure telemedicine portal for doctors and patients.',
  keywords    : ['PPG', 'FPGA', 'telemedicine', 'arrhythmia', 'cardiac monitoring', 'IoT health'],
  openGraph   : {
    title      : 'PPG Health Monitor',
    description: 'Real-time AI cardiac monitoring platform',
    type       : 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
