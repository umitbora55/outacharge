"use client";
import Onboarding from "./components/Onboarding";
import HeroSection from "./components/HeroSection";
import HeaderWhite from "./components/HeaderWhite";
import { motion } from "framer-motion";
import { Globe, Users, Navigation, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white dark:bg-black selection:bg-emerald-500/30 overflow-x-hidden transition-colors duration-500">
      <Onboarding />
      <HeaderWhite />

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Sections - Editorial Style */}
      <div className="relative px-6 pb-32 space-y-32 md:space-y-64 max-w-7xl mx-auto">

        {/* Section 1: Network */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <div className="space-y-8 order-2 md:order-1">
            <div className="space-y-2">
              <span className="text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase tracking-[0.4em]">High Precision Network</span>
              <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-black dark:text-white leading-[1.1]">
                Türkiye'nin <br /> <span className="font-medium italic">En Kapsamlı</span> Ağı.
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-500 text-lg font-light leading-relaxed max-w-md">
              29 farklı operatör ve 3.500'den fazla istasyon. OutaCharge, Türkiye genelindeki tüm şarj noktalarını tek bir platformda birleştirir.
            </p>
            <Link href="/harita" className="inline-flex items-center gap-2 text-black dark:text-white font-medium group text-sm">
              Tüm İstasyonları Gör
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-600 dark:text-emerald-500" />
            </Link>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="aspect-square rounded-[3rem] bg-emerald-500/[0.03] dark:bg-emerald-500/20 border border-zinc-200 dark:border-white/10 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent)] group-hover:scale-150 transition-transform duration-1000" />
              <Globe className="w-32 h-32 text-emerald-600/30 dark:text-emerald-500/50 relative z-10" />
              {/* Decorative nodes - Fixed positions to avoid hydration mismatch */}
              {[
                { top: '25%', left: '30%' },
                { top: '60%', left: '20%' },
                { top: '45%', left: '70%' },
                { top: '75%', left: '60%' },
                { top: '35%', left: '55%' },
              ].map((pos, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full blur-[2px]"
                  style={{
                    top: pos.top,
                    left: pos.left
                  }}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Section 2: Community */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <div className="relative">
            <div className="aspect-video rounded-[3rem] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-3xl p-8 flex flex-col justify-between group">
              <div className="flex gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-white/10" />
                ))}
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+12K</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "70%" }}
                    transition={{ duration: 2, delay: 0.5 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "45%" }}
                    transition={{ duration: 2, delay: 0.7 }}
                    className="h-full bg-teal-500"
                  />
                </div>
              </div>
              <Users className="absolute bottom-8 right-8 w-12 h-12 text-zinc-300 dark:text-white/10 group-hover:text-emerald-600/20 dark:group-hover:text-emerald-500/20 transition-colors duration-500" />
            </div>
          </div>
          <div className="space-y-8">
            <div className="space-y-2">
              <span className="text-teal-600 dark:text-teal-500 text-[10px] font-bold uppercase tracking-[0.4em]">Join the Hive</span>
              <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-black dark:text-white leading-[1.1]">
                Gücümüz <br /> <span className="font-medium underline decoration-teal-600/30 dark:decoration-teal-500/30 underline-offset-8">Topluluktan.</span>
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-500 text-lg font-light leading-relaxed max-w-md">
              Diğer elektrikli araç sahipleriyle tanışın, deneyimlerinizi paylaşın ve operatörler hakkında gerçek kullanıcı yorumlarını okuyun.
            </p>
            <Link href="/topluluk" className="inline-flex items-center gap-2 text-black dark:text-white font-medium group text-sm">
              Topluluğa Katıl
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-teal-600 dark:text-teal-500" />
            </Link>
          </div>
        </motion.section>

        {/* Section 3: Route Planning */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <div className="space-y-8 order-2 md:order-1">
            <div className="space-y-2">
              <span className="text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase tracking-[0.4em]">Smart Route Intelligence</span>
              <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-black dark:text-white leading-[1.1]">
                Stres Yok, <br /> <span className="font-medium">Sadece Rota.</span>
              </h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-500 text-lg font-light leading-relaxed max-w-md">
              Aracınızın menziline ve hava durumuna göre optimize edilmiş en akıllı rota planlama algoritması. Yolda kalma endişesine son verin.
            </p>
            <Link href="/rota-planla" className="inline-flex items-center gap-2 text-black dark:text-white font-medium group text-sm">
              Rotanı Planla
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-600 dark:text-emerald-500" />
            </Link>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="aspect-square rounded-[3rem] bg-gradient-to-tr from-teal-500/[0.03] dark:from-teal-500/20 to-emerald-500/5 border border-zinc-200 dark:border-white/10 p-12 flex flex-col justify-center items-center group">
              <div className="relative w-full h-full flex items-center justify-center">
                <Navigation className="w-24 h-24 text-black dark:text-white group-hover:scale-110 transition-transform duration-700" />
                <motion.div
                  className="absolute inset-0 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-12 border border-emerald-500/10 dark:border-emerald-500/20 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </motion.section>

      </div>

      {/* Decorative Watermark Footer */}
      <div className="pb-20 text-center opacity-[0.03] dark:opacity-5 pointer-events-none transition-opacity">
        <span className="text-[15vw] font-black tracking-tighter uppercase whitespace-nowrap text-black dark:text-white">
          OutaCharge
        </span>
      </div>
    </div>
  );
}
