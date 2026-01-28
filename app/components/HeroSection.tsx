"use client";
import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Zap, Search, Globe } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  language?: 'tr' | 'en';
  onToggleLanguage?: () => void;
}

export default function HeroSection({ language = 'tr', onToggleLanguage }: HeroSectionProps) {

  const t = {
    tr: {
      locations: "İstasyonlar",
      route: "Rota",
      community: "Topluluk",
      login: "Giriş Yap",
      getStarted: "Hemen Başla",
      tag: "Sürdürülebilir Seçim",
      headline: ["Gücünle", "Yola Çık."],
      subtext: "Dünyanın en güvenilir şarj ağını keşfet. Nereye gidersen git, yeşil enerji seninle.",
      placeholder: "E-posta adresini gir",
      start: "Başla",
      trusted: "10.000+ Sürücü Tarafından Güveniliyor"
    },
    en: {
      locations: "Locations",
      route: "Route",
      community: "Community",
      login: "Log in",
      getStarted: "Get Started",
      tag: "The Sustainable Choice",
      headline: ["Powering Your", "Next Adventure."],
      subtext: "Connect to the world's most reliable charging network. Green energy, wherever the road takes you.",
      placeholder: "Enter your email address",
      start: "Start Now",
      trusted: "Trusted by 10,000+ EV Drivers"
    }
  };

  const content = t[language];

  return (
    <div className="relative h-[100vh] w-full overflow-hidden bg-[#f0fdf4] font-sans text-slate-900">
      {/* Background Image - Illustrative Road */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
      </motion.div>

      {/* Floating Island Header */}
      <nav className="absolute top-6 left-6 right-6 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Outa<span className="text-green-600">Charge</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <Link href="/harita" className="hover:text-green-600 transition-colors">{content.locations}</Link>
          <Link href="/rota-planla" className="hover:text-green-600 transition-colors">Rota Planlayıcı</Link>
          <Link href="/topluluk" className="hover:text-green-600 transition-colors">{content.community}</Link>
          <Link href="/operatorler" className="hover:text-green-600 transition-colors">Operatörler</Link>
          <Link href="/markalar" className="hover:text-green-600 transition-colors">Markalar</Link>
          <Link href="/incelemeler" className="hover:text-green-600 transition-colors">İncelemeler</Link>
          <Link href="/hesaplayici" className="hover:text-green-600 transition-colors">Hesaplayıcı</Link>
        </div>

        <div className="hidden md:flex items-center gap-5">
          <Link href="/giris">
            <button className="text-sm font-semibold text-slate-600 hover:text-green-700 transition-colors">
              {content.login}
            </button>
          </Link>
          <Link href="/kayit">
            <button className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all shadow-lg shadow-slate-900/20">
              {content.getStarted}
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content - Centered & Friendly */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center px-6 pt-20">

        {/* Friendly Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-8 px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold tracking-wide uppercase border border-yellow-200 shadow-sm"
        >
          {content.tag}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-white drop-shadow-md"
        >
          {content.headline[0]} <br />
          <span className="text-yellow-300">{content.headline[1]}</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-2xl text-white/90 max-w-2xl font-medium mb-10 drop-shadow-sm leading-relaxed"
        >
          {content.subtext}
        </motion.p>

        {/* Input Field / CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-full max-w-md bg-white p-2 rounded-2xl shadow-2xl shadow-black/10 flex items-center gap-2"
        >
          <div className="pl-4 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={content.placeholder}
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 h-12"
          />
          <Link href="/kayit">
            <button className="h-12 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 transition-colors">
              {content.start}
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 flex items-center gap-6"
        >
          <p className="text-white/80 text-sm font-medium drop-shadow-sm">{content.trusted}</p>
        </motion.div>

      </div>
    </div>
  );
}
