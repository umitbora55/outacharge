"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, Mail, Phone, MapPin, Car, Calendar, Zap, Battery, 
  Bell, Tag, Save, ArrowLeft, Edit2, Check, X, Loader2,
  ChevronRight, Shield, LogOut
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { brands, vehiclesByBrand } from "@/data/vehicles";

const cities = [
  "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Eskişehir",
  "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin",
  "Muğla", "Sakarya", "Samsun", "Tekirdağ", "Trabzon"
];

const chargingFrequencies = [
  { value: "daily", label: "Her gün" },
  { value: "weekly", label: "Haftada birkaç kez" },
  { value: "biweekly", label: "Haftada bir" },
  { value: "monthly", label: "Ayda birkaç kez" },
];

const chargerTypes = [
  { value: "ac", label: "AC (Yavaş Şarj)" },
  { value: "dc", label: "DC (Hızlı Şarj)" },
  { value: "both", label: "Her ikisi de" },
];

type EditingSection = "personal" | "vehicle" | "charging" | "notifications" | null;

export default function ProfilPage() {
  const router = useRouter();
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: "",
    monthlyKm: "",
    chargingFrequency: "",
    preferredChargerType: "",
    homeCharging: false,
    notificationsEnabled: false,
    marketingConsent: false,
  });

  // Load user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
        vehicleBrand: user.vehicleBrand || "",
        vehicleModel: user.vehicleModel || "",
        vehicleYear: user.vehicleYear || "",
        monthlyKm: user.monthlyKm?.toString() || "",
        chargingFrequency: user.chargingFrequency || "",
        preferredChargerType: user.preferredChargerType || "",
        homeCharging: user.homeCharging || false,
        notificationsEnabled: user.notificationsEnabled || false,
        marketingConsent: user.marketingConsent || false,
      });
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const result = await updateUser({
      fullName: formData.fullName,
      phone: formData.phone,
      city: formData.city,
      vehicleBrand: formData.vehicleBrand,
      vehicleModel: formData.vehicleModel,
      vehicleYear: formData.vehicleYear,
      monthlyKm: formData.monthlyKm ? parseInt(formData.monthlyKm) : undefined,
      chargingFrequency: formData.chargingFrequency,
      preferredChargerType: formData.preferredChargerType,
      homeCharging: formData.homeCharging,
      notificationsEnabled: formData.notificationsEnabled,
      marketingConsent: formData.marketingConsent,
    });

    setSaving(false);
    
    if (result.success) {
      setEditingSection(null);
      setToast({ show: true, message: "Bilgiler başarıyla güncellendi!", type: "success" });
    } else {
      setToast({ show: true, message: result.error || "Güncelleme başarısız.", type: "error" });
    }
    
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
        vehicleBrand: user.vehicleBrand || "",
        vehicleModel: user.vehicleModel || "",
        vehicleYear: user.vehicleYear || "",
        monthlyKm: user.monthlyKm?.toString() || "",
        chargingFrequency: user.chargingFrequency || "",
        preferredChargerType: user.preferredChargerType || "",
        homeCharging: user.homeCharging || false,
        notificationsEnabled: user.notificationsEnabled || false,
        marketingConsent: user.marketingConsent || false,
      });
    }
    setEditingSection(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section 
  }: { 
    title: string; 
    icon: any; 
    section: EditingSection;
  }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Icon className="w-5 h-5 text-emerald-400" />
        {title}
      </h3>
      {editingSection === section ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            title="İptal"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingSection(section)}
          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition"
          title="Düzenle"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white">Profilim</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Profile Header */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{user.fullName}</h2>
              <p className="text-slate-400">{user.email}</p>
              {user.vehicleBrand && user.vehicleModel && (
                <div className="flex items-center gap-2 mt-2 text-emerald-400">
                  <Car className="w-4 h-4" />
                  <span>{user.vehicleBrand} {user.vehicleModel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <SectionHeader title="Kişisel Bilgiler" icon={User} section="personal" />
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Ad Soyad</label>
              {editingSection === "personal" ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              ) : (
                <p className="text-white">{user.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">E-posta</label>
              <p className="text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                {user.email}
                <span className="text-xs text-slate-500">(değiştirilemez)</span>
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Telefon</label>
              {editingSection === "personal" ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="05XX XXX XX XX"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              ) : (
                <p className="text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  {user.phone || <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Şehir</label>
              {editingSection === "personal" ? (
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Şehir seçin</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {user.city || <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <SectionHeader title="Araç Bilgileri" icon={Car} section="vehicle" />
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Araç Markası</label>
              {editingSection === "vehicle" ? (
                <select
                  name="vehicleBrand"
                  value={formData.vehicleBrand}
                  onChange={(e) => {
                    handleInputChange(e);
                    setFormData((prev) => ({ ...prev, vehicleModel: "" }));
                  }}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Marka seçin</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white">{user.vehicleBrand || <span className="text-slate-500">Belirtilmemiş</span>}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Araç Modeli</label>
              {editingSection === "vehicle" ? (
                <select
                  name="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  disabled={!formData.vehicleBrand}
                >
                  <option value="">Model seçin</option>
                  {formData.vehicleBrand && vehiclesByBrand[formData.vehicleBrand]?.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.model}>{vehicle.model}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white">{user.vehicleModel || <span className="text-slate-500">Belirtilmemiş</span>}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Model Yılı</label>
              {editingSection === "vehicle" ? (
                <select
                  name="vehicleYear"
                  value={formData.vehicleYear}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Yıl seçin</option>
                  {Array.from({ length: 10 }, (_, i) => 2025 - i).map((year) => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {user.vehicleYear || <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Aylık Ortalama KM</label>
              {editingSection === "vehicle" ? (
                <input
                  type="number"
                  name="monthlyKm"
                  value={formData.monthlyKm}
                  onChange={handleInputChange}
                  placeholder="Örn: 1500"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              ) : (
                <p className="text-white">
                  {user.monthlyKm ? `${user.monthlyKm.toLocaleString()} km` : <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Charging Preferences */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <SectionHeader title="Şarj Tercihleri" icon={Zap} section="charging" />
          
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Şarj Sıklığı</label>
              {editingSection === "charging" ? (
                <select
                  name="chargingFrequency"
                  value={formData.chargingFrequency}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Seçin</option>
                  {chargingFrequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white">
                  {chargingFrequencies.find(f => f.value === user.chargingFrequency)?.label || <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Tercih Edilen Şarj Tipi</label>
              {editingSection === "charging" ? (
                <select
                  name="preferredChargerType"
                  value={formData.preferredChargerType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Seçin</option>
                  {chargerTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white flex items-center gap-2">
                  <Battery className="w-4 h-4 text-slate-500" />
                  {chargerTypes.find(t => t.value === user.preferredChargerType)?.label || <span className="text-slate-500">Belirtilmemiş</span>}
                </p>
              )}
            </div>

            <div 
              onClick={() => editingSection === "charging" && setFormData(prev => ({ ...prev, homeCharging: !prev.homeCharging }))}
              className={`flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg ${editingSection === "charging" ? "cursor-pointer hover:bg-slate-700/70" : ""} transition`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                (editingSection === "charging" ? formData.homeCharging : user.homeCharging)
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {(editingSection === "charging" ? formData.homeCharging : user.homeCharging) && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Evde şarj imkanı</div>
                <div className="text-slate-400 text-sm">Evde şarj cihazı veya priz mevcut</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <SectionHeader title="Bildirim Tercihleri" icon={Bell} section="notifications" />
          
          <div className="space-y-3">
            <div 
              onClick={() => editingSection === "notifications" && setFormData(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
              className={`flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg ${editingSection === "notifications" ? "cursor-pointer hover:bg-slate-700/70" : ""} transition`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                (editingSection === "notifications" ? formData.notificationsEnabled : user.notificationsEnabled)
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {(editingSection === "notifications" ? formData.notificationsEnabled : user.notificationsEnabled) && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Bildirimler</div>
                <div className="text-slate-400 text-sm">İstasyon durumları hakkında bildirim al</div>
              </div>
            </div>

            <div 
              onClick={() => editingSection === "notifications" && setFormData(prev => ({ ...prev, marketingConsent: !prev.marketingConsent }))}
              className={`flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg ${editingSection === "notifications" ? "cursor-pointer hover:bg-slate-700/70" : ""} transition`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                (editingSection === "notifications" ? formData.marketingConsent : user.marketingConsent)
                  ? "bg-emerald-500" 
                  : "bg-slate-600 border-2 border-slate-500"
              }`}>
                {(editingSection === "notifications" ? formData.marketingConsent : user.marketingConsent) && <Check className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className="text-white font-medium">Kampanyalar</div>
                <div className="text-slate-400 text-sm">Fırsatlar ve yenilikler hakkında e-posta al</div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Hesap Bilgileri
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-400">Üyelik Tarihi</span>
              <span className="text-white">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR") : "-"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Son Giriş</span>
              <span className="text-white">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }) : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-slate-800 rounded-2xl overflow-hidden mb-6">
          <Link href="/favoriler" className="flex items-center justify-between p-4 hover:bg-slate-700/50 transition border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Tag className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-white font-medium">Favori İstasyonlarım</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <Link href="/harita" className="flex items-center justify-between p-4 hover:bg-slate-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-white font-medium">Haritayı Aç</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Çıkış Yap
        </button>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 transition-all ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-6 h-6 text-white" />
          ) : (
            <X className="w-6 h-6 text-white" />
          )}
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}