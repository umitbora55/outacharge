"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
import {
    ArrowLeft,
    Bell,
    UserPlus,
    MessageSquare,
    Heart,
    ChevronUp,
    Award,
    Mail,
    AtSign,
    Loader2,
    Check,
    CheckCheck,
    Trash2
} from "lucide-react";

interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string | null;
    content: string | null;
    from_user_id: string | null;
    post_id: string | null;
    comment_id: string | null;
    is_read: boolean;
    created_at: string;
    from_user?: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

const notificationIcons: Record<string, typeof UserPlus> = {
    follow: UserPlus,
    post_vote: ChevronUp,
    post_comment: MessageSquare,
    comment_like: Heart,
    comment_reply: MessageSquare,
    message: Mail,
    badge_earned: Award,
    mention: AtSign,
};

const notificationColors: Record<string, string> = {
    follow: "text-blue-500 bg-blue-500/20",
    post_vote: "text-emerald-500 bg-emerald-500/20",
    post_comment: "text-purple-500 bg-purple-500/20",
    comment_like: "text-red-500 bg-red-500/20",
    comment_reply: "text-cyan-500 bg-cyan-500/20",
    message: "text-yellow-500 bg-yellow-500/20",
    badge_earned: "text-orange-500 bg-orange-500/20",
    mention: "text-pink-500 bg-pink-500/20",
};

