"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Calculator as CalculatorIcon, TrendingUp, PiggyBank, Droplets, Fuel } from "lucide-react";

export default function HesaplayiciPage() {
  // State for inputs
  const [dailyKm, setDailyKm] = useState(50);
  const [fuelPrice, setFuelPrice] = useState(42.5); // TL/Liter
  const [fuelConsumption, setFuelConsumption] = useState(8); // Liter/100km
  const [electricityPrice, setElectricityPrice] = useState(3.5); // TL/kWh (Home)
  const [evConsumption, setEvConsumption] = useState(18); // kWh/100km

  // Calculations
  const monthlyDistance = dailyKm * 30;

  // ICE Costs
  const iceCostPerKm = (fuelConsumption / 100) * fuelPrice;
  const monthlyIceCost = monthlyDistance * iceCostPerKm;

  // EV Costs
  const evCostPerKm = (evConsumption / 100) * electricityPrice;
  const monthlyEvCost = monthlyDistance * evCostPerKm;

  // Savings
  const monthlySavings = monthlyIceCost - monthlyEvCost;
  const annualSavings = monthlySavings * 12;

  const content = {
    locations: "İstasyonlar",
    community: "Topluluk",
    login: "Giriş Yap",
    getStarted: "Hemen Başla"
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] font-sans text-slate-900 pb-20 overflow-x-hidden relative">

      {/* Background Illustration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat grayscale-[20%]"
          style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f0fdf4]/50 to-[#f0fdf4]" />
      </div>

      {/* 1. Header (Consistent) */}
      <nav className="fixed top-6 left-6 right-6 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
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
          <Link href="/hesaplayici" className="text-green-600 transition-colors">Hesaplayıcı</Link>
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

      {/* 2. Hero Section */}
      <div className="relative z-10 pt-44 pb-12 px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 relative"
        >
          <div className="relative px-5 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-2">
            <CalculatorIcon className="w-3 h-3 text-green-600" />
            <span className="text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">Maliyet Hesaplayıcı</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm"
        >
          Tasarrufunu <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800">Hesapla.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 max-w-2xl font-medium leading-relaxed mb-12"
        >
          Elektrikli araca geçerek ne kadar tasarruf edebileceğinizi anında görün.
        </motion.p>
      </div>

      {/* 3. Calculator UI */}
      <div className="container max-w-6xl mx-auto px-6 relative z-20 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* Left: Inputs */}
          <div className="lg:col-span-5 space-y-8">

            {/* 1. Distance Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-green-900/5 border border-white/60"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><TrendingUp className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-slate-900">Sürüş Alışkanlığı</h3>
              </div>

              <div className="mb-8">
                <label className="flex justify-between text-sm font-semibold text-slate-600 mb-4">
                  <span>Günde kaç km yapıyorsun?</span>
                  <span className="text-blue-600">{dailyKm} km</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={dailyKm}
                  onChange={(e) => setDailyKm(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                  <span>10 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </motion.div>

            {/* 2. Parameters Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-green-900/5 border border-white/60"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Fuel className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-slate-900">Maliyet Parametreleri</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
                    <span>Benzin Fiyatı (TL/Lt)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={fuelPrice}
                      onChange={(e) => setFuelPrice(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">TL</span>
                  </div>
                </div>

                <div>
                  <label className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
                    <span>Araç Tüketimi (Lt/100km)</span>
                  </label>
                  <input
                    type="number"
                    value={fuelConsumption}
                    onChange={(e) => setFuelConsumption(Number(e.target.value))}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                <div className="h-px bg-slate-200 my-6" />

                <div>
                  <label className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
                    <span>Elektrik Fiyatı (TL/kWh)</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Ev Şarjı</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={electricityPrice}
                      onChange={(e) => setElectricityPrice(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">TL</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-7 space-y-8"
          >
            {/* Main Result Card */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-800 p-1 rounded-[2.5rem] shadow-2xl shadow-green-900/20">
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-[2.4rem] p-8 md:p-12 text-white relative overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 blur-[100px] rounded-full" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4 text-green-300 font-bold uppercase tracking-widest text-xs">
                      <PiggyBank className="w-5 h-5" />
                      Yıllık Tasarruf
                    </div>
                    <div className="text-6xl md:text-8xl font-bold tracking-tight mb-2">
                      {annualSavings.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} <span className="text-3xl md:text-5xl opacity-50">₺</span>
                    </div>
                    <p className="text-white/60 font-medium">Benzinli araca göre yıllık cebinizde kalan tutar.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Monthly Cost Card */}
              <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100 flex flex-col justify-between h-full">
                <h4 className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-8">Aylık Maliyet Karşılaştırması</h4>

                <div className="space-y-6">
                  {/* ICE Bar */}
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                      <span>Benzinli Araç</span>
                      <span>{monthlyIceCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        className="h-full bg-slate-400 rounded-full"
                      />
                    </div>
                  </div>

                  {/* EV Bar */}
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                      <span className="text-green-600">Elektrikli Araç</span>
                      <span className="text-green-600">{monthlyEvCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(monthlyEvCost / monthlyIceCost) * 100}%` }}
                        className="h-full bg-green-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Trees & CO2 Card */}
              <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 text-emerald-900 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Droplets className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-4xl font-bold mb-2">
                  ~{(monthlyDistance * 12 * 0.12).toFixed(1)} <span className="text-xl">Ton</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60">Yıllık CO2 Tasarrufu</div>
                <p className="text-sm mt-4 opacity-80 max-w-[200px]">Bu tasarruf, her yıl yaklaşık 12 ağaç dikmeye eşdeğerdir.</p>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}