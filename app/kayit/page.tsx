"use client";
import { useState } from "react";
import { useAuth, UserRegistrationData } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, User, Loader2, ChevronRight, Car, Plug, Home, Check, X, Phone, ArrowLeft } from "lucide-react";
import { brands, vehiclesByBrand } from "@/data/vehicles";

export default function KayitPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Preferences

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [chargingPreference, setChargingPreference] = useState("");
  const [chargingFrequency, setChargingFrequency] = useState("");
  const [preferredChargerType, setPreferredChargerType] = useState("");
  const [homeCharging, setHomeCharging] = useState<boolean | null>(null);

  // Derived state for password matching
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const showMatchFeedback = confirmPassword.length > 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Step 1 Validation
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

    if (phone.replace(/\D/g, "").length < 10) {
      setError("Geçerli bir telefon numarası giriniz");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Step 2 Validation
    if (!selectedBrand || !selectedModel || !preferredChargerType || !chargingFrequency || !chargingPreference || homeCharging === null) {
      setError("Lütfen tüm tercihleri seçiniz");
      return;
    }

    setLoading(true);

    try {
      const additionalData: UserRegistrationData = {};
      if (phone) additionalData.phone = phone;

      if (selectedBrand && selectedModel) {
        additionalData.vehicle_brand = selectedBrand;
        additionalData.vehicle_model = selectedModel;

        // Find vehicle data to get year/specs if needed
        const vehicle = vehiclesByBrand[selectedBrand]?.find(v => v.model === selectedModel);
        if (vehicle?.year) {
          additionalData.vehicle_year = parseInt(vehicle.year);
        }
      }

      additionalData.charging_preference = chargingPreference;
      additionalData.charging_frequency = chargingFrequency;
      additionalData.preferred_charger_type = preferredChargerType;
      additionalData.home_charging_available = homeCharging;


      const { error: signUpError } = await signUp(email, password, fullName, additionalData);

      if (signUpError) {
        setError(signUpError);
        setLoading(false);
        return;
      }

      // Redirect to profile for onboarding
      router.push("/profil");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Kayıt başarısız");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <Zap className="w-8 h-8 text-emerald-500" />
            <span className="text-2xl font-bold text-zinc-900">
              Outa<span className="text-emerald-500">Charge</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-4">Hesap oluşturun</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 ? "Kişisel Bilgiler" : "Tercihleriniz"} (Adım {step}/2)
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-4">

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Ad Soyad *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ahmet Yılmaz"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    E-posta *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Telefon *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0532 123 45 67"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Şifre *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Şifre Tekrar *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${showMatchFeedback
                        ? passwordsMatch
                          ? "border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10"
                          : "border-red-500 focus:ring-red-500 focus:border-red-500 ring-1 ring-red-500 bg-red-50/10"
                        : "border-gray-200 focus:ring-emerald-500 focus:border-transparent"
                        }`}
                    />

                    {/* Validation Icon */}
                    {showMatchFeedback && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full ${passwordsMatch ? "bg-emerald-100" : "bg-red-100"
                        }`}>
                        {passwordsMatch ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <X className="w-3 h-3 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Validation Text */}
                  {showMatchFeedback && (
                    <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${passwordsMatch ? "text-emerald-600" : "text-red-500"
                      }`}>
                      {passwordsMatch ? "Şifreler eşleşiyor" : "Şifreler eşleşmiyor"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Vehicle Selection */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Araç Bilgileri *
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setSelectedModel("");
                        }}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                      >
                        <option value="">Marka seçin</option>
                        {brands.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>

                    {selectedBrand && (
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                        >
                          <option value="">Model seçin</option>
                          {vehiclesByBrand[selectedBrand]?.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.model}>
                              {vehicle.model}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preferred Charger Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Tercih Edilen Şarj Tipi *
                  </label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={preferredChargerType}
                      onChange={(e) => setPreferredChargerType(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Seçin</option>
                      <option value="AC">AC (Yavaş Şarj)</option>
                      <option value="DC">DC (Hızlı Şarj)</option>
                      <option value="both">Her İkisi</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>

                {/* Charging Frequency */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Şarj Sıklığı *
                  </label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={chargingFrequency}
                      onChange={(e) => setChargingFrequency(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Seçin</option>
                      <option value="daily">Günlük</option>
                      <option value="weekly">Haftalık</option>
                      <option value="biweekly">İki Haftada Bir</option>
                      <option value="monthly">Aylık</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>

                {/* Charging Preference */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Şarj Tercihi *
                  </label>
                  <div className="relative">
                    <Plug className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={chargingPreference}
                      onChange={(e) => setChargingPreference(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Tercih seçin</option>
                      <option value="price">En Ucuz</option>
                      <option value="speed">En Hızlı</option>
                      <option value="distance">En Yakın</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>

                {/* Home Charging */}
                <div>
                  <label className="block text-sm font-medium text-zinc-900 mb-2">
                    Evde şarj imkanınız var mı? *
                  </label>
                  <div className="flex gap-4">
                    <label className={`flex-1 relative cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-colors ${homeCharging === true ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                      <input
                        type="radio"
                        name="homeCharging"
                        checked={homeCharging === true}
                        onChange={() => setHomeCharging(true)}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-gray-300"
                      />
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-zinc-900">Evet</span>
                      </div>
                    </label>
                    <label className={`flex-1 relative cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-colors ${homeCharging === false ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                      <input
                        type="radio"
                        name="homeCharging"
                        checked={homeCharging === false}
                        onChange={() => setHomeCharging(false)}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-zinc-900">Hayır</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-6 py-3 bg-white text-zinc-900 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Geri
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-black text-white rounded-full font-medium hover:bg-black/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    İşleniyor...
                  </>
                ) : step === 1 ? (
                  <>
                    Devam Et
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Üye Ol
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Zaten hesabınız var mı?{" "}
              <Link href="/giris" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Giriş yapın
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
