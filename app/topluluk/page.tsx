"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
import {
    MessageSquare,
    TrendingUp,
    Clock,
    ChevronUp,
    ChevronDown,
    MapPin,
    Zap,
    AlertTriangle,
    HelpCircle,
    Lightbulb,
    Newspaper,
    Car,
    Plus,
    Bookmark,
    Share2,
    Search,
    Flame
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
    user_vote?: number;
    is_saved?: boolean;
}

const categories = [
    { id: "all", label: "Tümü", icon: Flame, color: "text-orange-500" },
    { id: "istasyon_sikayeti", label: "İstasyon Şikayeti", icon: AlertTriangle, color: "text-red-500" },
    { id: "operator_sikayeti", label: "Operatör Şikayeti", icon: Zap, color: "text-yellow-600" },
    { id: "deneyim", label: "Deneyim", icon: Car, color: "text-blue-500" },
    { id: "soru", label: "Soru", icon: HelpCircle, color: "text-purple-500" },
    { id: "oneri", label: "Öneri", icon: Lightbulb, color: "text-green-500" },
    { id: "haber", label: "Haber", icon: Newspaper, color: "text-cyan-500" },
];

const sortOptions = [
    { id: "trending", label: "Trend", icon: TrendingUp },
    { id: "new", label: "Yeni", icon: Clock },
    { id: "top", label: "En Çok Oy", icon: ChevronUp },
];

