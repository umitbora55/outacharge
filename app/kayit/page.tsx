"use client";

import { useState } from "react";
import { useAuth, UserRegistrationData } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Mail, Lock, User, Loader2, ChevronRight,
  Car, Phone, ArrowLeft, ArrowRight, Check, Home, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brands, vehiclesByBrand } from "@/data/vehicles";
import { countryCodes } from "@/data/countries";

export default function KayitPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Quick preferences for better UX
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [chargingPreference, setChargingPreference] = useState("");
  const [preferredChargerType, setPreferredChargerType] = useState("");
  const [homeCharging, setHomeCharging] = useState<boolean | null>(null);

  const content = {
    locations: "İstasyonlar",
    community: "Topluluk",
    login: "Giriş Yap",
    getStarted: "Hemen Başla"
  };

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
    <div className="min-h-screen bg-[#f0fdf4] font-sans text-slate-900 pb-20 overflow-x-hidden relative">

      {/* Background Illustration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat grayscale-[20%]"
          style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f0fdf4]/50 to-[#f0fdf4]" />
      </div>

      {/* Consistent Floating Header */}
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


      {/* Register Content - Compacted */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-16 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[460px] px-4"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-green-900/10 border border-white p-6 md:p-8 relative overflow-hidden">

            {/* Progress Indicator - Compact */}
            <div className="flex justify-center gap-1.5 mb-5 scale-90">
              <div className={`h-1 rounded-full transition-all duration-500 ${step >= 1 ? "w-8 bg-green-500" : "w-3 bg-slate-200"}`} />
              <div className={`h-1 rounded-full transition-all duration-500 ${step >= 2 ? "w-8 bg-green-500" : "w-3 bg-slate-200"}`} />
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mb-3 shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">Aramıza Katılın</h1>
                    <p className="text-slate-500 text-xs">Ücretsiz hesap oluşturun.</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full h-10 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                    >
                      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" className="text-[#FBBC05]" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]" /></svg>
                          <span>Google ile Hızlı Kaydol</span>
                        </>}
                    </button>

                    <div className="relative my-4 text-center">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">veya</span>
                    </div>

                    <form onSubmit={handleNext} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Ad Soyad</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Furkan Yılmaz"
                          className="w-full h-10 px-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Telefon</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="5XX..."
                            className="w-full h-10 px-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">E-posta</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ad@email.com"
                            className="w-full h-10 px-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Şifre</label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full h-10 px-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Tekrar</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full h-10 px-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="p-2.5 bg-red-50 text-red-600 text-[10px] rounded-lg border border-red-100 font-medium">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full h-10 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                      >
                        Devam Et <ArrowRight className="w-3 h-3" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 mb-3 shadow-sm">
                      <Car className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">Araç Bilgileri</h1>
                    <p className="text-slate-500 text-xs">Size en uygun şarj noktalarını bulalım.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Marka</label>
                        <select
                          value={selectedBrand}
                          onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(""); }}
                          required
                          className="w-full h-10 px-3 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="" disabled>Seçiniz</option>
                          {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Model</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          required
                          disabled={!selectedBrand}
                          className="w-full h-10 px-3 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none disabled:opacity-50"
                        >
                          <option value="" disabled>Seçiniz</option>
                          {vehiclesByBrand[selectedBrand]?.map(v => <option key={v.id} value={v.model}>{v.model}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Şarj Önceliği</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: "price", label: "En Ucuz" },
                          { val: "speed", label: "En Hızlı" },
                          { val: "distance", label: "En Yakın" }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChargingPreference(opt.val)}
                            className={`h-10 rounded-xl text-[10px] font-bold transition-all border ${chargingPreference === opt.val ? "bg-orange-500 text-white border-orange-500" : "bg-white border-slate-200 text-slate-600 hover:border-orange-200"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Soket Tipi</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: "AC", label: "AC (Yavaş)" },
                          { val: "DC", label: "DC (Hızlı)" }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setPreferredChargerType(opt.val)}
                            className={`h-10 rounded-xl text-[10px] font-bold transition-all border ${preferredChargerType === opt.val ? "bg-blue-500 text-white border-blue-500" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Evde Şarj İmkanı?</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setHomeCharging(true)}
                          className={`h-10 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 ${homeCharging === true ? "bg-green-500 text-white border-green-500" : "bg-white border-slate-200 text-slate-600 hover:border-green-200"}`}
                        >
                          <Home className="w-3 h-3" /> Var
                        </button>
                        <button
                          type="button"
                          onClick={() => setHomeCharging(false)}
                          className={`h-10 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 ${homeCharging === false ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
                        >
                          <X className="w-3 h-3" /> Yok
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        <>
                          <span>Kaydı Tamamla</span>
                          <Check className="w-4 h-4" />
                        </>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 py-1"
                    >
                      Geri Dön
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center text-xs font-medium text-slate-500">
              Zaten hesabın var mı? <Link href="/giris" className="text-green-600 hover:text-green-700 font-bold">Giriş Yap</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
