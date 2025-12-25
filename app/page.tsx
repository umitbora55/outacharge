"use client";

import { useAuth } from "@/lib/auth";
import UserMenu from "./components/UserMenu";
import { useState, useEffect } from "react";
// Calculator eklendi
import { MapPin, Battery, Bell, Shield, ChevronRight, Check, Eye, EyeOff, Car, Loader2, Star, TrendingUp, X, Calculator } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { vehicles, vehiclesByBrand, brands } from "@/data/vehicles";
import FluxLogo from "./components/FluxLogo";

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState(1); // 1: logo appears, 2: electric flows, 3: text appears
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login, loading: authLoading } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  // Intro animation phases
  useEffect(() => {
    const phase2 = setTimeout(() => setIntroPhase(2), 800);
    const phase3 = setTimeout(() => setIntroPhase(3), 1600);
    const hideIntro = setTimeout(() => setShowIntro(false), 3000);
    
    return () => {
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(hideIntro);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    city: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: "",
    chargingFrequency: "",
    homeCharging: false,
    monthlyKm: "",
    preferredChargerType: "",
    notificationsEnabled: true,
    marketingConsent: false,
  });

  const cities = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep",
    "Mersin", "Kayseri", "Eskişehir", "Samsun", "Denizli", "Şanlıurfa", "Trabzon",
    "Kocaeli", "Tekirdağ", "Muğla", "Aydın", "Balıkesir", "Manisa", "Sakarya", "Diğer"
  ];

  const chargingFrequencies = [
    { value: "daily", label: "Her gün" },
    { value: "weekly", label: "Haftada birkaç kez" },
    { value: "biweekly", label: "Haftada bir" },
    { value: "monthly", label: "Ayda birkaç kez" },
    { value: "rarely", label: "Nadiren" },
  ];

  const chargerTypes = [
    { value: "ac", label: "AC (Yavaş şarj)" },
    { value: "dc", label: "DC (Hızlı şarj)" },
    { value: "both", label: "Her ikisi de" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      setToast({ show: true, message: "Lütfen tüm zorunlu alanları doldurun.", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      return false;
    }
    if (formData.password.length < 6) {
      setToast({ show: true, message: "Şifre en az 6 karakter olmalıdır.", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setToast({ show: true, message: "Şifreler eşleşmiyor.", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("users").insert([
        {
          email: formData.email,
          password_hash: passwordHash,
          full_name: formData.fullName,
          phone: formData.phone || null,
          city: formData.city || null,
          vehicle_brand: formData.vehicleBrand || null,
          vehicle_model: formData.vehicleModel || null,
          vehicle_year: formData.vehicleYear || null,
          charging_frequency: formData.chargingFrequency || null,
          home_charging: formData.homeCharging,
          monthly_km: formData.monthlyKm ? parseInt(formData.monthlyKm) : null,
          preferred_charger_type: formData.preferredChargerType || null,
          notifications_enabled: formData.notificationsEnabled,
          marketing_consent: formData.marketingConsent,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          setToast({ show: true, message: "Bu e-posta adresi zaten kayıtlı.", type: "error" });
        } else {
          setToast({ show: true, message: "Kayıt sırasında bir hata oluştu.", type: "error" });
        }
        console.error(error);
      } else {
        setToast({ show: true, message: "Kayıt başarılı! Hoş geldiniz.", type: "success" });
        setShowRegisterModal(false);
        setRegisterStep(1);
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          phone: "",
          city: "",
          vehicleBrand: "",
          vehicleModel: "",
          vehicleYear: "",
          chargingFrequency: "",
          homeCharging: false,
          monthlyKm: "",
          preferredChargerType: "",
          notificationsEnabled: true,
          marketingConsent: false,
        });
      }
    } catch (err) {
      setToast({ show: true, message: "Bir hata oluştu.", type: "error" });
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  // GÜNCELLENEN BÖLÜM: Features listesi
  const features = [
    { icon: MapPin, title: "500+ Şarj İstasyonu", description: "Türkiye genelinde tüm şarj istasyonlarını haritada görün" },
    { icon: Car, title: "Araç Uyumluluğu", description: "Aracınıza uygun istasyonları otomatik filtreleyin" },
    { icon: Battery, title: "Gerçek Zamanlı Durum", description: "İstasyonların anlık durumunu öğrenin" },
    { icon: Bell, title: "Bildirimler", description: "Favori istasyonlarınız müsait olduğunda haberdar olun" },
    { icon: Calculator, title: "Şarj Hesaplayıcı", description: "14 operatörün fiyatlarını karşılaştırın", link: "/hesaplayici" }, // Güncellendi
    { icon: Shield, title: "Güvenilir Bilgi", description: "Topluluk tarafından doğrulanmış veriler" },
  ];

  const stats = [
    { value: "500+", label: "Şarj İstasyonu" },
    { value: "35+", label: "Desteklenen Araç" },
    { value: "81", label: "İl Kapsamı" },
    { value: "7/24", label: "Erişim" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Intro Animation */}
      {showIntro && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center overflow-hidden">
          {/* Background electric grid effect */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(52, 211, 153, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(52, 211, 153, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="relative flex flex-col items-center">
            {/* Flux Capacitor Logo */}
            <div className={`transition-all duration-700 ${introPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <FluxLogo size={120} animated={introPhase >= 2} />
            </div>

            {/* Brand Text */}
            <div className={`mt-8 overflow-hidden transition-all duration-700 ${introPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h1 className="text-5xl font-bold">
                <span className="text-white">Outa</span>
                <span className="text-emerald-400"> Charge</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className={`text-slate-400 text-center mt-4 transition-all duration-500 delay-300 ${introPhase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
              Geleceğin Şarj Deneyimi
            </p>

            {/* Loading Bar */}
            <div className={`mt-8 w-48 h-1 bg-slate-800 rounded-full overflow-hidden transition-opacity duration-500 ${introPhase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 animate-loading-bar" />
            </div>
          </div>

          {/* Electric sparks in background */}
          {introPhase >= 2 && (
            <>
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-300" />
              <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping delay-500" />
              <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-ping delay-700" />
            </>
          )}
        </div>
      )}

{/* Header */}
<header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <FluxLogo size={40} animated={false} />
      <span className="text-2xl font-bold text-white">
        Outa<span className="text-emerald-400">Charge</span>
      </span>
    </div>
    <div className="flex items-center gap-3">
      {user ? (
        <UserMenu />
      ) : (
        <>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-2 text-white hover:text-emerald-400 transition text-sm font-medium"
          >
            Giriş Yap
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium transition"
          >
            Üye Ol
          </button>
        </>
      )}
    </div>
  </div>
</header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
            <Star className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Türkiye&apos;nin En Kapsamlı EV Şarj Uygulaması</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Elektrikli Aracınız İçin
            <br />
            <span className="text-emerald-400">En Yakın Şarj İstasyonu</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            500+ şarj istasyonu, gerçek zamanlı durum bilgisi ve aracınıza özel uyumluluk skoru ile şarj deneyiminizi kolaylaştırın.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/harita"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-lg font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <MapPin className="w-5 h-5" />
              Haritayı Keşfet
              <ChevronRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-lg font-semibold transition"
            >
              Ücretsiz Üye Ol
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Neden OutaCharge?</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Elektrikli araç sahipleri için tasarlanmış, kullanımı kolay ve güvenilir platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/30 transition group"
              >
                <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition">
                  <feature.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Hemen Üye Olun</h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              Ücretsiz üyelik ile tüm özelliklere erişin, favori istasyonlarınızı kaydedin ve bildirim alın.
            </p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-8 py-4 bg-white text-emerald-600 rounded-full text-lg font-semibold hover:bg-emerald-50 transition shadow-lg"
            >
              Ücretsiz Başla
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <FluxLogo size={32} animated={false} />
              <span className="text-xl font-bold text-white">
                Outa<span className="text-emerald-400">Charge</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <a href="#" className="hover:text-white transition">Hakkımızda</a>
              <a href="#" className="hover:text-white transition">Gizlilik</a>
              <a href="#" className="hover:text-white transition">Kullanım Şartları</a>
              <a href="#" className="hover:text-white transition">İletişim</a>
            </div>
            <div className="text-slate-500 text-sm">© 2025 OutaCharge. Tüm hakları saklıdır.</div>
          </div>
        </div>
      </footer>

{/* Register Modal */}
{showRegisterModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Üye Ol</h3>
          <button onClick={() => { setShowRegisterModal(false); setRegisterStep(1); }} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center">
          {[
            { step: 1, label: "Hesap" },
            { step: 2, label: "Araç" },
            { step: 3, label: "Tercihler" }
          ].map((item, index) => (
            <div key={item.step} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  registerStep >= item.step 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-700 text-slate-400"
                }`}>
                  {registerStep > item.step ? <Check className="w-5 h-5" /> : item.step}
                </div>
                <span className={`mt-2 text-xs ${
                  registerStep >= item.step ? "text-emerald-400" : "text-slate-400"
                }`}>
                  {item.label}
                </span>
              </div>
              {index < 2 && (
                <div className={`h-1 flex-1 -mt-6 mx-1 rounded transition-all ${
                  registerStep > item.step ? "bg-emerald-500" : "bg-slate-700"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {registerStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Ad Soyad <span className="text-red-400">*</span></label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Adınız Soyadınız" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">E-posta <span className="text-red-400">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="ornek@email.com" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Şifre <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="En az 6 karakter" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Şifre Tekrar <span className="text-red-400">*</span></label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Şifrenizi tekrar girin" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Telefon</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="05XX XXX XX XX" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Şehir</label>
              <select name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Şehir seçin</option>
                {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
          </div>
        )}

        {registerStep === 2 && (
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-slate-300 text-sm">Araç bilgilerinizi girerek size özel şarj istasyonu önerileri alabilirsiniz.</p>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Araç Markası</label>
              <select name="vehicleBrand" value={formData.vehicleBrand} onChange={(e) => { handleInputChange(e); setFormData((prev) => ({ ...prev, vehicleModel: "" })); }} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Marka seçin</option>
                {brands.map((brand) => (<option key={brand} value={brand}>{brand}</option>))}
              </select>
            </div>
            {formData.vehicleBrand && (
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Araç Modeli</label>
                <select name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="">Model seçin</option>
                  {vehiclesByBrand[formData.vehicleBrand]?.map((vehicle) => (<option key={vehicle.id} value={vehicle.model}>{vehicle.model}</option>))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Model Yılı</label>
              <select name="vehicleYear" value={formData.vehicleYear} onChange={handleInputChange} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Yıl seçin</option>
                {years.map((year) => (<option key={year} value={year}>{year}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Aylık Ortalama KM</label>
              <input type="number" name="monthlyKm" value={formData.monthlyKm} onChange={handleInputChange} placeholder="Örn: 1500" className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
        )}

        {registerStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Şarj Sıklığı</label>
              <select name="chargingFrequency" value={formData.chargingFrequency} onChange={handleInputChange} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Seçin</option>
                {chargingFrequencies.map((freq) => (<option key={freq.value} value={freq.value}>{freq.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Tercih Ettiğiniz Şarj Tipi</label>
              <select name="preferredChargerType" value={formData.preferredChargerType} onChange={handleInputChange} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Seçin</option>
                {chargerTypes.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
              </select>
            </div>
            
            {/* Custom Checkboxes */}
            <div 
              onClick={() => setFormData(prev => ({ ...prev, homeCharging: !prev.homeCharging }))}
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition"
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                formData.homeCharging 
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {formData.homeCharging && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Evde şarj imkanım var</div>
                <div className="text-slate-400 text-sm">Evde şarj cihazınız veya priziniz var mı?</div>
              </div>
            </div>

            <div 
              onClick={() => setFormData(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition"
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                formData.notificationsEnabled 
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {formData.notificationsEnabled && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Bildirimleri aç</div>
                <div className="text-slate-400 text-sm">İstasyon durumları hakkında bildirim alın</div>
              </div>
            </div>

            <div 
              onClick={() => setFormData(prev => ({ ...prev, marketingConsent: !prev.marketingConsent }))}
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 transition"
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                formData.marketingConsent 
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {formData.marketingConsent && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Kampanyalardan haberdar ol</div>
                <div className="text-slate-400 text-sm">Fırsatlar ve yenilikler hakkında e-posta alın</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-700 flex gap-3">
        {registerStep > 1 && (
          <button onClick={() => setRegisterStep(registerStep - 1)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-medium transition">
            Geri
          </button>
        )}
        {registerStep < 3 ? (
          <button onClick={() => { if (registerStep === 1 && !validateStep1()) return; setRegisterStep(registerStep + 1); }} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition">
            Devam Et
          </button>
        ) : (
          <button onClick={handleRegister} disabled={loading} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-full font-medium transition flex items-center justify-center gap-2">
            {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Kaydediliyor...</>) : "Üyeliği Tamamla"}
          </button>
        )}
      </div>
    </div>
  </div>
)}

{/* Login Modal */}
{showLoginModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Giriş Yap</h3>
        <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">E-posta</label>
          <input 
            type="email" 
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="ornek@email.com" 
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" 
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Şifre</label>
          <input 
            type="password" 
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Şifreniz" 
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400" 
          />
        </div>
        <button 
          onClick={async () => {
            setLoginLoading(true);
            const result = await login(loginEmail, loginPassword);
            setLoginLoading(false);
            if (result.success) {
              setShowLoginModal(false);
              setLoginEmail("");
              setLoginPassword("");
              setToast({ show: true, message: "Giriş başarılı! Hoş geldiniz.", type: "success" });
            } else {
              setToast({ show: true, message: result.error || "Giriş başarısız.", type: "error" });
            }
            setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
          }}
          disabled={loginLoading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-full font-medium transition flex items-center justify-center gap-2"
        >
          {loginLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Giriş yapılıyor...</> : "Giriş Yap"}
        </button>
        <p className="text-center text-slate-400 text-sm">
          Hesabınız yok mu?{" "}
          <button onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }} className="text-emerald-400 hover:text-emerald-300">
            Üye olun
          </button>
        </p>
      </div>
    </div>
  </div>
)}

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.type === "success" ? <Check className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white" />}
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}