export default function ToplulukPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("trending");
    const [searchQuery, setSearchQuery] = useState("");
    const [votingPostId, setVotingPostId] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("posts")
                .select("*")
                .eq("is_deleted", false);

            if (selectedCategory !== "all") {
                query = query.eq("category", selectedCategory);
            }

            if (searchQuery.trim()) {
                query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
            }

            if (sortBy === "trending") {
                query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
            } else if (sortBy === "new") {
                query = query.order("created_at", { ascending: false });
            } else if (sortBy === "top") {
                query = query.order("upvotes", { ascending: false });
            }

            query = query.limit(50);

            const { data, error } = await query;

            if (error) throw error;

            let postsWithUsers = data || [];

            if (postsWithUsers.length > 0) {
                const userIds = [...new Set(postsWithUsers.map(p => p.user_id))];
                const { data: users } = await supabase
                    .from("users")
                    .select("id, full_name, avatar_url")
                    .in("id", userIds);

                const usersMap = new Map(users?.map(u => [u.id, u]) || []);

                postsWithUsers = postsWithUsers.map(post => ({
                    ...post,
                    user: usersMap.get(post.user_id) || { id: post.user_id, full_name: "Anonim", avatar_url: null }
                }));
            }

            if (user && postsWithUsers.length > 0) {
                const postIds = postsWithUsers.map(p => p.id);

                const [votesRes, savedRes] = await Promise.all([
                    supabase
                        .from("post_votes")
                        .select("post_id, vote_type")
                        .eq("user_id", user.id)
                        .in("post_id", postIds),
                    supabase
                        .from("saved_posts")
                        .select("post_id")
                        .eq("user_id", user.id)
                        .in("post_id", postIds)
                ]);

                const votesMap = new Map(votesRes.data?.map(v => [v.post_id, v.vote_type]) || []);
                const savedSet = new Set(savedRes.data?.map(s => s.post_id) || []);

                postsWithUsers = postsWithUsers.map(post => ({
                    ...post,
                    user_vote: votesMap.get(post.id),
                    is_saved: savedSet.has(post.id)
                }));
            }

            setPosts(postsWithUsers);
        } catch (err: any) {
            console.error("Posts fetch error:", err?.message, err?.code, err);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, sortBy, searchQuery, user]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleVote = async (postId: string, voteType: 1 | -1) => {
        if (!user) {
            alert("Oy vermek için giriş yapmalısınız");
            return;
        }

        setVotingPostId(postId);

        try {
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            const currentVote = post.user_vote;

            if (currentVote === voteType) {
                await supabase
                    .from("post_votes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);

                setPosts(posts.map(p =>
                    p.id === postId
                        ? {
                            ...p,
                            user_vote: undefined,
                            upvotes: voteType === 1 ? p.upvotes - 1 : p.upvotes,
                            downvotes: voteType === -1 ? p.downvotes - 1 : p.downvotes
                        }
                        : p
                ));
            } else {
                await supabase
                    .from("post_votes")
                    .upsert({
                        post_id: postId,
                        user_id: user.id,
                        vote_type: voteType
                    }, { onConflict: "post_id,user_id" });

                setPosts(posts.map(p => {
                    if (p.id !== postId) return p;

                    let newUpvotes = p.upvotes;
                    let newDownvotes = p.downvotes;

                    if (currentVote === 1) newUpvotes--;
                    if (currentVote === -1) newDownvotes--;

                    if (voteType === 1) newUpvotes++;
                    if (voteType === -1) newDownvotes++;

                    return {
                        ...p,
                        user_vote: voteType,
                        upvotes: newUpvotes,
                        downvotes: newDownvotes
                    };
                }));
            }
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVotingPostId(null);
        }
    };

    const handleSave = async (postId: string) => {
        if (!user) {
            alert("Kaydetmek için giriş yapmalısınız");
            return;
        }

        try {
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            if (post.is_saved) {
                await supabase
                    .from("saved_posts")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);
            } else {
                await supabase
                    .from("saved_posts")
                    .insert({ post_id: postId, user_id: user.id });
            }

            setPosts(posts.map(p =>
                p.id === postId ? { ...p, is_saved: !p.is_saved } : p
            ));
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    const getCategoryIcon = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.icon : MessageSquare;
    };

    const getCategoryColor = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.color : "text-gray-500";
    };

    const getCategoryLabel = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.label : category;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Az önce";
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString("tr-TR");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <HeaderWhite />
            
            {/* Sub Header */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                            <MessageSquare className="w-7 h-7 text-emerald-500" />
                            Topluluk
                        </h1>
                        {user && (
                            <Link
                                href="/topluluk/yeni"
                                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white rounded-full transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Yeni Entry</span>
                            </Link>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Entry ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition-all text-sm ${selectedCategory === cat.id
                                        ? "bg-black text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${selectedCategory === cat.id ? "text-white" : cat.color}`} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex gap-2">
                    {sortOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.id}
                                onClick={() => setSortBy(option.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${sortBy === option.id
                                    ? "bg-gray-200 text-zinc-900"
                                    : "text-gray-500 hover:text-zinc-900"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Posts List */}
            <div className="max-w-4xl mx-auto px-4 pb-8">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
                                <div className="flex gap-4">
                                    <div className="w-10 flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 bg-gray-200 rounded" />
                                        <div className="w-8 h-4 bg-gray-200 rounded" />
                                        <div className="w-6 h-6 bg-gray-200 rounded" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                                        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl text-gray-600 mb-2">Henüz entry yok</h3>
                        <p className="text-gray-400 mb-4">İlk entry&apos;yi sen yaz!</p>
                        {user && (
                            <Link
                                href="/topluluk/yeni"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white rounded-full transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Yeni Entry
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {posts.map((post) => {
                            const CategoryIcon = getCategoryIcon(post.category);
                            const score = post.upvotes - post.downvotes;

                            return (
                                <article
                                    key={post.id}
                                    className={`bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all ${post.is_pinned ? "ring-2 ring-emerald-500/30" : ""
                                        }`}
                                >
                                    <div className="flex">
                                        {/* Vote Column */}
                                        <div className="flex flex-col items-center py-4 px-3 bg-gray-50">
                                            <button
                                                onClick={() => handleVote(post.id, 1)}
                                                disabled={votingPostId === post.id}
                                                className={`p-1 rounded transition-colors ${post.user_vote === 1
                                                    ? "text-emerald-500"
                                                    : "text-gray-400 hover:text-emerald-500"
                                                    }`}
                                            >
                                                <ChevronUp className="w-6 h-6" />
                                            </button>
                                            <span className={`text-sm font-bold my-1 ${score > 0 ? "text-emerald-500" : score < 0 ? "text-red-500" : "text-gray-400"
                                                }`}>
                                                {score}
                                            </span>
                                            <button
                                                onClick={() => handleVote(post.id, -1)}
                                                disabled={votingPostId === post.id}
                                                className={`p-1 rounded transition-colors ${post.user_vote === -1
                                                    ? "text-red-500"
                                                    : "text-gray-400 hover:text-red-500"
                                                    }`}
                                            >
                                                <ChevronDown className="w-6 h-6" />
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 py-4 pr-4">
                                            {/* Meta */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 ${getCategoryColor(post.category)}`}>
                                                    <CategoryIcon className="w-3 h-3" />
                                                    {getCategoryLabel(post.category)}
                                                </span>

                                                {post.station_name && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {post.station_name}
                                                    </span>
                                                )}

                                                {post.operator_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        {post.operator_name}
                                                    </span>
                                                )}

                                                {post.city && (
                                                    <span className="text-gray-400">• {post.city}</span>
                                                )}

                                                {post.is_resolved && (
                                                    <span className="text-emerald-500">✓ Çözüldü</span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <Link href={`/topluluk/${post.id}`}>
                                                <h2 className="text-lg font-semibold text-zinc-900 hover:text-emerald-600 transition-colors mb-2 line-clamp-2">
                                                    {post.is_pinned && <span className="text-emerald-500 mr-2">📌</span>}
                                                    {post.title}
                                                </h2>
                                            </Link>

                                            {/* Content Preview */}
                                            <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                                                {post.content}
                                            </p>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <Link
                                                        href={`/kullanici/${post.user_id}`}
                                                        className="flex items-center gap-2 hover:text-zinc-900 transition-colors"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                                            {post.user?.full_name?.charAt(0) || "?"}
                                                        </div>
                                                        <span>{post.user?.full_name || "Anonim"}</span>
                                                    </Link>
                                                    <span>•</span>
                                                    <span>{formatDate(post.created_at)}</span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        href={`/topluluk/${post.id}`}
                                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-zinc-900 transition-colors"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{post.comment_count}</span>
                                                    </Link>

                                                    <button
                                                        onClick={() => handleSave(post.id)}
                                                        className={`flex items-center gap-1 text-xs transition-colors ${post.is_saved
                                                            ? "text-yellow-500"
                                                            : "text-gray-400 hover:text-yellow-500"
                                                            }`}
                                                    >
                                                        <Bookmark className={`w-4 h-4 ${post.is_saved ? "fill-current" : ""}`} />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/topluluk/${post.id}`);
                                                            alert("Link kopyalandı!");
                                                        }}
                                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-zinc-900 transition-colors"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
