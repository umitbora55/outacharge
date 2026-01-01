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
      router.push("/");
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              İstatistiklerim
            </h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Şarj Ekle
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* CO2 Savings Hero */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold">Çevre Katkınız</h2>
                  <p className="text-emerald-200 text-sm">Elektrikli araç kullanarak</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Factory className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats?.co2Saved || 0}</div>
                  <div className="text-emerald-200 text-xs">kg CO₂ tasarrufu</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <TreePine className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats?.treesEquivalent || 0}</div>
                  <div className="text-emerald-200 text-xs">ağaç eşdeğeri</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Droplets className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stats?.fuelSaved || 0}</div>
                  <div className="text-emerald-200 text-xs">litre benzin tasarrufu</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">₺{stats?.moneySavedVsFuel || 0}</div>
                  <div className="text-emerald-200 text-xs">benzine göre tasarruf</div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Zap className="w-4 h-4" />
                  Toplam Enerji
                </div>
                <div className="text-2xl font-bold text-white">{stats?.totalEnergy || 0} <span className="text-sm text-slate-400">kWh</span></div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <DollarSign className="w-4 h-4" />
                  Toplam Harcama
                </div>
                <div className="text-2xl font-bold text-white">₺{stats?.totalCost || 0}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  Şarj Sayısı
                </div>
                <div className="text-2xl font-bold text-white">{stats?.totalSessions || 0}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  Toplam Süre
                </div>
                <div className="text-2xl font-bold text-white">{formatDuration(stats?.totalDuration || 0)}</div>
              </div>
            </div>

            {/* Dynamic Pricing Info */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Dinamik Fiyatlandırma İpucu
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/20 rounded-lg p-3">
                  <div className="text-emerald-400 font-bold">Gece</div>
                  <div className="text-slate-300 text-sm">22:00 - 06:00</div>
                  <div className="text-emerald-400 text-lg font-bold mt-1">~2.10 ₺/kWh</div>
                  <div className="text-emerald-400 text-xs">En ucuz</div>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-3">
                  <div className="text-yellow-400 font-bold">Gündüz</div>
                  <div className="text-slate-300 text-sm">06:00 - 17:00</div>
                  <div className="text-yellow-400 text-lg font-bold mt-1">~4.20 ₺/kWh</div>
                  <div className="text-yellow-400 text-xs">Normal</div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-3">
                  <div className="text-red-400 font-bold">Puant</div>
                  <div className="text-slate-300 text-sm">17:00 - 22:00</div>
                  <div className="text-red-400 text-lg font-bold mt-1">~6.50 ₺/kWh</div>
                  <div className="text-red-400 text-xs">En pahalı</div>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-3 text-center">
                * Ev şarjı için TEDAŞ çok zamanlı tarife. Halka açık şarj fiyatları operatöre göre değişir.
              </p>
            </div>

            {/* Charging History */}
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Şarj Geçmişi
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Henüz şarj kaydınız yok.</p>
                  <p className="text-slate-500 text-sm mt-1">İlk şarj kaydınızı ekleyin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedHistory).map(([monthKey, { label, records }]) => (
                    <div key={monthKey} className="border border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedMonth(expandedMonth === monthKey ? null : monthKey)}
                        className="w-full px-4 py-3 bg-slate-700/50 flex items-center justify-between hover:bg-slate-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{label}</span>
                          <span className="text-slate-400 text-sm">({records.length} şarj)</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-400 text-sm font-medium">
                            {records.reduce((sum, r) => sum + Number(r.energy_kwh), 0).toFixed(1)} kWh
                          </span>
                          {expandedMonth === monthKey ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {expandedMonth === monthKey && (
                        <div className="divide-y divide-slate-700">
                          {records.map((record) => (
                            <div key={record.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-white font-medium">{record.station_name}</div>
                                <div className="text-slate-400 text-sm">
                                  {record.station_operator || "Bilinmeyen Operatör"} •{" "}
                                  {new Date(record.started_at).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </div>
                              </div>
                              <div className="text-right mr-4">
                                <div className="text-emerald-400 font-medium">{record.energy_kwh} kWh</div>
                                <div className="text-slate-400 text-sm">
                                  {record.cost ? `₺${record.cost}` : "-"} • {formatDuration(record.duration_minutes)}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteRecord(record.id)}
                                disabled={deleting === record.id}
                                className="p-2 text-slate-500 hover:text-red-400 transition"
                              >
                                {deleting === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Şarj Kaydı Ekle</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">İstasyon Adı *</label>
                <input
                  type="text"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  placeholder="Örn: ZES Ankara Kızılay"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Operatör</label>
                <input
                  type="text"
                  value={formData.stationOperator}
                  onChange={(e) => setFormData({ ...formData, stationOperator: e.target.value })}
                  placeholder="Örn: ZES, Eşarj, Trugo"
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Enerji (kWh) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.energyKwh}
                    onChange={(e) => setFormData({ ...formData, energyKwh: e.target.value })}
                    placeholder="35.5"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Ücret (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="420"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Süre (dakika)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    placeholder="45"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-medium transition"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddRecord}
                  disabled={submitting || !formData.stationName || !formData.energyKwh}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-full font-medium transition flex items-center justify-center gap-2"
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