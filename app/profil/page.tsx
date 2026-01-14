"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import HeaderWhite from "../components/HeaderWhite";
import {
  User, Mail, Phone, MapPin, Car, Zap, Bell, Save, Loader2, X, ChevronRight, CarFront,
  Shield, Smartphone, Activity
} from "lucide-react";
import Link from "next/link";
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
      <div className="min-h-screen bg-gray-50 dark:bg-transparent flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const availableModels = form.vehicleBrand
    ? vehicles.filter(v => v.brand === form.vehicleBrand)
    : [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
      <HeaderWhite />

      {/* Cinematic Hero Section - Identity & Preferences */}
      <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/images/profile-hero.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
        </div>

        <div className="container max-w-6xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
              <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Identity & Preferences</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
              Profile / <br />
              <span className="font-medium">Directives.</span>
            </h1>
            <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
              Manage your technical profile, vehicle configurations, and infrastructure communication preferences.
            </p>

            {/* Integrated Stats - Technical Specification Style */}
            <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums uppercase">
                  {form.vehicleBrand || "None"}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  ACTIVE CHASSIS
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums uppercase">
                  {form.notifyPriceChanges || form.notifyNewStations ? "Active" : "Silent"}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  COMMS STATUS
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {form.city || "N/A"}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  OPERATIONAL HUB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-6 pb-32 relative z-20">
        {/* Toast */}
        {toast && (
          <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-right duration-500">
            <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}>
              <span className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</span>
              <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="pt-24 space-y-24">
          {/* Kişisel Bilgiler */}
          <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-12 group transition-all">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase mb-4 block">Archive</span>
                <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Personal Identity.</h3>
              </div>
              <User className="w-6 h-6 text-zinc-400 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">FULL NAME ARCHIVE</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                />
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">COMMUNICATION ENDPOINT</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-white/50 dark:bg-zinc-900/20 border border-zinc-50/50 dark:border-white/[0.005] text-zinc-400 dark:text-zinc-600 rounded-2xl px-6 py-4 cursor-not-allowed font-light"
                />
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">TELEMETRY MOBILE</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0532 123 45 67"
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                />
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">OPERATIONAL HUB</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="İstanbul"
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                />
              </div>
            </div>
          </div>

          {/* Araç Bilgileri */}
          <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-12 group transition-all">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase mb-4 block">Architecture</span>
                <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Active Chassis.</h3>
              </div>
              <Car className="w-6 h-6 text-zinc-400 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">MANUFACTURER IDENTITY</label>
                <select
                  value={form.vehicleBrand}
                  onChange={(e) => {
                    setVehicleTouched(true);
                    setField("vehicleBrand", e.target.value);
                    setField("vehicleModel", "");
                  }}
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light appearance-none"
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">
                  MODEL DESIGNATION {form.vehicleBrand && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.vehicleModel}
                  onChange={(e) => {
                    setVehicleTouched(true);
                    setField("vehicleModel", e.target.value);
                  }}
                  disabled={!form.vehicleBrand}
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light appearance-none disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <option value="">Select Model</option>
                  {availableModels.map(v => (
                    <option key={v.id} value={v.model}>{v.model} ({v.range} km)</option>
                  ))}
                </select>
                {vehicleTouched && form.vehicleBrand && !form.vehicleModel && (
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-2 ml-1">Model required for selected brand</p>
                )}
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">VINTAGE SPEC</label>
                <input
                  type="number"
                  value={form.vehicleYear || ""}
                  onChange={(e) => setField("vehicleYear", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="2024"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                />
              </div>
              <div className="space-y-4">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">OPERATIONAL BANDWIDTH (KM/MO)</label>
                <input
                  type="number"
                  value={form.monthlyKm || ""}
                  onChange={(e) => setField("monthlyKm", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1500"
                  min="0"
                  max="20000"
                  className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                />
              </div>
            </div>
          </div>

          {/* Araçlarım Linki */}
          <Link
            href="/profil/araclarim"
            className="block bg-zinc-900 dark:bg-white rounded-[2.5rem] p-12 hover:scale-[1.01] active:scale-[0.99] transition-all group shadow-2xl shadow-zinc-900/20 dark:shadow-white/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="w-16 h-16 bg-white/10 dark:bg-black/5 rounded-[1.5rem] flex items-center justify-center">
                  <CarFront className="w-8 h-8 text-white dark:text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-light tracking-tight text-white dark:text-black">My Fleet Archive.</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-light mt-1">Manage multiple units and community access.</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 text-zinc-500 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Şarj Tercihleri */}
          <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-12 group transition-all">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase mb-4 block">Protocols</span>
                <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Directive Logic.</h3>
              </div>
              <Zap className="w-6 h-6 text-zinc-400 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-12">
              <div className="grid md:grid-cols-3 gap-12">
                <div className="space-y-4">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">TERMINAL CLASS</label>
                  <select
                    value={form.preferredChargerType}
                    onChange={(e) => setField("preferredChargerType", e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light appearance-none"
                  >
                    <option value="">Select Protocol</option>
                    <option value="AC">AC (Sustained)</option>
                    <option value="DC">DC (High-Priority)</option>
                    <option value="both">Hybrid Load</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">LOAD FREQUENCY</label>
                  <select
                    value={form.chargingFrequency}
                    onChange={(e) => setField("chargingFrequency", e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light appearance-none"
                  >
                    <option value="">Select Cycle</option>
                    <option value="daily">Daily Loop</option>
                    <option value="weekly">Weekly Check</option>
                    <option value="biweekly">Bi-Weekly Sync</option>
                    <option value="monthly">Monthly Audit</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">SELECTION PRIORITY</label>
                  <select
                    value={form.chargingPreference}
                    onChange={(e) => setField("chargingPreference", e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light appearance-none"
                  >
                    <option value="">Select Logic</option>
                    <option value="price">Cost Optimization</option>
                    <option value="speed">Throughput Maximization</option>
                    <option value="distance">Proximity Proximity</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-8 bg-white dark:bg-zinc-950/40 rounded-3xl border border-zinc-50 dark:border-white/[0.01] transition-all">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">RESIDENTIAL HUB ACCESS</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-light">Hardware presence in domestic sector</span>
                </div>
                <button
                  type="button"
                  onClick={() => setField("homeCharging", !form.homeCharging)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${form.homeCharging ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-md ${form.homeCharging ? "translate-x-8" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Bildirimler */}
          <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-12 group transition-all">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase mb-4 block">Telemetry</span>
                <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Status Comms.</h3>
              </div>
              <Bell className="w-6 h-6 text-zinc-400 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Price Delta Signals", sub: "Market fluctuation alerts", key: "notifyPriceChanges" },
                { label: "Infrastructural Expand", sub: "New terminal detection", key: "notifyNewStations" },
                { label: "Direct Marketing Load", sub: "Optimization offers", key: "marketingConsent" }
              ].map((item) => (
                <div key={item.key} className="flex flex-col gap-6 p-8 rounded-3xl bg-white dark:bg-zinc-950/40 border border-zinc-50 dark:border-white/[0.01] transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">{item.label}</span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-light">{item.sub}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField(item.key as any, !((form as any)[item.key]))}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${(form as any)[item.key] ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-md ${(form as any)[item.key] ? "translate-x-8" : "translate-x-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-12">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isDirty ? "COMMIT DIRECTIVES" : "NO DELTA DETECTED"}
                </>
              )}
            </button>
          </div>

          <div className="mt-48 flex flex-col items-center">
            <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-900" />
            <p className="text-zinc-100 dark:text-zinc-900/10 text-[10vw] font-black leading-none select-none tracking-tighter mt-12">
              IDENTITY
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>

  );
}