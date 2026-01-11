"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Leaf, Zap, TrendingUp, Calendar, Clock, DollarSign,
  Car, Loader2, Plus, ChevronDown, ChevronUp, Trash2, BarChart3,
  Droplets, Wind, TreePine, Factory
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import HeaderWhite from "../components/HeaderWhite";

interface ChargingRecord {
  id: string;
  station_name: string;
  station_operator: string;
  energy_kwh: number;
  cost: number;
  duration_minutes: number;
  started_at: string;
}

interface Stats {
  totalEnergy: number;
  totalCost: number;
  totalSessions: number;
  totalDuration: number;
  co2Saved: number;
  treesEquivalent: number;
  fuelSaved: number;
  moneySavedVsFuel: number;
}

export default function IstatistiklerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [history, setHistory] = useState<ChargingRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [formData, setFormData] = useState({
    stationName: "",
    stationOperator: "",
    energyKwh: "",
    cost: "",
    durationMinutes: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/giris");
    }
  }, [authLoading, user, router]);

  const fetchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("charging_history")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (!error && data) {
        setHistory(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: ChargingRecord[]) => {
    const totalEnergy = records.reduce((sum, r) => sum + Number(r.energy_kwh), 0);
    const totalCost = records.reduce((sum, r) => sum + Number(r.cost || 0), 0);
    const totalSessions = records.length;
    const totalDuration = records.reduce((sum, r) => sum + Number(r.duration_minutes || 0), 0);

    // CO2 calculations
    // Average petrol car: 120g CO2/km, EV: ~50g CO2/km (including electricity production)
    // Average EV consumption: 18 kWh/100km
    const kmDriven = (totalEnergy / 18) * 100;
    const co2Petrol = kmDriven * 120; // grams
    const co2EV = kmDriven * 50; // grams (Turkey electricity mix)
    const co2Saved = (co2Petrol - co2EV) / 1000; // kg

    // 1 tree absorbs ~22kg CO2 per year
    const treesEquivalent = co2Saved / 22;

    // Fuel savings
    // Average petrol consumption: 7L/100km, petrol price: ~43 TL/L
    const fuelLiters = (kmDriven / 100) * 7;
    const fuelSaved = fuelLiters;
    const fuelCost = fuelLiters * 43;
    const moneySavedVsFuel = fuelCost - totalCost;

    setStats({
      totalEnergy: Math.round(totalEnergy * 10) / 10,
      totalCost: Math.round(totalCost),
      totalSessions,
      totalDuration,
      co2Saved: Math.round(co2Saved * 10) / 10,
      treesEquivalent: Math.round(treesEquivalent * 10) / 10,
      fuelSaved: Math.round(fuelSaved * 10) / 10,
      moneySavedVsFuel: Math.round(moneySavedVsFuel),
    });
  };

  const handleAddRecord = async () => {
    if (!user || !formData.stationName || !formData.energyKwh) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("charging_history").insert({
        user_id: user.id,
        station_id: 0,
        station_name: formData.stationName,
        station_operator: formData.stationOperator || null,
        energy_kwh: parseFloat(formData.energyKwh),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        started_at: new Date(formData.date).toISOString(),
      });

      if (!error) {
        setFormData({
          stationName: "",
          stationOperator: "",
          energyKwh: "",
          cost: "",
          durationMinutes: "",
          date: new Date().toISOString().split("T")[0],
        });
        setShowAddForm(false);
        fetchHistory();
      }
    } catch (err) {
      console.error("Add record error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecord = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from("charging_history")
        .delete()
        .eq("id", id);

      if (!error) {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        calculateStats(newHistory);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  // Group history by month
  const groupedHistory = history.reduce((acc, record) => {
    const date = new Date(record.started_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

    if (!acc[monthKey]) {
      acc[monthKey] = { label: monthLabel, records: [] };
    }
    acc[monthKey].records.push(record);
    return acc;
  }, {} as Record<string, { label: string; records: ChargingRecord[] }>);

  const formatDuration = (minutes: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dk`;
    return `${hours} sa ${mins} dk`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent transition-colors">
      <HeaderWhite />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-emerald-400" />
                İstatistiklerim
              </h1>
              <p className="text-gray-500 dark:text-zinc-400 text-sm">Şarj geçmişiniz ve çevre katkınız</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Şarj Kaydı Ekle
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* CO2 Savings Hero - Premium Dark Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-950 to-black rounded-3xl p-8 shadow-2xl border border-emerald-500/20">
              {/* Background Glow Effects */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-900/40">
                      <Leaf className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-white text-2xl font-bold tracking-tight">Çevre Katkınız</h2>
                      <p className="text-emerald-200/80 font-medium">Elektrikli araç kullanarak gezegenimizi koruyorsunuz</p>
                    </div>
                  </div>

                  {/* Total Savings Badge */}
                  {stats && stats.totalSessions > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4" />
                      <span>{stats.totalSessions} Şarj Oturumu</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CO2 Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <Factory className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">CO₂ Tasarrufu</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tighter">{stats?.co2Saved || 0}</span>
                      <span className="text-sm font-medium text-emerald-200/60 uppercase">kg</span>
                    </div>
                  </div>

                  {/* Trees Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <TreePine className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Ağaç Eşdeğeri</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tighter">{stats?.treesEquivalent || 0}</span>
                      <span className="text-sm font-medium text-emerald-200/60 uppercase">adet</span>
                    </div>
                  </div>

                  {/* Fuel Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <Droplets className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Yatık Tasarrufu</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tighter">{stats?.fuelSaved || 0}</span>
                      <span className="text-sm font-medium text-emerald-200/60 uppercase">litre</span>
                    </div>
                  </div>

                  {/* Money Card */}
                  <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 hover:bg-emerald-500/20 transition-colors group shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center gap-3 mb-3 text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Net Kazanç</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tighter">₺{stats?.moneySavedVsFuel || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-zinc-400">
                  <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <Zap className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <span className="text-sm font-medium">Toplam Enerji</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{stats?.totalEnergy || 0} <span className="text-base text-gray-400 dark:text-zinc-500 font-normal">kWh</span></div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-zinc-400">
                  <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <DollarSign className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <span className="text-sm font-medium">Toplam Masraf</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">₺{stats?.totalCost || 0}</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-zinc-400">
                  <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <Calendar className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <span className="text-sm font-medium">Şarj Sayısı</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{stats?.totalSessions || 0} <span className="text-base text-gray-400 dark:text-zinc-500 font-normal">kez</span></div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-zinc-400">
                  <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                    <Clock className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <span className="text-sm font-medium">Toplam Süre</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{formatDuration(stats?.totalDuration || 0)}</div>
              </div>
            </div>

            {/* Dynamic Pricing Info - Modern Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-bold text-xl flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                    Dinamik Fiyatlandırma
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1.5">Zaman dilimlerine göre konut elektrik maliyetleri</p>
                </div>
                <div className="inline-flex items-center px-4 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  TEDAŞ Konut Tarifesi
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Night - Cheap */}
                <div className="relative group overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-6 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">Gece</span>
                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider">En Ucuz</span>
                  </div>
                  <div className="text-emerald-900/60 dark:text-zinc-400 text-sm font-medium mb-4">22:00 - 06:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">2.10</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-500 font-bold">₺/kWh</span>
                  </div>
                </div>

                {/* Day - Normal */}
                <div className="relative group overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-6 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-blue-700 dark:text-blue-400 font-bold text-lg">Gündüz</span>
                    <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full uppercase tracking-wider">Normal</span>
                  </div>
                  <div className="text-blue-900/60 dark:text-zinc-400 text-sm font-medium mb-4">06:00 - 17:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">4.20</span>
                    <span className="text-sm text-blue-600 dark:text-blue-500 font-bold">₺/kWh</span>
                  </div>
                </div>

                {/* Peak - Expensive */}
                <div className="relative group overflow-hidden rounded-2xl border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-6 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-16 h-16 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-red-700 dark:text-red-400 font-bold text-lg">Puant</span>
                    <span className="text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full uppercase tracking-wider">Pahalı</span>
                  </div>
                  <div className="text-red-900/60 dark:text-zinc-400 text-sm font-medium mb-4">17:00 - 22:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-red-700 dark:text-red-400">6.50</span>
                    <span className="text-sm text-red-600 dark:text-red-500 font-bold">₺/kWh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charging History */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-zinc-900 dark:text-white font-bold text-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                  </div>
                  Şarj Geçmişi
                </h3>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-zinc-950/50 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                  <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                    <Zap className="w-10 h-10 text-gray-300 dark:text-zinc-700" />
                  </div>
                  <h4 className="text-zinc-900 dark:text-white font-bold text-lg mb-2">Henüz kayıt bulunmuyor</h4>
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mb-8 max-w-xs mx-auto">Elektrikli aracınızın şarj verilerini buraya ekleyerek tasarrufunuzu izleyin.</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    İlk Kaydını Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedHistory).map(([monthKey, { label, records }]) => (
                    <div key={monthKey} className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                      <button
                        onClick={() => setExpandedMonth(expandedMonth === monthKey ? null : monthKey)}
                        className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-900 dark:text-white font-bold text-lg">{label}</span>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            {records.length} Oturum
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden sm:flex flex-col items-end">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                              {records.reduce((sum, r) => sum + Number(r.energy_kwh), 0).toFixed(1)} kWh
                            </span>
                            <span className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Aylık Toplam</span>
                          </div>
                          <div className="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full transition-transform duration-300">
                            {expandedMonth === monthKey ? (
                              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {expandedMonth === monthKey && (
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800 bg-gray-50/30 dark:bg-zinc-950/20">
                          {records.map((record) => (
                            <div key={record.id} className="p-6 flex items-center justify-between hover:bg-white dark:hover:bg-zinc-800/40 transition-all group">
                              <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100 dark:border-zinc-700 text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                                  <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="text-zinc-900 dark:text-white font-bold text-lg">{record.station_name}</div>
                                  <div className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                    <span className="font-bold text-zinc-600 dark:text-zinc-300">{record.station_operator || "Özel / Ev"}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                                    <span>{new Date(record.started_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-10">
                                <div className="text-right">
                                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{record.energy_kwh} kWh</div>
                                  <div className="text-gray-500 dark:text-zinc-400 text-xs font-medium mt-1">
                                    {record.cost ? `₺${record.cost}` : "-- ₺"} • {formatDuration(record.duration_minutes)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteRecord(record.id)}
                                  disabled={deleting === record.id}
                                  className="p-2.5 text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                  title="Kaydı Sil"
                                >
                                  {deleting === record.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-3xl w-full max-w-lg p-8 transform animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Şarj Kaydı Ekle</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronUp className="w-6 h-6 rotate-180" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">İstasyon Adı</label>
                <input
                  type="text"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  placeholder="Örn: ZES Ankara Kızılay"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Operatör</label>
                <input
                  type="text"
                  value={formData.stationOperator}
                  onChange={(e) => setFormData({ ...formData, stationOperator: e.target.value })}
                  placeholder="Örn: ZES, Eşarj, Evim"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Enerji (kWh)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.energyKwh}
                    onChange={(e) => setFormData({ ...formData, energyKwh: e.target.value })}
                    placeholder="25.5"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Ücret (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="450"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Süre (dakika)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="40"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Tarih</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl font-bold transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddRecord}
                  disabled={submitting || !formData.stationName || !formData.energyKwh}
                  className="flex-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kaydı Tamamla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}