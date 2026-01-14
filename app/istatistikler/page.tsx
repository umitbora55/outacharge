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
    <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
      <HeaderWhite />

      {/* Cinematic Hero Section - Personal Metrics Style */}
      <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/images/stats-hero.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
        </div>

        <div className="container max-w-6xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
              <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Metrics & Sustanability</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
              Personal <br />
              <span className="font-medium">Directives.</span>
            </h1>
            <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
              Analyze your environmental impact and infrastructure usage through our high-precision technical archive.
            </p>

            {/* Integrated Stats - Technical Specification Style */}
            <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats?.co2Saved || 0}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  CO₂ SAVED (KG)
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats?.treesEquivalent || 0}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  TREE EQUIVALENCE
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                  {stats?.moneySavedVsFuel || 0}
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                  NET EARNINGS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-6xl mx-auto px-6 pb-32 relative z-20">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-1000">
            {/* Minimalist Controls Section */}
            <div className="pt-20 pb-24 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex items-baseline gap-6 group">
                  <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-white">Directive History</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-emerald-500 transition-colors">
                    {history.length} ACTIVE RECORDS
                  </span>
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/10"
                >
                  Add Record
                </button>
              </div>
            </div>

            {/* Technical Ledger Grid */}
            <div className="pt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
              {[
                { label: "Total Energy", value: stats?.totalEnergy || 0, unit: "kwh", icon: Zap },
                { label: "Total Expenditure", value: `₺${stats?.totalCost || 0}`, unit: null, icon: DollarSign },
                { label: "Frequency", value: stats?.totalSessions || 0, unit: "cycles", icon: TrendingUp },
                { label: "Runtime", value: formatDuration(stats?.totalDuration || 0), unit: null, icon: Clock }
              ].map((item, i) => (
                <div key={i} className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-3xl p-8 group hover:border-zinc-200 dark:hover:border-white/[0.06] transition-all">
                  <div className="flex items-center justify-between mb-8 opacity-40 group-hover:opacity-100 transition-opacity">
                    <item.icon className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">.{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-light tracking-tighter tabular-nums text-zinc-900 dark:text-white">{item.value}</span>
                      {item.unit && <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{item.unit}</span>}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.3em]">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Pricing - Directive Style */}
            <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-12 mb-32 group">
              <div className="flex items-center justify-between mb-16">
                <div>
                  <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase mb-4 block">Intelligence</span>
                  <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Dynamic Pricing.</h3>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">TEDAŞ RESIDENTIAL TARIFE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: "Night", time: "22:00 - 06:00", price: "2.10", color: "text-emerald-500", tag: "OPTIMAL" },
                  { label: "Day", time: "06:00 - 17:00", price: "4.20", color: "text-blue-500", tag: "NOMINAL" },
                  { label: "Peak", time: "17:00 - 22:00", price: "6.50", color: "text-red-500", tag: "MAXIMUM" }
                ].map((p, i) => (
                  <div key={i} className="flex flex-col gap-8 p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] hover:border-zinc-100 dark:hover:border-white/[0.05] transition-all">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${p.color}`}>{p.tag}</span>
                      <Zap className={`w-3 h-3 ${p.color} opacity-30`} />
                    </div>
                    <div>
                      <div className="text-xl font-medium mb-1">{p.label}</div>
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{p.time}</div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-light tracking-tighter ${p.color}`}>{p.price}</span>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">₺/KWH</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History Feed - Minimalist Archive Style */}
            <div className="space-y-32">
              {Object.entries(groupedHistory).map(([monthKey, { label, records }]) => (
                <div key={monthKey}>
                  <div className="flex items-baseline gap-8 mb-12 border-b border-zinc-100 dark:border-zinc-900 pb-8">
                    <h3 className="text-4xl font-extralight tracking-tight text-zinc-900 dark:text-white">{label}</h3>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{records.length} DIRECTIVES</span>
                  </div>

                  <div className="space-y-px">
                    {records.map((record) => (
                      <div key={record.id} className="py-12 group flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all px-8 -mx-8">
                        <div className="flex items-center gap-12 text-left">
                          <div className="flex flex-col">
                            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">STATION</span>
                            <span className="text-2xl font-light tracking-tight text-zinc-900 dark:text-white uppercase">{record.station_name}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">OPERATOR</span>
                            <span className="text-[13px] font-medium text-zinc-500 uppercase">{record.station_operator || "PRIVATE"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-20 text-right">
                          <div className="flex flex-col">
                            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">ENERGY</span>
                            <span className="text-2xl font-light tracking-tighter tabular-nums text-emerald-500">{record.energy_kwh}KWH</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">COST</span>
                            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">{record.cost ? `₺${record.cost}` : "--"}</span>
                          </div>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-zinc-800 text-zinc-300 hover:text-red-500 hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-48 flex flex-col items-center">
              <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-900" />
              <p className="text-zinc-100 dark:text-zinc-900/10 text-[10vw] font-black leading-none select-none tracking-tighter mt-12">
                METRICS
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Add Record Modal - Unified High-End Design */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-white/10 rounded-[2.5rem] w-full max-w-xl p-12 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between mb-12">
              <div className="flex flex-col gap-2">
                <span className="text-emerald-500 text-[10px] font-bold tracking-[0.5em] uppercase">Architecture</span>
                <h3 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white">Record Directive.</h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
              >
                <ChevronDown className="w-5 h-5 rotate-180" />
              </button>
            </div>

            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">STATION IDENTITY</label>
                  <input
                    type="text"
                    value={formData.stationName}
                    onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">OPERATOR ARCHIVE</label>
                  <input
                    type="text"
                    value={formData.stationOperator}
                    onChange={(e) => setFormData({ ...formData, stationOperator: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-2xl px-6 py-4 focus:ring-1 focus:ring-emerald-500 transition-all font-light"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">KWH</label>
                  <input
                    type="number"
                    value={formData.energyKwh}
                    onChange={(e) => setFormData({ ...formData, energyKwh: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">COST</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">MINS</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest ml-1">DATE</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none text-zinc-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                >
                  Terminate
                </button>
                <button
                  onClick={handleAddRecord}
                  disabled={submitting || !formData.stationName || !formData.energyKwh}
                  className="flex-[2] py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/20 disabled:opacity-30 disabled:pointer-events-none"
                >
                  {submitting ? "Processing..." : "Commit Directive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}