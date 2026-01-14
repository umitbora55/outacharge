"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Map, Route, ArrowRight } from "lucide-react";
import ElectricFluxBackground from "./ElectricFluxBackground";

export default function HeroSection() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-black selection:bg-emerald-500/30 font-sans text-black dark:text-white transition-colors duration-500">
      {/* Dynamic Background */}
      <ElectricFluxBackground />

      {/* Grid Pattern Overlay - CSS Only */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.15] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Content Container */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="max-w-5xl w-full text-center">
          {/* Top Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md mb-8"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400">Türkiye'nin En Gelişmiş EV Ağı</span>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extralight tracking-tighter mb-6 leading-[0.95]">
              Geleceğe <br />
              <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-400 dark:via-emerald-500 dark:to-teal-600 animate-gradient-x">
                şarjlı çık.
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              İstasyon, süre, fiyat ve <span className="text-black dark:text-white font-normal underline underline-offset-8 decoration-emerald-500/30">daha fazlası</span>. <br className="hidden md:block" />
              Hepsi tek bir ekranda, parmaklarınızın ucunda.
            </p>
          </motion.div>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/harita"
                className="w-full sm:w-auto group relative flex items-center justify-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold text-base transition-all overflow-hidden shadow-lg hover:shadow-emerald-500/20 dark:hover:shadow-[0_0_40px_rgba(52,211,153,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <Map className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Haritayı Aç</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/rota-planla"
                className="w-full sm:w-auto relative flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-zinc-900 dark:text-white rounded-2xl font-semibold text-base transition-all group shadow-sm hover:shadow-emerald-500/10"
              >
                <Route className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors" />
                <span>Şarjı Planla</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Minimal Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-4xl mx-auto pt-12 border-t border-zinc-100 dark:border-white/5"
          >
            {[
              { label: "İstasyon", value: "3,500+" },
              { label: "Aktif Kullanıcı", value: "12K+" },
              { label: "Doluluk Verisi", value: "%100" },
              { label: "İnceleme", value: "5.0" }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <span className="text-2xl md:text-3xl font-extralight tracking-tight text-black dark:text-white">{stat.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Global Gradient Animation */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}
