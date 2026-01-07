"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
import {
    MessageSquare,
    TrendingUp,
    Clock,
    Search,
    PenLine,
    Loader2,
    Zap,
    MessageCircle,
    Eye,
    Filter,
    X
} from "lucide-react";

interface Post {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    station_id: number | null;
    station_name: string | null;
    operator_id: string | null;
    operator_name: string | null;
    city: string | null;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    view_count: number;
    is_pinned: boolean;
    is_resolved: boolean;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

const categories = [
    { id: "all", label: "Tümü", emoji: "🔥" },
    { id: "deneyim", label: "Deneyimler", emoji: "🚗" },
    { id: "soru", label: "Sorular", emoji: "❓" },
    { id: "istasyon_sikayeti", label: "Şikayetler", emoji: "⚠️" },
    { id: "oneri", label: "Öneriler", emoji: "💡" },
    { id: "haber", label: "Haberler", emoji: "📰" },
];

// Supabase fetch helper
async function supabaseFetch(endpoint: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

export default function ToplulukPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("new");
    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const fetchPosts = useCallback(async () => {
        setLoading(true);

        try {
            // Query parametrelerini oluştur
            let query = "posts?select=*";

            // Kategori filtresi
            if (selectedCategory !== "all") {
                query += `&category=eq.${selectedCategory}`;
            }

            // is_deleted filtresi
            query += "&is_deleted=eq.false";

            // Sıralama
            if (sortBy === "popular") {
                query += "&order=comment_count.desc";
            } else {
                query += "&order=created_at.desc";
            }

            query += "&limit=100";

            const data = await supabaseFetch(query);

            if (Array.isArray(data) && data.length > 0) {
                // Arama filtresi (client-side)
                let filteredData = data;
                if (searchQuery.trim()) {
                    const search = searchQuery.toLowerCase();
                    filteredData = data.filter((post: any) =>
                        post.title?.toLowerCase().includes(search) ||
                        post.content?.toLowerCase().includes(search)
                    );
                }

                // User bilgilerini çek
                const userIds = [...new Set(filteredData.map((p: any) => p.user_id))];
                let usersMap = new Map();

                if (userIds.length > 0) {
                    try {
                        const usersQuery = `users?select=id,full_name,avatar_url&id=in.(${userIds.join(',')})`;
                        const usersData = await supabaseFetch(usersQuery);
                        if (Array.isArray(usersData)) {
                            usersMap = new Map(usersData.map((u: any) => [u.id, u]));
                        }
                    } catch (e) {
                        console.log("Users fetch failed, using defaults");
                    }
                }

                const postsWithUsers = filteredData.map((post: any) => ({
                    ...post,
                    user: usersMap.get(post.user_id) || {
                        id: post.user_id,
                        full_name: "Anonim",
                        avatar_url: null
                    }
                }));

                setPosts(postsWithUsers);
            } else {
                setPosts([]);
            }

        } catch (err: any) {
            console.error("Fetch error:", err.message);
            setPosts([]);
        }

        setLoading(false);
    }, [selectedCategory, sortBy, searchQuery]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Az önce";
        if (minutes < 60) return `${minutes} dk`;
        if (hours < 24) return `${hours} saat`;
        if (days < 7) return `${days} gün`;
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    };

    const getCategoryEmoji = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.emoji || "📝";
    };

    return (
        <div className="min-h-screen bg-white">
            <HeaderWhite />

            {/* Hero */}
            <div className="bg-gradient-to-b from-emerald-50 to-white border-b border-zinc-100">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">Topluluk</h1>
                            <p className="text-zinc-500 text-sm mt-1">EV sahiplerinin deneyim ve bilgi paylaşım alanı</p>
                        </div>
                        {user && (
                            <Link
                                href="/topluluk/yeni"
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                            >
                                <PenLine className="w-4 h-4" />
                                <span className="hidden sm:inline">Yeni Konu</span>
                            </Link>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Konu veya içerik ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="sticky top-16 z-20 bg-white border-b border-zinc-100">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex items-center justify-between py-3">
                        {/* Categories - Desktop */}
                        <div className="hidden md:flex items-center gap-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "text-zinc-600 hover:bg-zinc-100"
                                        }`}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowMobileFilters(true)}
                            className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg text-sm text-zinc-700"
                        >
                            <Filter className="w-4 h-4" />
                            Filtrele
                        </button>

                        {/* Sort */}
                        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
                            <button
                                onClick={() => setSortBy("new")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === "new"
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Yeni
                            </button>
                            <button
                                onClick={() => setSortBy("popular")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === "popular"
                                        ? "bg-white text-zinc-900 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                    }`}
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Popüler
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Filters Modal */}
            {showMobileFilters && (
                <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowMobileFilters(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-zinc-900">Kategori Seç</h3>
                            <button onClick={() => setShowMobileFilters(false)}>
                                <X className="w-5 h-5 text-zinc-500" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setShowMobileFilters(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.id
                                            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500"
                                            : "bg-zinc-100 text-zinc-700"
                                        }`}
                                >
                                    <span className="text-lg">{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Posts List */}
            <div className="max-w-3xl mx-auto px-4 py-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                        <p className="text-zinc-500 text-sm">Yükleniyor...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Henüz konu yok</h3>
                        <p className="text-zinc-500 text-sm mb-4">İlk konuyu açan siz olun!</p>
                        {user && (
                            <Link
                                href="/topluluk/yeni"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <PenLine className="w-4 h-4" />
                                Yeni Konu Aç
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/topluluk/${post.id}`}
                                className="block py-4 hover:bg-zinc-50 -mx-4 px-4 transition-colors"
                            >
                                <div className="flex gap-4">
                                    {/* Emoji Badge */}
                                    <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                                        {getCategoryEmoji(post.category)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-[15px] font-medium text-zinc-900 leading-snug mb-1.5 line-clamp-2">
                                            {post.is_pinned && (
                                                <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-100 text-emerald-600 text-xs rounded mr-1.5">📌</span>
                                            )}
                                            {post.title}
                                        </h2>

                                        {/* Meta Row */}
                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                            <span className="font-medium text-zinc-700">{post.user?.full_name}</span>
                                            <span>•</span>
                                            <span>{formatDate(post.created_at)}</span>

                                            {post.operator_name && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <Zap className="w-3 h-3" />
                                                        {post.operator_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-shrink-0">
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comment_count || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            {post.view_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile FAB */}
            {user && (
                <Link
                    href="/topluluk/yeni"
                    className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 z-30"
                >
                    <PenLine className="w-6 h-6" />
                </Link>
            )}
        </div>
    );
}