export default function BildirimlerPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            let query = supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (filter === "unread") {
                query = query.eq("is_read", false);
            }

            const { data, error } = await query;

            if (error) throw error;

            // from_user bilgilerini al
            const notificationsWithUsers: Notification[] = [];

            for (const notif of data || []) {
                let fromUser = null;
                if (notif.from_user_id) {
                    const { data: userData } = await supabase
                        .from("users")
                        .select("id, full_name, avatar_url")
                        .eq("id", notif.from_user_id)
                        .single();
                    fromUser = userData;
                }
                notificationsWithUsers.push({ ...notif, from_user: fromUser || undefined });
            }

            setNotifications(notificationsWithUsers);
        } catch (err) {
            console.error("Notifications fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [user, filter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Realtime subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        try {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId);

            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
        } catch (err) {
            console.error("Mark as read error:", err);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        try {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Mark all as read error:", err);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            await supabase
                .from("notifications")
                .delete()
                .eq("id", notificationId);

            setNotifications(notifications.filter(n => n.id !== notificationId));
        } catch (err) {
            console.error("Delete notification error:", err);
        }
    };

    const getNotificationLink = (notif: Notification): string => {
        switch (notif.type) {
            case "follow":
                return `/kullanici/${notif.from_user_id}`;
            case "post_vote":
            case "post_comment":
            case "mention":
                return notif.post_id ? `/topluluk/${notif.post_id}` : "/topluluk";
            case "comment_like":
            case "comment_reply":
                return notif.post_id ? `/topluluk/${notif.post_id}` : "/topluluk";
            case "message":
                return "/mesajlar";
            case "badge_earned":
                return `/kullanici/${notif.user_id}`;
            default:
                return "/topluluk";
        }
    };

    const getNotificationText = (notif: Notification): string => {
        const userName = notif.from_user?.full_name || "Birisi";

        switch (notif.type) {
            case "follow":
                return `${userName} seni takip etmeye başladı`;
            case "post_vote":
                return `${userName} entry'ni beğendi`;
            case "post_comment":
                return `${userName} entry'ne yorum yaptı`;
            case "comment_like":
                return `${userName} yorumunu beğendi`;
            case "comment_reply":
                return `${userName} yorumuna cevap verdi`;
            case "message":
                return `${userName} sana mesaj gönderdi`;
            case "badge_earned":
                return notif.content || "Yeni bir rozet kazandın!";
            case "mention":
                return `${userName} senden bahsetti`;
            default:
                return notif.content || "Yeni bildirim";
        }
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

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (!user) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#000000] flex items-center justify-center p-4 selection:bg-red-500/30 font-sans">
                <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[3rem] p-12 text-center max-w-md shadow-2xl">
                    <div className="w-24 h-24 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Bell className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-light text-zinc-900 dark:text-white mb-4 tracking-tight uppercase">Giriş Gerekli</h2>
                    <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.2em] mb-12">Authorization Required for Network Access</p>
                    <Link
                        href="/?login=true"
                        className="inline-flex items-center justify-center w-full px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-widest text-[11px]"
                    >
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
            <HeaderWhite />

            {/* Cinematic Hero Section - Activity & Network */}
            <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url("/images/community-hero.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
                </div>

                <div className="container max-w-6xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                            <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Activity & Network</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
                            Hub / <br />
                            <span className="font-medium">Bildirimler.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
                            Monitor architectural interactions and network responses synchronized across your profile.
                        </p>

                        {/* Integrated Stats - Technical Specification Style */}
                        <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {unreadCount}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    PENDING SYNC
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums uppercase">
                                    {loading ? "..." : notifications.length}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    ARCHIVED UNITS
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container max-w-4xl mx-auto px-6 pb-32 relative z-20">
                {/* Minimalist Controls Section */}
                <div className="pt-20 pb-16 border-b border-zinc-100 dark:border-zinc-950/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex items-baseline gap-6 group">
                            <Link href="/topluluk" className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-white/[0.05] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <div className="flex items-baseline gap-4">
                                <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-white">Active Logs</h2>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-emerald-500 transition-colors">
                                    {filter === "unread" ? "FILTERED: UNREAD" : "TOTAL ARCHIVE"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex bg-[#FAFAFA] dark:bg-zinc-950/40 p-1.5 rounded-2xl border border-zinc-50 dark:border-white/[0.03]">
                                <button
                                    onClick={() => setFilter("all")}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === "all"
                                        ? "bg-white dark:bg-zinc-900 text-emerald-500 shadow-xl shadow-black/5"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter("unread")}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === "unread"
                                        ? "bg-white dark:bg-zinc-900 text-emerald-500 shadow-xl shadow-black/5"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                        }`}
                                >
                                    Unread
                                </button>
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notifications Feed - Technical Archive Style */}
                <div className="pt-20">
                    {loading ? (
                        <div className="flex items-center justify-center py-40">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[3rem]">
                            <Bell className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-8" />
                            <h3 className="text-xl font-light text-zinc-400 uppercase tracking-widest">No active logs found</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-2">NETWORK SYNC OPTIMAL</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notif) => {
                                const Icon = notificationIcons[notif.type] || Bell;
                                const colorClass = notificationColors[notif.type] || "text-zinc-400 bg-zinc-500/10";

                                return (
                                    <div
                                        key={notif.id}
                                        className={`group relative flex items-center justify-between p-8 rounded-[2.5rem] border transition-all ${!notif.is_read
                                            ? "bg-white dark:bg-[#0A0A0A] border-emerald-500/20 shadow-2xl shadow-emerald-500/5"
                                            : "bg-[#FAFAFA] dark:bg-[#080808] border-zinc-50 dark:border-white/[0.03] hover:border-emerald-500/10"
                                            }`}
                                    >
                                        <Link
                                            href={getNotificationLink(notif)}
                                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                                            className="flex-1 flex items-center gap-10"
                                        >
                                            <div className="relative flex-shrink-0">
                                                {notif.from_user ? (
                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 dark:bg-white/5 p-1 group-hover:scale-105 transition-transform">
                                                        <div className="w-full h-full rounded-[1.2rem] bg-zinc-800 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-white font-light text-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                                            {notif.from_user.avatar_url ? (
                                                                <img src={notif.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{notif.from_user.full_name?.charAt(0) || "?"}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 ${colorClass} grayscale group-hover:grayscale-0 transition-all`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                )}

                                                {!notif.is_read && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-[#0A0A0A] animate-pulse" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pr-12">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${!notif.is_read ? "text-emerald-500" : "text-zinc-500 opacity-50"}`}>
                                                        {notif.type.replace("_", " ")} LOG
                                                    </span>
                                                    <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700">/</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{formatDate(notif.created_at)}</span>
                                                </div>
                                                <p className={`text-xl font-light tracking-tight leading-snug ${!notif.is_read ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
                                                    {getNotificationText(notif)}
                                                </p>
                                                {notif.title && (
                                                    <div className="mt-4 flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <div className="h-px w-4 bg-zinc-400" />
                                                        <p className="text-[11px] font-medium text-zinc-400 italic truncate max-w-sm">
                                                            "{notif.title}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </Link>

                                        {/* Action Sub-Menu */}
                                        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            {!notif.is_read && (
                                                <button
                                                    onClick={() => markAsRead(notif.id)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/[0.05] text-zinc-400 hover:text-emerald-500 transition-all"
                                                    title="Mark as sync"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notif.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/[0.05] text-zinc-400 hover:text-red-500 transition-all"
                                                title="Purge unit"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-48 flex flex-col items-center">
                    <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-900" />
                    <p className="text-zinc-100 dark:text-zinc-900/10 text-[8vw] font-black leading-none select-none tracking-tighter mt-12">
                        NOTIFICATIONS
                    </p>
                </div>
            </main>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}