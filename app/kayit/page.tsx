"use client";

import { useState } from "react";
import { useAuth, UserRegistrationData } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Mail, Lock, User, Loader2, ChevronRight,
  Car, Plug, Home, Check, X, Phone, ArrowLeft, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brands, vehiclesByBrand } from "@/data/vehicles";
import { countryCodes } from "@/data/countries";
import HeaderWhite from "../components/HeaderWhite";

export default function KayitPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Preferences

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]); // Default to Turkey
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [chargingPreference, setChargingPreference] = useState("");
  const [preferredChargerType, setPreferredChargerType] = useState("");
  const [homeCharging, setHomeCharging] = useState<boolean | null>(null);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const showMatchFeedback = confirmPassword.length > 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError("Lütfen tüm alanları doldurunuz");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }

    setStep(2);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw new Error(error);
    } catch (err: any) {
      setError(err.message || "Google ile kayıt başarısız");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedBrand || !selectedModel || !preferredChargerType || !chargingPreference || homeCharging === null) {
      setError("Lütfen tüm tercihleri seçiniz");
      return;
    }

    setLoading(true);

    try {
      const fullPhoneNumber = `${selectedCountry.code}${phone.replace(/^0+/, '')}`;
      const additionalData: UserRegistrationData = {
        phone: fullPhoneNumber,
        vehicle_brand: selectedBrand,
        vehicle_model: selectedModel,
        charging_preference: chargingPreference,
        preferred_charger_type: preferredChargerType,
        home_charging_available: homeCharging,
      };

      const vehicle = vehiclesByBrand[selectedBrand]?.find(v => v.model === selectedModel);
      if (vehicle?.year) {
        additionalData.vehicle_year = parseInt(vehicle.year);
      }

      const { error: signUpError } = await signUp(email, password, fullName, additionalData);

      if (signUpError) {
        setError(signUpError);
        setLoading(false);
        return;
      }

      router.push("/profil");
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-1000 selection:bg-emerald-500/30 font-sans text-zinc-900 dark:text-white overflow-hidden relative">
      <HeaderWhite />

      {/* Decorative Background Labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-[0.03] dark:opacity-[0.05]">
        <span className="absolute -bottom-10 -left-20 text-[20vw] font-black tracking-tighter uppercase whitespace-nowrap">
          OutaCharge
        </span>
        <span className="absolute -top-10 -right-20 text-[20vw] font-black tracking-tighter uppercase whitespace-nowrap">
          Network
        </span>
      </div>

      <div className="flex flex-col items-center justify-start min-h-screen w-full px-4 pt-[2vh] pb-4">
        <div className="w-full max-w-md flex flex-col gap-1.5 scale-[0.95] sm:scale-100 transform-gpu translate-y-2">

          {/* Hero Heading */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-1.5 mb-0.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
              <Zap className="w-2 h-2 text-emerald-500" />
              <span className="text-[7px] font-bold tracking-[0.2em] uppercase text-zinc-500">Kayıt Ol</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extralight tracking-tight mb-0.5 leading-tight">
              Aramıza <span className="font-medium italic text-emerald-500">Katılın.</span>
            </h1>
            <p className="text-zinc-500 text-[9px] md:text-[10px] font-light max-w-[200px] mx-auto leading-relaxed">
              {step === 1 ? "Hesabınızı oluşturun ve geleceğe adım atın." : "Aracınızı ve şarj tercihlerinizi belirleyin."}
            </p>
          </motion.div>

          {/* Progress Bar Container */}
          <div className="flex items-center justify-center gap-1 mb-0.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`h-0.5 rounded-full transition-all duration-700 ${step === i ? "w-8 bg-emerald-500" : i < step ? "w-4 bg-emerald-500/40" : "w-4 bg-zinc-100 dark:bg-white/5"
                  }`}
              />
            ))}
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />

            <div className="relative bg-white/80 dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl p-4 md:p-5 overflow-hidden">

              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-2.5"
                  >
                    {/* Google Sign In */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full h-9 flex items-center justify-center gap-2.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl font-medium text-[10px] text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <svg className="w-3 h-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span>Google ile Hızlı Kaydol</span>
                        </>
                      )}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100 dark:border-white/5" /></div>
                      <div className="relative flex justify-center text-[6px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                        <span className="bg-white dark:bg-zinc-900 px-2 tracking-[0.3em]">veya bilgilerinizle</span>
                      </div>
                    </div>

                    <form onSubmit={handleNext} className="space-y-2">
                      <div className="space-y-0.5">
                        <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Ad Soyad</label>
                        <div className="relative group/input">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Furkan Yılmaz"
                            required
                            className="w-full h-9 pl-9 pr-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Telefon</label>
                        <div className="flex gap-1.5">
                          <div className="relative w-[80px] shrink-0">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none">{selectedCountry.flag}</div>
                            <select
                              value={selectedCountry.code}
                              onChange={(e) => {
                                const country = countryCodes.find(c => c.code === e.target.value);
                                if (country) setSelectedCountry(country);
                              }}
                              className="w-full h-9 pl-7 pr-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] outline-none transition-all font-light appearance-none"
                            >
                              {countryCodes.map(c => (
                                <option key={`${c.iso}-${c.code}`} value={c.code} className="bg-white dark:bg-zinc-900">
                                  {c.code}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                              <ArrowRight className="w-2 h-2 rotate-90" />
                            </div>
                          </div>
                          <div className="relative flex-1 group/input">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="5..."
                              required
                              className="w-full h-9 pl-9 pr-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">E-posta</label>
                        <div className="relative group/input">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ad@email.com"
                            required
                            className="w-full h-9 pl-9 pr-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Şifre</label>
                          <div className="relative group/input">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••"
                              required
                              minLength={6}
                              className="w-full h-9 pl-9 pr-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light"
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Teyit</label>
                          <div className="relative group/input">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••"
                              required
                              className={`w-full h-9 pl-9 ${showMatchFeedback ? 'pr-8' : 'pr-3'} bg-zinc-50 dark:bg-white/5 border ${showMatchFeedback ? (passwordsMatch ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-zinc-200 dark:border-white/10'} rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light`}
                            />
                            {showMatchFeedback && (
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {passwordsMatch ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <X className="w-2.5 h-2.5 text-red-500" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full relative h-9 group/btn bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-[10px] overflow-hidden transition-all active:scale-95 mt-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center justify-center gap-1.5 group-hover/btn:text-white transition-colors">
                          <span>Tercihleri Belirle</span>
                          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-3"
                  >
                    <form onSubmit={handleSubmit} className="space-y-3">

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Araç Markası</label>
                          <div className="relative group/input">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors pointer-events-none" />
                            <select
                              value={selectedBrand}
                              onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(""); }}
                              required
                              className="w-full h-9 pl-9 pr-2 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light appearance-none"
                            >
                              <option value="" disabled className="bg-white dark:bg-zinc-900">Marka</option>
                              {brands.map(brand => <option key={brand} value={brand} className="bg-white dark:bg-zinc-900">{brand}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Model</label>
                          <div className="relative group/input">
                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors pointer-events-none" />
                            <select
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value)}
                              required
                              disabled={!selectedBrand}
                              className="w-full h-9 pl-9 pr-2 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light appearance-none disabled:opacity-50"
                            >
                              <option value="" disabled className="bg-white dark:bg-zinc-900">Model</option>
                              {vehiclesByBrand[selectedBrand]?.map(v => <option key={v.id} value={v.model} className="bg-white dark:bg-zinc-900">{v.model}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Şarj Tipi</label>
                          <select
                            value={preferredChargerType}
                            onChange={(e) => setPreferredChargerType(e.target.value)}
                            required
                            className="w-full h-9 px-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light appearance-none"
                          >
                            <option value="" disabled>Seçin</option>
                            <option value="AC">AC (Yavaş)</option>
                            <option value="DC">DC (Hızlı)</option>
                            <option value="both">Karışık</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Öncelik</label>
                          <select
                            value={chargingPreference}
                            onChange={(e) => setChargingPreference(e.target.value)}
                            required
                            className="w-full h-9 px-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-[10px] focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-light appearance-none"
                          >
                            <option value="" disabled>Seçin</option>
                            <option value="price">En Ucuz</option>
                            <option value="speed">En Hızlı</option>
                            <option value="distance">En Yakın</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[7px] font-bold uppercase tracking-[0.1em] text-zinc-400 ml-1">Evde şarj imkanınız var mı?</label>
                        <div className="flex gap-2">
                          {[
                            { val: true, label: "Evet", icon: Home },
                            { val: false, label: "Hayır", icon: X }
                          ].map((option) => (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => setHomeCharging(option.val)}
                              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-[10px] transition-all ${homeCharging === option.val
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-medium"
                                : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500"
                                }`}
                            >
                              <option.icon className="w-2.5 h-2.5" />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {error && (
                        <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[8px] text-red-500 text-center animate-in fade-in">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 h-9 rounded-xl border border-zinc-200 dark:border-white/10 text-[10px] font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-all flex items-center gap-1.5"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Geri
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 relative h-9 group/btn bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-[10px] overflow-hidden transition-all active:scale-95 shadow-lg"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                          <div className="relative flex items-center justify-center gap-1.5 group-hover/btn:text-white transition-colors">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><span>Üyeliği Tamamla</span><Check className="w-3 h-3" /></>}
                          </div>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Footer Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-zinc-500 text-[9px] font-light mt-1"
          >
            Zaten hesabınız var mı?{" "}
            <Link href="/giris" className="text-zinc-900 dark:text-white font-semibold hover:text-emerald-500 transition-colors underline underline-offset-4 decoration-zinc-200 dark:decoration-white/10">
              Giriş yapın
            </Link>
          </motion.p>
        </div>
      </div>

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
