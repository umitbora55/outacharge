"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import ParticleCanvas from "./ParticleCanvas";

export default function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-300">

      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 28%, rgba(0,0,0,0.14) 0.5px, transparent 0.8px),
            radial-gradient(circle at 72% 58%, rgba(0,0,0,0.11) 0.5px, transparent 0.9px),
            radial-gradient(circle at 38% 82%, rgba(0,0,0,0.09) 0.4px, transparent 0.9px)
          `,
          backgroundSize: '150px 150px, 190px 190px, 230px 230px',
        }}
      />

      {/* Particle canvas */}
      <ParticleCanvas titleRef={titleRef as React.RefObject<HTMLElement>} />

      {/* Content */}
      <div className="relative z-10">

        {/* Hero */}
        <main className="relative min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
          <section className="relative text-center max-w-4xl">
            <div className="relative">
              {/* Headline */}
              <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="heroTitleWrap">
                  <h1 ref={titleRef} className="heroTitle text-5xl md:text-7xl lg:text-8xl mb-3">
                    <span className="heroTitleFill">Geleceğe şarjlı çık.</span>
                    <span className="heroTitleFx" aria-hidden="true">Geleceğe şarjlı çık.</span>
                  </h1>
                </div>
                <p className="text-2xl md:text-3xl lg:text-4xl font-semibold text-zinc-500 dark:text-zinc-400" style={{ letterSpacing: "-0.01em" }}>
                  İstasyon, süre, fiyat: tek ekranda.
                </p>
              </div>

              {/* CTA buttons */}
              <div className={`mt-10 flex items-center justify-center gap-3 flex-wrap transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Link
                  href="/harita"
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-semibold bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Haritayı Aç
                </Link>
                <Link
                  href="/rota-planla"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-black/10 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Şarjı Planla
                </Link>
              </div>

              {/* Stats */}
              <div className={`mt-14 md:mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {[
                  { value: "3,500+", label: "İstasyon" },
                  { value: "Canlı", label: "Doluluk" },
                  { value: "En İyi", label: "Rota" }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .heroTitle {
          position: relative;
          display: inline-block;
          font-weight: 900;
          letter-spacing: -0.025em;
          line-height: 1.12;
          padding: 0.04em 0.02em 0.20em;
          isolation: isolate;
          -webkit-font-smoothing: antialiased;
        }
        .heroTitleFill, .heroTitleFx {
          display: block;
          padding-bottom: 0.06em;
        }
        .heroTitleFill {
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          background-image: linear-gradient(92deg,
            #B50D13 0%, #C43A14 14%, #D85116 26%, #E06B1B 38%,
            #F0A81A 48%, #F7DC11 52%, #F0A81A 56%, #E4801D 62%,
            #9BBE8F 74%, #5FAFB9 86%, #2D9CCE 100%
          );
          background-size: 150% 100%;
          background-position: 0% 50%;
          filter: saturate(1.07) contrast(1.05) brightness(1.02);
          animation: heroGradShift 12s ease-in-out infinite;
        }
        .heroTitleFx {
          position: absolute;
          inset: 0;
          pointer-events: none;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          background-image:
            radial-gradient(120% 120% at 28% 10%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 35%, rgba(255,255,255,0) 62%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.00) 2px, rgba(255,255,255,0.00) 6px);
          mix-blend-mode: overlay;
          opacity: 0.35;
        }
        @keyframes heroGradShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 70% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
