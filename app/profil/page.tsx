"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import HeaderWhite from "../components/HeaderWhite";
import {
  User, Mail, Phone, MapPin, Car, Zap, Bell, Save, Loader2, X
} from "lucide-react";
import { vehicles, brands } from "@/data/vehicles";

type ProfileForm = {
  fullName: string;
  phone: string;
  city: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  monthlyKm?: number;
  chargingPreference: string;
  chargingFrequency: string;
  preferredChargerType: string;
  homeCharging: boolean;
  notifyPriceChanges: boolean;
  notifyNewStations: boolean;
  marketingConsent: boolean;
};

// Normalize function for type-safe comparison with correct defaults
const normalize = (key: keyof ProfileForm, val: any) => {
  if (val === undefined || val === null) {
    if (key === "vehicleYear" || key === "monthlyKm") return undefined;
    if (key === "notifyPriceChanges") return true;
    if (key === "notifyNewStations") return true;
    if (key === "homeCharging") return false;
    if (key === "marketingConsent") return false;
    return "";
  }
  return val;
};

export default function ProfilPage() {
  const { user, updateUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [vehicleTouched, setVehicleTouched] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    phone: "",
    city: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: undefined,
    monthlyKm: undefined,
    chargingPreference: "",
    chargingFrequency: "",
    preferredChargerType: "",
    homeCharging: false,
    notifyPriceChanges: true,
    notifyNewStations: true,
    marketingConsent: false,
  });

  // Auth guard - only redirect after loading completes
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/giris");
  }, [user, authLoading, router]);

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || "",
        phone: user.phone || "",
        city: user.city || "",
        vehicleBrand: user.vehicleBrand || "",
        vehicleModel: user.vehicleModel || "",
        vehicleYear: user.vehicleYear,
        monthlyKm: user.monthlyKm,
        chargingPreference: user.chargingPreference || "",
        chargingFrequency: user.chargingFrequency || "",
        preferredChargerType: user.preferredChargerType || "",
        homeCharging: user.homeCharging ?? false,
        notifyPriceChanges: user.notifyPriceChanges ?? true,
        notifyNewStations: user.notifyNewStations ?? true,
        marketingConsent: user.marketingConsent ?? false,
      });
    }
  }, [user]);

  // Toast cleanup
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Form setter helper
  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Stable user snapshot to prevent unnecessary recalculation
  const userSnapshot = useMemo(() => {
    if (!user) return "";
    return JSON.stringify({
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
      city: user.city ?? "",
      vehicleBrand: user.vehicleBrand ?? "",
      vehicleModel: user.vehicleModel ?? "",
      vehicleYear: user.vehicleYear ?? null,
      monthlyKm: user.monthlyKm ?? null,
      chargingPreference: user.chargingPreference ?? "",
      chargingFrequency: user.chargingFrequency ?? "",
      preferredChargerType: user.preferredChargerType ?? "",
      homeCharging: user.homeCharging ?? false,
      notifyPriceChanges: user.notifyPriceChanges ?? true,
      notifyNewStations: user.notifyNewStations ?? true,
      marketingConsent: user.marketingConsent ?? false,
    });
  }, [user]);

  // Parse user snapshot for comparison
  const userData = useMemo(() => {
    if (!userSnapshot) return null;
    return JSON.parse(userSnapshot) as Record<string, any>;
  }, [userSnapshot]);

  // Get only changed fields (normalized comparison) - single source of truth
  const changes = useMemo((): Partial<ProfileForm> => {
    if (!userData) return {};
    const out: Partial<ProfileForm> = {};

    (Object.keys(form) as Array<keyof ProfileForm>).forEach((key) => {
      const currentValue = normalize(key, form[key]);
      const userValue = normalize(key, userData[key]);

      if (currentValue !== userValue) {
        (out as any)[key] = form[key];
      }
    });

    return out;
  }, [form, userData]);

  // Check if form is dirty (using changes as single source of truth)
  const isDirty = useMemo(() => Object.keys(changes).length > 0, [changes]);

  // Validation
  const validate = (): string | null => {
    // Normalize and validate phone
    if (form.phone) {
      const digitsOnly = form.phone.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        return "Telefon numarası en az 10 rakam içermelidir";
      }
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    if (form.vehicleYear && (form.vehicleYear < 2000 || form.vehicleYear > currentYear + 1)) {
      return `Model yılı 2000-${currentYear + 1} arasında olmalı`;
    }

    // Monthly km validation
    if (form.monthlyKm && (form.monthlyKm < 0 || form.monthlyKm > 20000)) {
      return "Aylık km 0-20000 arasında olmalı";
    }

    // Brand/model consistency
    if (form.vehicleBrand && form.vehicleModel) {
      const vehicle = vehicles.find(v => v.brand === form.vehicleBrand && v.model === form.vehicleModel);
      if (!vehicle) {
        return "Seçilen model bu marka için geçerli değil";
      }
    }

    return null;
  };

  const handleSave = async () => {
    // Validation
    const error = validate();
    if (error) {
      setToast({ type: "error", message: error });
      return;
    }

    setSaving(true);

    try {
      if (Object.keys(changes).length === 0) {
        setToast({ type: "success", message: "Değişiklik yok" });
        setSaving(false);
        return;
      }

      // Prepare payload with smart brand/model handling
      const payload = { ...changes };

      // If brand is selected but model is empty, don't save vehicle fields
      // but allow saving other fields (soft validation)
      if (payload.vehicleBrand && !form.vehicleModel) {
        delete payload.vehicleBrand;
        delete payload.vehicleModel;
        setToast({ type: "error", message: "Marka seçtiyseniz model de seçmelisiniz. Araç bilgileri kaydedilmedi." });
        // Continue to save other fields
      }

      // Normalize phone before saving
      if (payload.phone) {
        payload.phone = payload.phone.replace(/\D/g, "");
      }

      // Only update if there are still changes after cleanup
      if (Object.keys(payload).length === 0) {
        setSaving(false);
        return;
      }

      const { error: updateError } = await updateUser(payload);

      if (updateError) {
        setToast({ type: "error", message: updateError });
      } else {
        setToast({ type: "success", message: "Profil güncellendi!" });
      }
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Bir hata oluştu" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const availableModels = form.vehicleBrand
    ? vehicles.filter(v => v.brand === form.vehicleBrand)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWhite />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
            }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Profil Ayarları</h1>
          <p className="text-gray-500">Hesap bilgilerinizi ve tercihlerinizi yönetin</p>
        </div>

        <div className="space-y-6">
          {/* Kişisel Bilgiler */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Kişisel Bilgiler
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Ad Soyad *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">E-posta</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0532 123 45 67"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Şehir</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="İstanbul"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Araç Bilgileri */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-500" />
              Araç Bilgileri
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Marka</label>
                <select
                  value={form.vehicleBrand}
                  onChange={(e) => {
                    setVehicleTouched(true);
                    setField("vehicleBrand", e.target.value);
                    setField("vehicleModel", "");
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Marka seçin</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">
                  Model {form.vehicleBrand && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.vehicleModel}
                  onChange={(e) => {
                    setVehicleTouched(true);
                    setField("vehicleModel", e.target.value);
                  }}
                  disabled={!form.vehicleBrand}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Model seçin</option>
                  {availableModels.map(v => (
                    <option key={v.id} value={v.model}>{v.model} ({v.range} km)</option>
                  ))}
                </select>
                {vehicleTouched && form.vehicleBrand && !form.vehicleModel && (
                  <p className="text-xs text-amber-600 mt-1">Marka seçtiyseniz model de seçmelisiniz</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Model Yılı</label>
                <input
                  type="number"
                  value={form.vehicleYear || ""}
                  onChange={(e) => setField("vehicleYear", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="2024"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Aylık Km</label>
                <input
                  type="number"
                  value={form.monthlyKm || ""}
                  onChange={(e) => setField("monthlyKm", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1500"
                  min="0"
                  max="20000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Şarj Tercihleri */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" />
              Şarj Tercihleri
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Tercih Edilen Şarj Tipi</label>
                <select
                  value={form.preferredChargerType}
                  onChange={(e) => setField("preferredChargerType", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seçin</option>
                  <option value="AC">AC (Yavaş Şarj)</option>
                  <option value="DC">DC (Hızlı Şarj)</option>
                  <option value="both">Her İkisi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Şarj Sıklığı</label>
                <select
                  value={form.chargingFrequency}
                  onChange={(e) => setField("chargingFrequency", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seçin</option>
                  <option value="daily">Günlük</option>
                  <option value="weekly">Haftalık</option>
                  <option value="biweekly">İki Haftada Bir</option>
                  <option value="monthly">Aylık</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">Şarj Tercihi</label>
                <select
                  value={form.chargingPreference}
                  onChange={(e) => setField("chargingPreference", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seçin</option>
                  <option value="price">En Ucuz</option>
                  <option value="speed">En Hızlı</option>
                  <option value="distance">En Yakın</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Evde Şarj İmkanı</p>
                  <p className="text-xs text-gray-500 mt-1">Evde şarj cihazınız var mı?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("homeCharging", !form.homeCharging)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.homeCharging ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.homeCharging ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Bildirimler */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              Bildirimler
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Fiyat Değişiklikleri</p>
                  <p className="text-xs text-gray-500 mt-1">Şarj fiyatları değiştiğinde bildir</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("notifyPriceChanges", !form.notifyPriceChanges)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.notifyPriceChanges ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.notifyPriceChanges ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Yeni İstasyonlar</p>
                  <p className="text-xs text-gray-500 mt-1">Yakınınızda yeni istasyon açıldığında bildir</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("notifyNewStations", !form.notifyNewStations)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.notifyNewStations ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.notifyNewStations ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Kampanyalar</p>
                  <p className="text-xs text-gray-500 mt-1">İndirim ve fırsatlardan haberdar ol</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("marketingConsent", !form.marketingConsent)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.marketingConsent ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.marketingConsent ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="w-full py-4 bg-black text-white rounded-full font-medium hover:bg-black/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isDirty ? "Değişiklikleri Kaydet" : "Değişiklik Yok"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
