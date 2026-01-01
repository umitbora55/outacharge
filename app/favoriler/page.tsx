"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Heart, ArrowLeft, MapPin, Zap, Battery, Navigation, Trash2, 
  Loader2, Search, Filter, X, ExternalLink
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface FavoriteStation {
  id: string;
  station_id: number;
  station_name: string;
  station_operator: string | null;
  station_address: string | null;
  station_lat: number | null;
  station_lng: number | null;
  station_power: number | null;
  station_power_type: string | null;
  created_at: string;
}

export default function FavorilerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("Tümü");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  // Fetch favorites
  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Favoriler yüklenemedi:", error);
      } else {
        setFavorites(data || []);
      }
    } catch (err) {
      console.error("Hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    setDeletingId(favoriteId);
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) {
        setToast({ show: true, message: "Silme işlemi başarısız.", type: "error" });
      } else {
        setFavorites(prev => prev.filter(f => f.id !== favoriteId));
        setToast({ show: true, message: "İstasyon favorilerden kaldırıldı.", type: "success" });
      }
    } catch (err) {
      setToast({ show: true, message: "Bir hata oluştu.", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  const openDirections = (station: FavoriteStation) => {
    if (station.station_lat && station.station_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${station.station_lat},${station.station_lng}`;
      window.open(url, "_blank");
    }
  };

  const openInMap = (station: FavoriteStation) => {
    if (station.station_lat && station.station_lng) {
      router.push(`/harita?lat=${station.station_lat}&lng=${station.station_lng}&station=${station.station_id}`);
    }
  };

  // Filter favorites
  const filteredFavorites = favorites.filter(station => {
    const matchesSearch = station.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         station.station_operator?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Tümü" || station.station_power_type === filterType;
    return matchesSearch && matchesType;
  });

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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-400" />
              Favori İstasyonlarım
            </h1>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="İstasyon veya operatör ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="Tümü">Tümü</option>
              <option value="AC">AC</option>
              <option value="DC">DC</option>
            </select>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-slate-600" />
            </div>
            {favorites.length === 0 ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Henüz favori istasyonunuz yok</h2>
                <p className="text-slate-400 mb-6">
                  Haritadan istasyonları favorilerinize ekleyebilirsiniz.
                </p>
                <Link
                  href="/harita"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition"
                >
                  <MapPin className="w-5 h-5" />
                  Haritaya Git
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Sonuç bulunamadı</h2>
                <p className="text-slate-400">
                  Arama kriterlerinize uygun istasyon bulunamadı.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4">
              {filteredFavorites.length} favori istasyon
            </p>

            <div className="space-y-4">
              {filteredFavorites.map((station) => (
                <div
                  key={station.id}
                  className="bg-slate-800 rounded-xl p-4 hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{station.station_name}</h3>
                      <p className="text-slate-400 text-sm">{station.station_operator || "Bilinmeyen Operatör"}</p>
                    </div>
                    <button
                      onClick={() => removeFavorite(station.id)}
                      disabled={deletingId === station.id}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
                      title="Favorilerden kaldır"
                    >
                      {deletingId === station.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3">
                    {station.station_power && (
                      <div className="flex items-center gap-1 text-sm text-slate-300">
                        <Battery className="w-4 h-4 text-emerald-400" />
                        <span>{station.station_power} kW</span>
                      </div>
                    )}
                    {station.station_power_type && (
                      <div className="flex items-center gap-1 text-sm">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          station.station_power_type === "DC" 
                            ? "bg-blue-500/20 text-blue-400" 
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {station.station_power_type}
                        </span>
                      </div>
                    )}
                  </div>

                  {station.station_address && (
                    <p className="text-slate-400 text-sm mb-4 flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {station.station_address}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openDirections(station)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition"
                    >
                      <Navigation className="w-4 h-4" />
                      Yol Tarifi
                    </button>
                    <button
                      onClick={() => openInMap(station)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Haritada Gör
                    </button>
                  </div>

                  <p className="text-slate-500 text-xs mt-3">
                    Eklendi: {new Date(station.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}