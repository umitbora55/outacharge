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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-zinc-900 transition">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              İstatistiklerim
            </h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 rounded-full text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Şarj Ekle
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* CO2 Savings Hero - Premium Dark Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-950 to-black rounded-3xl p-8 shadow-2xl">
              {/* Background Glow Effects */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                      <Leaf className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-white text-2xl font-bold tracking-tight">Çevre Katkınız</h2>
                      <p className="text-emerald-200/80 font-medium">Elektrikli araç kullanarak gezegenimizi koruyorsunuz</p>
                    </div>
                  </div>

                  {/* Total Savings Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-emerald-300 text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>Bu ay %15 daha verimli</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CO2 Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <Factory className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wider">CO₂ Tasarrufu</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{stats?.co2Saved || 0}</span>
                      <span className="text-sm text-emerald-200/60">kg</span>
                    </div>
                  </div>

                  {/* Trees Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <TreePine className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wider">Ağaç Eşdeğeri</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{stats?.treesEquivalent || 0}</span>
                      <span className="text-sm text-emerald-200/60">adet</span>
                    </div>
                  </div>

                  {/* Fuel Card */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-200/70 group-hover:text-emerald-200 transition-colors">
                      <Droplets className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wider">Benzin Tasarrufu</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{stats?.fuelSaved || 0}</span>
                      <span className="text-sm text-emerald-200/60">litre</span>
                    </div>
                  </div>

                  {/* Money Card */}
                  <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 hover:bg-emerald-500/20 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-emerald-300 group-hover:text-emerald-200 transition-colors">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Net Kazanç</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">₺{stats?.moneySavedVsFuel || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Zap className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-sm font-medium">Toplam Enerji</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 mt-2">{stats?.totalEnergy || 0} <span className="text-base text-gray-400 font-normal">kWh</span></div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-sm font-medium">Toplam Harcama</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 mt-2">₺{stats?.totalCost || 0}</div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-sm font-medium">Şarj Sayısı</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 mt-2">{stats?.totalSessions || 0} <span className="text-base text-gray-400 font-normal">kez</span></div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-sm font-medium">Toplam Süre</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 mt-2">{formatDuration(stats?.totalDuration || 0)}</div>
              </div>
            </div>

            {/* Dynamic Pricing Info - Modern Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-zinc-900 font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Dinamik Fiyatlandırma
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Günün saatlerine göre tahmini şarj maliyetleri</p>
                </div>
                <div className="text-xs font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                  TEDAŞ Tarifesi
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Night - Cheap */}
                <div className="relative group overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 hover:border-emerald-200 transition-colors">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-700 font-bold">Gece</span>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">En Ucuz</span>
                  </div>
                  <div className="text-emerald-900/60 text-sm font-medium mb-3">22:00 - 06:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-emerald-700">~2.10</span>
                    <span className="text-sm text-emerald-600 font-medium">₺/kWh</span>
                  </div>
                </div>

                {/* Day - Normal */}
                <div className="relative group overflow-hidden rounded-2xl border border-yellow-100 bg-yellow-50/50 p-5 hover:border-yellow-200 transition-colors">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-yellow-600" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-700 font-bold">Gündüz</span>
                    <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Normal</span>
                  </div>
                  <div className="text-yellow-900/60 text-sm font-medium mb-3">06:00 - 17:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-yellow-700">~4.20</span>
                    <span className="text-sm text-yellow-600 font-medium">₺/kWh</span>
                  </div>
                </div>

                {/* Peak - Expensive */}
                <div className="relative group overflow-hidden rounded-2xl border border-red-100 bg-red-50/50 p-5 hover:border-red-200 transition-colors">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-red-600" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-700 font-bold">Puant</span>
                    <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Pahalı</span>
                  </div>
                  <div className="text-red-900/60 text-sm font-medium mb-3">17:00 - 22:00</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-red-700">~6.50</span>
                    <span className="text-sm text-red-600 font-medium">₺/kWh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charging History */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-zinc-900 font-bold text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Şarj Geçmişi
                </h3>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <Zap className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-zinc-900 font-medium mb-1">Henüz şarj kaydı yok</h4>
                  <p className="text-gray-500 text-sm mb-4">Elektrikli aracınızın şarj kayıtlarını ekleyerek takibini yapın.</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    İlk Kaydını Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedHistory).map(([monthKey, { label, records }]) => (
                    <div key={monthKey} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
                      <button
                        onClick={() => setExpandedMonth(expandedMonth === monthKey ? null : monthKey)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-900 font-bold">{label}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-500">
                            {records.length} şarj
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end mr-2">
                            <span className="text-emerald-600 font-bold text-sm">
                              {records.reduce((sum, r) => sum + Number(r.energy_kwh), 0).toFixed(1)} kWh
                            </span>
                            <span className="text-gray-400 text-xs">Toplam Enerji</span>
                          </div>
                          {expandedMonth === monthKey ? (
                            <div className="p-1 bg-white rounded-full border border-gray-200">
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            </div>
                          ) : (
                            <div className="p-1 bg-white rounded-full border border-gray-200">
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </button>

                      {expandedMonth === monthKey && (
                        <div className="divide-y divide-gray-100 bg-white">
                          {records.map((record) => (
                            <div key={record.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                                  <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-zinc-900 font-bold">{record.station_name}</div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                    <span className="font-medium text-gray-700">{record.station_operator || "Operatör Belirtilmedi"}</span>
                                    <span>•</span>
                                    <span>{new Date(record.started_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-8">
                                <div className="text-right">
                                  <div className="text-emerald-600 font-bold">{record.energy_kwh} kWh</div>
                                  <div className="text-gray-500 text-xs mt-0.5">
                                    {record.cost ? `₺${record.cost}` : "--"} • {formatDuration(record.duration_minutes)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteRecord(record.id)}
                                  disabled={deleting === record.id}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Kaydı Sil"
                                >
                                  {deleting === record.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Şarj Kaydı Ekle</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">İstasyon Adı *</label>
                <input
                  type="text"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  placeholder="Örn: ZES Ankara Kızılay"
                  className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">Operatör</label>
                <input
                  type="text"
                  value={formData.stationOperator}
                  onChange={(e) => setFormData({ ...formData, stationOperator: e.target.value })}
                  placeholder="Örn: ZES, Eşarj, Trugo"
                  className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Enerji (kWh) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.energyKwh}
                    onChange={(e) => setFormData({ ...formData, energyKwh: e.target.value })}
                    placeholder="35.5"
                    className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Ücret (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="420"
                    className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Süre (dakika)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="45"
                    className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-slate-600 text-zinc-900 rounded-full font-medium transition"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddRecord}
                  disabled={submitting || !formData.stationName || !formData.energyKwh}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-zinc-900 rounded-full font-medium transition flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}