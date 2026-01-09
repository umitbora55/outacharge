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
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center max-w-md shadow-xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Giriş Gerekli</h2>
                    <p className="text-gray-500 dark:text-zinc-400 mb-8">Bildirimlerinizi görmek ve toplulukla etkileşimde kalmak için giriş yapmalısınız.</p>
                    <Link
                        href="/?login=true"
                        className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
            <HeaderWhite />

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 mb-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/topluluk"
                                className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-7 h-7 text-emerald-500" />
                                Bildirimler
                                {unreadCount > 0 && (
                                    <span className="ml-1 px-2.5 py-0.5 bg-emerald-500 text-zinc-950 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                        {unreadCount} Yeni
                                    </span>
                                )}
                            </h1>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1.5 text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                                <span className="hidden sm:inline">Hepsini Oku</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-gray-50 dark:bg-zinc-950 p-1.5 rounded-2xl border border-gray-200 dark:border-zinc-800">
                        <button
                            onClick={() => setFilter("all")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === "all"
                                ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm border border-gray-100 dark:border-zinc-700"
                                : "text-gray-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                        >
                            Tümü
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === "unread"
                                ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm border border-gray-100 dark:border-zinc-700"
                                : "text-gray-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                        >
                            Okunmamış
                            {unreadCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Bell className="w-10 h-10 text-gray-300 dark:text-zinc-700" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                                {filter === "unread" ? "Okunmamış bildirim yok" : "Henüz bildirim yok"}
                            </h3>
                            <p className="text-gray-500 dark:text-zinc-400 max-w-xs mx-auto">
                                Yeni aktiviteler olduğunda burada anlık olarak görebilirsiniz.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {notifications.map((notif) => {
                                    const Icon = notificationIcons[notif.type] || Bell;
                                    const colorClass = notificationColors[notif.type] || "text-gray-400 bg-gray-500/20";

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`relative group transition-all ${!notif.is_read ? "bg-emerald-50/30 dark:bg-emerald-500/5" : ""}`}
                                        >
                                            <Link
                                                href={getNotificationLink(notif)}
                                                onClick={() => !notif.is_read && markAsRead(notif.id)}
                                                className="flex items-start gap-5 p-5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                            >
                                                {/* Left Column: Avatar/Icon */}
                                                <div className="relative flex-shrink-0">
                                                    {notif.from_user ? (
                                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-[2px] shadow-md group-hover:scale-110 transition-transform">
                                                            <div className="w-full h-full rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white font-bold text-xl overflow-hidden">
                                                                {notif.from_user.avatar_url ? (
                                                                    <img src={notif.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{notif.from_user.full_name?.charAt(0) || "?"}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorClass} shadow-md group-hover:scale-110 transition-transform`}>
                                                            <Icon className="w-7 h-7" />
                                                        </div>
                                                    )}

                                                    {/* Type Indicator Mini Icon */}
                                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center flex-shrink-0 ${colorClass} z-10 shadow-sm`}>
                                                        <Icon className="w-3 h-3" />
                                                    </div>
                                                </div>

                                                {/* Center Column: Content */}
                                                <div className="flex-1 min-w-0 pr-12">
                                                    <p className={`text-[15px] leading-relaxed ${!notif.is_read ? "text-zinc-900 dark:text-white font-bold" : "text-gray-600 dark:text-zinc-300 font-medium"}`}>
                                                        {getNotificationText(notif)}
                                                    </p>
                                                    {notif.title && (
                                                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1.5 italic font-medium line-clamp-1 border-l-2 border-gray-100 dark:border-zinc-800 pl-3">
                                                            &quot;{notif.title}&quot;
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2.5">
                                                        <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                                                            {formatDate(notif.created_at)}
                                                        </span>
                                                        {!notif.is_read && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Action Buttons (Visible on Hover/Focus) */}
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            markAsRead(notif.id);
                                                        }}
                                                        className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-white text-zinc-500 dark:text-zinc-400 rounded-xl transition-all shadow-sm"
                                                        title="Okundu işaretle"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        deleteNotification(notif.id);
                                                    }}
                                                    className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-500 dark:text-zinc-400 rounded-xl transition-all shadow-sm"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}