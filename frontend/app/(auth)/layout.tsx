import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = { title: 'Authentication' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex w-[48%] bg-gradient-to-br from-primary/90 via-purple-700 to-indigo-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-6 w-6" />
            <span className="text-xl font-bold tracking-tight">AetherNotes</span>
          </div>
        </div>

        <div className="relative z-10 text-white space-y-6">
          <blockquote className="text-3xl font-light leading-relaxed">
            &ldquo;Your thoughts, encrypted.<br />Your ideas, immortal.&rdquo;
          </blockquote>
          <div className="space-y-4">
            {[
              { emoji: '🔐', label: 'AES-256-GCM encryption',    desc: 'Notes encrypted client-side before leaving your device' },
              { emoji: '⚡', label: 'Real-time sync',              desc: 'WebSocket-powered live updates across all your devices' },
              { emoji: '🌐', label: 'Offline first',               desc: 'Works without internet, syncs automatically when reconnected' },
            ].map(f => (
              <div key={f.label} className="flex gap-3 items-start">
                <span className="text-lg mt-0.5">{f.emoji}</span>
                <div>
                  <p className="font-medium text-white/90">{f.label}</p>
                  <p className="text-white/60 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} AetherNotes. All rights reserved.
        </p>
      </div>

      {/* ── Right: auth form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
