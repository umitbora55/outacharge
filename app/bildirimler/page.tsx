"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
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

const notificationIcons: Record<string, any> = {
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
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center max-w-md">
                    <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Giriş Gerekli</h2>
                    <p className="text-slate-400 mb-6">Bildirimlerinizi görmek için giriş yapmalısınız.</p>
                    <Link
                        href="/?login=true"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                        Giriş Yap
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/topluluk"
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Link>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Bell className="w-6 h-6 text-emerald-500" />
                                Bildirimler
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </h1>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Tümünü Okundu İşaretle
                            </button>
                        )}
                    </div>

                    {/* Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === "all"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-700/50 text-slate-400 hover:text-white"
                                }`}
                        >
                            Tümü
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === "unread"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-700/50 text-slate-400 hover:text-white"
                                }`}
                        >
                            Okunmamış
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl text-slate-400 mb-2">
                            {filter === "unread" ? "Okunmamış bildirim yok" : "Henüz bildirim yok"}
                        </h3>
                        <p className="text-slate-500">
                            Yeni aktiviteler olduğunda burada göreceksin
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {notifications.map((notif) => {
                            const Icon = notificationIcons[notif.type] || Bell;
                            const colorClass = notificationColors[notif.type] || "text-slate-500 bg-slate-500/20";

                            return (
                                <div
                                    key={notif.id}
                                    className={`relative ${!notif.is_read ? "bg-slate-800/30" : ""}`}
                                >
                                    <Link
                                        href={getNotificationLink(notif)}
                                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                                        className="flex items-start gap-4 p-4 hover:bg-slate-800/50 transition-colors"
                                    >
                                        {/* Avatar or Icon */}
                                        {notif.from_user ? (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {notif.from_user.full_name?.charAt(0) || "?"}
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className={`${!notif.is_read ? "text-white" : "text-slate-300"}`}>
                                                {getNotificationText(notif)}
                                            </p>
                                            {notif.title && (
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                                    &quot;{notif.title}&quot;
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500 mt-1">
                                                {formatDate(notif.created_at)}
                                            </p>
                                        </div>

                                        {/* Type Icon */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                    </Link>

                                    {/* Actions */}
                                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                        {!notif.is_read && (
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                                title="Okundu işaretle"
                                            >
                                                <Check className="w-3 h-3 text-slate-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notif.id)}
                                            className="p-1.5 bg-slate-700 hover:bg-red-600 rounded-lg transition-colors"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-3 h-3 text-slate-400" />
                                        </button>
                                    </div>

                                    {/* Unread Indicator */}
                                    {!notif.is_read && (
                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}