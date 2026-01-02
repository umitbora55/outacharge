"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    ArrowLeft,
    Users,
    MessageSquare,
    Zap,
    Calendar,
    MapPin,
    Car,
    Award,
    ChevronUp,
    ChevronDown,
    Loader2,
    UserPlus,
    UserMinus,
    Mail,
    Settings,
    Battery
} from "lucide-react";

interface UserProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    city: string | null;
    follower_count: number;
    following_count: number;
    post_count: number;
    checkin_count: number;
    total_kwh: number;
    created_at: string;
}

interface UserBadge {
    id: string;
    badge: {
        id: string;
        name: string;
        description: string;
        icon: string;
    };
    earned_at: string;
}

interface Post {
    id: string;
    category: string;
    title: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string;
}

export default function KullaniciProfilPage() {
    const params = useParams();
    const { user: currentUser } = useAuth();
    const userId = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");

    const isOwnProfile = currentUser?.id === userId;

    const fetchProfile = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    }, [userId]);

    const fetchBadges = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("user_badges")
                .select(`
          id,
          earned_at,
          badge:badges(id, name, description, icon)
        `)
                .eq("user_id", userId);

            if (error) throw error;

            // Supabase join sonucunu düzelt
            const formattedBadges = (data || []).map((item: any) => ({
                id: item.id,
                earned_at: item.earned_at,
                badge: Array.isArray(item.badge) ? item.badge[0] : item.badge
            })).filter((item: any) => item.badge);

            setBadges(formattedBadges);
        } catch (err) {
            console.error("Badges fetch error:", err);
        }
    }, [userId]);

    const fetchPosts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("posts")
                .select("id, category, title, upvotes, downvotes, comment_count, created_at")
                .eq("user_id", userId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error("Posts fetch error:", err);
        }
    }, [userId]);

    const checkFollowStatus = useCallback(async () => {
        if (!currentUser || isOwnProfile) return;

        try {
            const { data } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", currentUser.id)
                .eq("following_id", userId)
                .single();

            setIsFollowing(!!data);
        } catch {
            setIsFollowing(false);
        }
    }, [currentUser, userId, isOwnProfile]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchProfile(),
                fetchBadges(),
                fetchPosts(),
                checkFollowStatus()
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchProfile, fetchBadges, fetchPosts, checkFollowStatus]);

    const handleFollow = async () => {
        if (!currentUser) {
            alert("Takip etmek için giriş yapmalısınız");
            return;
        }

        setFollowLoading(true);

        try {
            if (isFollowing) {
                await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", currentUser.id)
                    .eq("following_id", userId);

                setIsFollowing(false);
                if (profile) {
                    setProfile({ ...profile, follower_count: profile.follower_count - 1 });
                }
            } else {
                await supabase
                    .from("follows")
                    .insert({
                        follower_id: currentUser.id,
                        following_id: userId
                    });

                setIsFollowing(true);
                if (profile) {
                    setProfile({ ...profile, follower_count: profile.follower_count + 1 });
                }
            }
        } catch (err) {
            console.error("Follow error:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("tr-TR", {
            month: "long",
            year: "numeric"
        });
    };

    const formatRelativeDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / 86400000);

        if (days < 1) return "Bugün";
        if (days < 7) return `${days} gün önce`;
        if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
        return date.toLocaleDateString("tr-TR");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Kullanıcı bulunamadı</h2>
                    <Link href="/topluluk" className="text-emerald-500 hover:underline">
                        Topluluğa dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link
                        href="/topluluk"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Geri
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Profile Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
                    {/* Cover */}
                    <div className="h-32 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600" />

                    <div className="px-6 pb-6">
                        {/* Avatar & Actions */}
                        <div className="flex items-end justify-between -mt-12 mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 border-4 border-slate-800 flex items-center justify-center text-white text-3xl font-bold">
                                {profile.full_name?.charAt(0) || "?"}
                            </div>

                            <div className="flex gap-2">
                                {isOwnProfile ? (
                                    <Link
                                        href="/profil"
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Düzenle
                                    </Link>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleFollow}
                                            disabled={followLoading}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isFollowing
                                                ? "bg-slate-700 hover:bg-red-600 text-white"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                }`}
                                        >
                                            {followLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : isFollowing ? (
                                                <>
                                                    <UserMinus className="w-4 h-4" />
                                                    Takipten Çık
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    Takip Et
                                                </>
                                            )}
                                        </button>
                                        <Link
                                            href={`/mesajlar?to=${userId}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Name & Bio */}
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {profile.full_name}
                        </h1>
                        {profile.bio && (
                            <p className="text-slate-400 mb-4">{profile.bio}</p>
                        )}

                        {/* Info */}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
                            {profile.vehicle_brand && profile.vehicle_model && (
                                <span className="flex items-center gap-1">
                                    <Car className="w-4 h-4" />
                                    {profile.vehicle_brand} {profile.vehicle_model}
                                </span>
                            )}
                            {profile.city && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {profile.city}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(profile.created_at)} tarihinde katıldı
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 text-sm">
                            <div>
                                <span className="text-white font-bold">{profile.following_count}</span>
                                <span className="text-slate-400 ml-1">Takip</span>
                            </div>
                            <div>
                                <span className="text-white font-bold">{profile.follower_count}</span>
                                <span className="text-slate-400 ml-1">Takipçi</span>
                            </div>
                            <div>
                                <span className="text-white font-bold">{profile.post_count}</span>
                                <span className="text-slate-400 ml-1">Entry</span>
                            </div>
                            <div>
                                <span className="text-emerald-500 font-bold">{profile.checkin_count}</span>
                                <span className="text-slate-400 ml-1">Check-in</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                {badges.length > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            Rozetler
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {badges.map((ub) => (
                                <div
                                    key={ub.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg"
                                    title={ub.badge.description}
                                >
                                    <span className="text-2xl">{ub.badge.icon}</span>
                                    <div>
                                        <div className="text-sm text-white font-medium">{ub.badge.name}</div>
                                        <div className="text-xs text-slate-500">{formatRelativeDate(ub.earned_at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Charging Stats */}
                {profile.checkin_count > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Battery className="w-5 h-5 text-emerald-500" />
                            Şarj İstatistikleri
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-emerald-500">{profile.checkin_count}</div>
                                <div className="text-sm text-slate-400">Toplam Şarj</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-blue-500">{profile.total_kwh?.toFixed(0) || 0}</div>
                                <div className="text-sm text-slate-400">kWh Enerji</div>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-yellow-500">
                                    {((profile.total_kwh || 0) * 0.15).toFixed(0)}
                                </div>
                                <div className="text-sm text-slate-400">kg CO₂ Tasarruf</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`px-4 py-2 rounded-lg transition-colors ${activeTab === "posts"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700/50 text-slate-400 hover:text-white"
                            }`}
                    >
                        Entry&apos;ler ({posts.length})
                    </button>
                </div>

                {/* Posts */}
                {activeTab === "posts" && (
                    <div className="space-y-3">
                        {posts.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Henüz entry yok
                            </div>
                        ) : (
                            posts.map((post) => {
                                const score = post.upvotes - post.downvotes;
                                return (
                                    <Link
                                        key={post.id}
                                        href={`/topluluk/${post.id}`}
                                        className="block bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex flex-col items-center text-sm">
                                                <ChevronUp className={`w-4 h-4 ${score > 0 ? "text-emerald-500" : "text-slate-500"}`} />
                                                <span className={score > 0 ? "text-emerald-500" : score < 0 ? "text-red-500" : "text-slate-400"}>
                                                    {score}
                                                </span>
                                                <ChevronDown className={`w-4 h-4 ${score < 0 ? "text-red-500" : "text-slate-500"}`} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-medium mb-1 line-clamp-1">{post.title}</h3>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{formatRelativeDate(post.created_at)}</span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageSquare className="w-3 h-3" />
                                                        {post.comment_count}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}