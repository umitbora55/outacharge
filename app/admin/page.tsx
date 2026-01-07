"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Users, MessageSquare, Star, BarChart3,
  Loader2, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, XCircle, Zap, Battery, RefreshCw, Search
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalUsers: number;
  totalReviews: number;
  totalReports: number;
  totalChargingSessions: number;
  totalEnergyKwh: number;
  pendingReports: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  is_admin: boolean;
}

interface Report {
  id: string;
  station_id: number;
  station_name: string;
  status: string;
  comment: string;
  created_at: string;
  resolved: boolean;
}

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  station_id: number;
  station_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

type TabType = "dashboard" | "users" | "reports" | "reviews";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchReports(),
      fetchReviews(),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/");
      } else if (!user.isAdmin) {
        router.push("/");
      } else {
        loadDashboard();
      }
    }
  }, [user, authLoading, router, loadDashboard]);

  const fetchStats = async () => {
    try {
      const [usersRes, reviewsRes, reportsRes, chargingRes] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("charging_history").select("energy_kwh").limit(500),
      ]);

      const pendingReports = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false);

      const totalEnergy = chargingRes.data?.reduce((sum, c) => sum + Number(c.energy_kwh || 0), 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalReviews: reviewsRes.count || 0,
        totalReports: reportsRes.count || 0,
        totalChargingSessions: chargingRes.data?.length || 0,
        totalEnergyKwh: Math.round(totalEnergy),
        pendingReports: pendingReports.count || 0,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setReports(data);
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setReviews(data);
      }
    } catch (err) {
      console.error("Reviews fetch error:", err);
    }
  };

  const resolveReport = async (reportId: string) => {
    setResolving(reportId);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ resolved: true })
        .eq("id", reportId);

      if (error) {
        alert("Rapor çözülemedi: " + error.message);
        return;
      }

      setReports(prev => prev.map(r =>
        r.id === reportId ? { ...r, resolved: true } : r
      ));

      if (stats) {
        setStats({ ...stats, pendingReports: Math.max(0, stats.pendingReports - 1) });
      }
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setResolving(null);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("Bu yorumu silmek istediğinizden emin misiniz?")) return;

    setDeleting(reviewId);
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

      if (error) {
        alert("Yorum silinemedi: " + error.message);
        return;
      }

      setReviews(prev => prev.filter(r => r.id !== reviewId));

      if (stats) {
        setStats({ ...stats, totalReviews: Math.max(0, stats.totalReviews - 1) });
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReports = reports.filter(r => {
    if (filterStatus === "pending" && r.resolved) return false;
    if (filterStatus === "resolved" && !r.resolved) return false;
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="ml-3 text-slate-300">Oturum kontrol ediliyor...</p>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

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
              <Shield className="w-6 h-6 text-emerald-400" />
              Admin Paneli
            </h1>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "users", label: "Kullanıcılar", icon: Users, count: stats?.totalUsers },
            { id: "reports", label: "Raporlar", icon: AlertTriangle, count: stats?.pendingReports },
            { id: "reviews", label: "Yorumlar", icon: Star, count: stats?.totalReviews },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === tab.id
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-slate-700"
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Users className="w-4 h-4" />
                      Kullanıcılar
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Star className="w-4 h-4" />
                      Yorumlar
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalReviews}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Raporlar
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalReports}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Bekleyen
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.pendingReports}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Battery className="w-4 h-4" />
                      Şarj Sayısı
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.totalChargingSessions}</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Zap className="w-4 h-4" />
                      Toplam Enerji
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{stats.totalEnergyKwh} kWh</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      Son Raporlar
                    </h3>
                    <div className="space-y-3">
                      {reports.slice(0, 5).map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div>
                            <div className="text-white text-sm font-medium">{report.station_name}</div>
                            <div className="text-slate-400 text-xs">{report.status} - {formatDate(report.created_at)}</div>
                          </div>
                          {report.resolved ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">Henüz rapor yok</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      Son Yorumlar
                    </h3>
                    <div className="space-y-3">
                      {reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm font-medium">{review.user_name}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= review.rating
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-slate-600"
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-slate-400 text-xs mb-1">{review.station_name}</div>
                          {review.comment && (
                            <p className="text-slate-300 text-sm truncate">{review.comment}</p>
                          )}
                        </div>
                      ))}
                      {reviews.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">Henüz yorum yok</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kullanıcı ara..."
                    className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>

                <div className="bg-slate-800 rounded-xl overflow-hidden">
                  <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b border-slate-700 text-slate-400 text-sm font-medium">
                    <span>Kullanıcı</span>
                    <span>Email</span>
                    <span>Araç</span>
                    <span>Kayıt Tarihi</span>
                    <span>Durum</span>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {filteredUsers.map((u) => (
                      <div key={u.id}>
                        <div
                          className="p-4 hover:bg-slate-700/50 cursor-pointer transition"
                          onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                        >
                          <div className="md:grid md:grid-cols-5 md:gap-4 md:items-center">
                            <div className="flex items-center gap-3 mb-2 md:mb-0">
                              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-medium">
                                {u.full_name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div className="text-white font-medium">{u.full_name || "İsimsiz"}</div>
                                <div className="text-slate-400 text-xs md:hidden">{u.email}</div>
                              </div>
                            </div>
                            <div className="hidden md:block text-slate-300 text-sm truncate">{u.email}</div>
                            <div className="hidden md:block text-slate-400 text-sm">
                              {u.vehicle_brand ? `${u.vehicle_brand} ${u.vehicle_model}` : "-"}
                            </div>
                            <div className="hidden md:block text-slate-400 text-sm">
                              {formatDate(u.created_at)}
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                              {u.is_admin && (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                  Admin
                                </span>
                              )}
                              {expandedUser === u.id ? (
                                <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
                              )}
                            </div>
                          </div>
                        </div>

                        {expandedUser === u.id && (
                          <div className="px-4 pb-4 bg-slate-700/30">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-slate-400 block mb-1">User ID</span>
                                <span className="text-white font-mono text-xs">{u.id.slice(0, 8)}...</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Araç</span>
                                <span className="text-white">
                                  {u.vehicle_brand ? `${u.vehicle_brand} ${u.vehicle_model}` : "Belirtilmemiş"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Kayıt</span>
                                <span className="text-white">{formatDate(u.created_at)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Rol</span>
                                <span className={u.is_admin ? "text-emerald-400" : "text-white"}>
                                  {u.is_admin ? "Admin" : "Kullanıcı"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      Kullanıcı bulunamadı
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "Tümü" },
                    { id: "pending", label: "Bekleyen" },
                    { id: "resolved", label: "Çözülen" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterStatus(f.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === f.id
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-medium">{report.station_name}</h4>
                          <p className="text-slate-400 text-sm">ID: {report.station_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === "broken" ? "bg-red-500/20 text-red-400" :
                              report.status === "busy" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-emerald-500/20 text-emerald-400"
                            }`}>
                            {report.status === "broken" ? "Arızalı" :
                              report.status === "busy" ? "Dolu" : "Çalışıyor"}
                          </span>
                          {report.resolved ? (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                              Çözüldü
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                              Bekliyor
                            </span>
                          )}
                        </div>
                      </div>

                      {report.comment && (
                        <p className="text-slate-300 text-sm mb-3 p-3 bg-slate-700/50 rounded-lg">
                          &quot;{report.comment}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">{formatDate(report.created_at)}</span>
                        {!report.resolved && (
                          <button
                            onClick={() => resolveReport(report.id)}
                            disabled={resolving === report.id}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition"
                          >
                            {resolving === report.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Çözüldü İşaretle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredReports.length === 0 && (
                    <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-500">
                      Rapor bulunamadı
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-medium">
                          {review.user_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="text-white font-medium">{review.user_name}</div>
                          <div className="text-slate-400 text-sm">{review.station_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-slate-600"
                                }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deleting === review.id}
                          className="p-2 text-slate-400 hover:text-red-400 transition"
                        >
                          {deleting === review.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-slate-300 text-sm mb-3">{review.comment}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Station ID: {review.station_id}</span>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-500">
                    Henüz yorum yok
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}