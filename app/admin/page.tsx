"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
import {
  ArrowLeft, Shield, Users, MessageSquare, Star, BarChart3,
  Loader2, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, XCircle, Zap, Battery, RefreshCw, Search,
  FileText, Eye, Ban, Car
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Supabase fetch helper
async function supabaseFetch(endpoint: string, options?: RequestInit) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': supabaseKey!,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

interface DashboardStats {
  totalUsers: number;
  totalReviews: number;
  totalReports: number;
  totalChargingSessions: number;
  totalEnergyKwh: number;
  pendingReports: number;
  totalPosts: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  is_admin: boolean;
  is_banned?: boolean;
}

interface Report {
  id: number;
  station_id: number;
  station_name: string;
  status: string;
  user_ip: string | null;
  comment: string;
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

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
  is_deleted: boolean;
  created_at: string;
  user_name?: string;
}

type TabType = "dashboard" | "users" | "reports" | "reviews" | "posts";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

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
      fetchPosts(),
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/giris");
      } else if (!user.isAdmin) {
        router.push("/");
      } else {
        loadDashboard();
      }
    }
  }, [user, authLoading, router, loadDashboard]);

  const fetchStats = async () => {
    try {
      const [usersData, reviewsData, reportsData, chargingData, postsData] = await Promise.all([
        supabaseFetch('users?select=id'),
        supabaseFetch('reviews?select=id'),
        supabaseFetch('reports?select=id,resolved'),
        supabaseFetch('charging_history?select=energy_kwh&limit=500'),
        supabaseFetch('posts?select=id'),
      ]);

      const pendingReports = reportsData?.filter((r: any) => !r.resolved).length || 0;
      const totalEnergy = chargingData?.reduce((sum: number, c: any) => sum + Number(c.energy_kwh || 0), 0) || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        totalReviews: reviewsData?.length || 0,
        totalReports: reportsData?.length || 0,
        totalChargingSessions: chargingData?.length || 0,
        totalEnergyKwh: Math.round(totalEnergy),
        pendingReports,
        totalPosts: postsData?.length || 0,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await supabaseFetch('users?order=created_at.desc&limit=100');
      setUsers(data || []);
    } catch (err) {
      console.error("Users fetch error:", err);
      setUsers([]);
    }
  };

  const fetchReports = async () => {
    try {
      const data = await supabaseFetch('reports?order=id.desc&limit=100');
      setReports(data || []);
    } catch (err) {
      console.error("Reports fetch error:", err);
      setReports([]);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await supabaseFetch('reviews?order=created_at.desc&limit=100');
      setReviews(data || []);
    } catch (err) {
      console.error("Reviews fetch error:", err);
      setReviews([]);
    }
  };

  const fetchPosts = async () => {
    try {
      const data = await supabaseFetch('posts?order=created_at.desc&limit=100');

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p: any) => p.user_id))];
        const usersData = await supabaseFetch(`users?id=in.(${userIds.join(',')})&select=id,full_name`);
        const usersMap = new Map(usersData?.map((u: any) => [u.id, u.full_name]) || []);

        setPosts(data.map((p: any) => ({
          ...p,
          user_name: usersMap.get(p.user_id) || 'Anonim'
        })));
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Posts fetch error:", err);
      setPosts([]);
    }
  };

  const resolveReport = async (reportId: number) => {
    setResolving(reportId.toString());
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

  const deletePost = async (postId: string, restore: boolean = false) => {
    const action = restore ? "geri yüklemek" : "silmek";
    if (!confirm(`Bu konuyu ${action} istediğinizden emin misiniz?`)) return;

    setDeleting(postId);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ is_deleted: !restore })
        .eq("id", postId);

      if (error) {
        alert("İşlem başarısız: " + error.message);
        return;
      }

      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, is_deleted: !restore } : p
      ));
    } catch (err) {
      console.error("Delete post error:", err);
    } finally {
      setDeleting(null);
    }
  };

  const banUser = async (userId: string, ban: boolean) => {
    const action = ban ? "engellemek" : "engeli kaldırmak";
    if (!confirm(`Bu kullanıcıyı ${action} istediğinizden emin misiniz?`)) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ is_banned: ban })
        .eq("id", userId);

      if (error) {
        alert("İşlem başarısız: " + error.message);
        return;
      }

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_banned: ban } : u
      ));
    } catch (err) {
      console.error("Ban error:", err);
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

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === "active" && p.is_deleted) return false;
    if (filterStatus === "deleted" && !p.is_deleted) return false;
    return matchesSearch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <HeaderWhite />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-200 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                <Shield className="w-7 h-7 text-emerald-600" />
                Admin Paneli
              </h1>
              <p className="text-zinc-500 text-sm">Topluluk ve uygulama yönetimi</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-zinc-700 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 bg-white p-1.5 rounded-xl shadow-sm w-fit">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "users", label: "Kullanıcılar", icon: Users, count: stats?.totalUsers },
            { id: "posts", label: "Konular", icon: MessageSquare, count: stats?.totalPosts },
            { id: "reports", label: "Raporlar", icon: AlertTriangle, count: stats?.pendingReports },
            { id: "reviews", label: "Yorumlar", icon: Star, count: stats?.totalReviews },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap text-sm ${activeTab === tab.id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-zinc-200"
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Kullanıcılar", value: stats.totalUsers, icon: Users, color: "blue" },
                    { label: "Konular", value: stats.totalPosts, icon: MessageSquare, color: "emerald" },
                    { label: "Yorumlar", value: stats.totalReviews, icon: Star, color: "amber" },
                    { label: "Bekleyen", value: stats.pendingReports, icon: AlertTriangle, color: "red" },
                    { label: "Şarj Sayısı", value: stats.totalChargingSessions, icon: Battery, color: "purple" },
                    { label: "Toplam Enerji", value: `${stats.totalEnergyKwh} kWh`, icon: Zap, color: "cyan" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                      </div>
                      <div className="text-2xl font-bold text-zinc-900">{stat.value}</div>
                      <div className="text-zinc-500 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Son Raporlar */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Son Raporlar
                    </h3>
                    <div className="space-y-3">
                      {reports.slice(0, 5).map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <div className="text-zinc-900 text-sm font-medium truncate">{report.station_name}</div>
                            <div className="text-zinc-500 text-xs">{report.status}</div>
                          </div>
                          {report.resolved ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="text-zinc-400 text-sm text-center py-4">Henüz rapor yok</p>
                      )}
                    </div>
                  </div>

                  {/* Son Yorumlar */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="text-zinc-900 font-semibold mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      Son Yorumlar
                    </h3>
                    <div className="space-y-3">
                      {reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="p-3 bg-zinc-50 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-900 text-sm font-medium">{review.user_name}</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= review.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-zinc-300"
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-zinc-500 text-xs mb-1">{review.station_name}</div>
                          {review.comment && (
                            <p className="text-zinc-600 text-sm truncate">{review.comment}</p>
                          )}
                        </div>
                      ))}
                      {reviews.length === 0 && (
                        <p className="text-zinc-400 text-sm text-center py-4">Henüz yorum yok</p>
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
                    className="w-full bg-white text-zinc-900 rounded-xl px-4 py-3 pl-10 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="hidden md:grid grid-cols-6 gap-4 p-4 border-b border-zinc-100 text-zinc-500 text-sm font-medium">
                    <span>Kullanıcı</span>
                    <span>Email</span>
                    <span>Araç</span>
                    <span>Kayıt Tarihi</span>
                    <span>Durum</span>
                    <span>İşlem</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className={`p-4 hover:bg-zinc-50 transition ${u.is_banned ? "bg-red-50" : ""}`}>
                        <div className="md:grid md:grid-cols-6 md:gap-4 md:items-center">
                          <div className="flex items-center gap-3 mb-2 md:mb-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-medium">
                              {u.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <div className="text-zinc-900 font-medium">{u.full_name || "İsimsiz"}</div>
                              <div className="text-zinc-500 text-xs md:hidden">{u.email}</div>
                            </div>
                          </div>
                          <div className="hidden md:block text-zinc-600 text-sm truncate">{u.email}</div>
                          <div className="hidden md:flex items-center gap-1 text-zinc-500 text-sm">
                            {u.vehicle_brand ? (
                              <>
                                <Car className="w-3.5 h-3.5" />
                                {u.vehicle_brand}
                              </>
                            ) : "-"}
                          </div>
                          <div className="hidden md:block text-zinc-500 text-sm">
                            {formatDate(u.created_at)}
                          </div>
                          <div className="hidden md:flex items-center gap-2">
                            {u.is_admin && (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                                Admin
                              </span>
                            )}
                            {u.is_banned && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Engelli
                              </span>
                            )}
                          </div>
                          <div className="hidden md:flex items-center gap-2">
                            {!u.is_admin && (
                              <button
                                onClick={() => banUser(u.id, !u.is_banned)}
                                className={`p-2 rounded-lg transition ${u.is_banned
                                  ? "text-emerald-600 hover:bg-emerald-50"
                                  : "text-red-500 hover:bg-red-50"
                                  }`}
                                title={u.is_banned ? "Engeli Kaldır" : "Engelle"}
                              >
                                {u.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-zinc-400">
                      Kullanıcı bulunamadı
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Konu veya kullanıcı ara..."
                      className="w-full bg-white text-zinc-900 rounded-xl px-4 py-3 pl-10 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex gap-2">
                    {[
                      { id: "all", label: "Tümü" },
                      { id: "active", label: "Aktif" },
                      { id: "deleted", label: "Silinen" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilterStatus(f.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === f.id
                          ? "bg-zinc-900 text-white"
                          : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                          }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm divide-y divide-zinc-100">
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className={`p-4 hover:bg-zinc-50 transition ${post.is_deleted ? "bg-red-50/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {post.is_deleted && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                                Silindi
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded">
                              {post.category}
                            </span>
                          </div>
                          <h4 className="text-zinc-900 font-medium">{post.title}</h4>
                          <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                            <span>{post.user_name}</span>
                            <span>•</span>
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/topluluk/${post.id}`}
                            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                            target="_blank"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {post.is_deleted ? (
                            <button
                              onClick={() => deletePost(post.id, true)}
                              disabled={deleting === post.id}
                              className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Geri Yükle"
                            >
                              {deleting === post.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => deletePost(post.id)}
                              disabled={deleting === post.id}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Sil"
                            >
                              {deleting === post.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredPosts.length === 0 && (
                    <div className="p-12 text-center text-zinc-400">
                      Konu bulunamadı
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
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === f.id
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-zinc-900 font-medium">{report.station_name}</h4>
                          <p className="text-zinc-500 text-sm">ID: {report.station_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${report.status === "broken" ? "bg-red-100 text-red-600" :
                            report.status === "busy" ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            }`}>
                            {report.status === "broken" ? "Arızalı" :
                              report.status === "busy" ? "Dolu" : "Çalışıyor"}
                          </span>
                          {report.resolved ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-medium">
                              Çözüldü
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-medium">
                              Bekliyor
                            </span>
                          )}
                        </div>
                      </div>

                      {report.comment && (
                        <p className="text-zinc-600 text-sm mb-3 p-3 bg-zinc-50 rounded-xl">
                          &quot;{report.comment}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-xs">ID: {report.id}</span>
                        {!report.resolved && (
                          <button
                            onClick={() => resolveReport(report.id)}
                            disabled={resolving === report.id.toString()}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition"
                          >
                            {resolving === report.id.toString() ? (
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
                    <div className="bg-white rounded-2xl p-12 text-center text-zinc-400 shadow-sm">
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
                  <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center text-white font-medium">
                          {review.user_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="text-zinc-900 font-medium">{review.user_name}</div>
                          <div className="text-zinc-500 text-sm">{review.station_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-zinc-300"
                                }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => deleteReview(review.id)}
                          disabled={deleting === review.id}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
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
                      <p className="text-zinc-600 text-sm mb-3">{review.comment}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Station ID: {review.station_id}</span>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="bg-white rounded-2xl p-12 text-center text-zinc-400 shadow-sm">
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