"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    ArrowLeft,
    MessageSquare,
    Search,
    Loader2,
    Mail,
    Users,
    Circle
} from "lucide-react";

interface Conversation {
    id: string;
    participant1_id: string;
    participant2_id: string;
    last_message_at: string;
    other_user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
    last_message?: {
        content: string;
        sender_id: string;
        is_read: boolean;
    };
    unread_count: number;
}

interface UserSearchResult {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

export default function MesajlarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const toUserId = searchParams.get("to");

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);

    const fetchConversations = useCallback(async () => {
        if (!user) return;

        try {
            const { data: convs, error } = await supabase
                .from("conversations")
                .select("*")
                .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
                .order("last_message_at", { ascending: false });

            if (error) throw error;

            const conversationsWithUsers: Conversation[] = [];

            for (const conv of convs || []) {
                const otherUserId = conv.participant1_id === user.id
                    ? conv.participant2_id
                    : conv.participant1_id;

                // Diğer kullanıcı bilgisi
                const { data: otherUser } = await supabase
                    .from("users")
                    .select("id, full_name, avatar_url")
                    .eq("id", otherUserId)
                    .single();

                // Son mesaj
                const { data: lastMsg } = await supabase
                    .from("messages")
                    .select("content, sender_id, is_read")
                    .eq("conversation_id", conv.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                // Okunmamış mesaj sayısı
                const { count } = await supabase
                    .from("messages")
                    .select("*", { count: "exact", head: true })
                    .eq("conversation_id", conv.id)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);

                conversationsWithUsers.push({
                    ...conv,
                    other_user: otherUser || { id: otherUserId, full_name: "Kullanıcı", avatar_url: null },
                    last_message: lastMsg || undefined,
                    unread_count: count || 0
                });
            }

            setConversations(conversationsWithUsers);
        } catch (err) {
            console.error("Conversations fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // URL'de to parametresi varsa yeni konuşma başlat
    useEffect(() => {
        if (toUserId && user) {
            startConversation(toUserId);
        }
    }, [toUserId, user]);

    const searchUsers = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, full_name, avatar_url")
                .neq("id", user?.id)
                .ilike("full_name", `%${query}%`)
                .limit(10);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const startConversation = async (otherUserId: string) => {
        if (!user) return;

        try {
            // Mevcut konuşma var mı kontrol et
            const [id1, id2] = [user.id, otherUserId].sort();

            const { data: existing } = await supabase
                .from("conversations")
                .select("id")
                .eq("participant1_id", id1)
                .eq("participant2_id", id2)
                .single();

            if (existing) {
                router.push(`/mesajlar/${existing.id}`);
                return;
            }

            // Yeni konuşma oluştur
            const { data: newConv, error } = await supabase
                .from("conversations")
                .insert({
                    participant1_id: id1,
                    participant2_id: id2
                })
                .select()
                .single();

            if (error) throw error;

            router.push(`/mesajlar/${newConv.id}`);
        } catch (err) {
            console.error("Start conversation error:", err);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / 86400000);

        if (days === 0) {
            return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        } else if (days === 1) {
            return "Dün";
        } else if (days < 7) {
            return date.toLocaleDateString("tr-TR", { weekday: "short" });
        }
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center max-w-md">
                    <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Giriş Gerekli</h2>
                    <p className="text-slate-400 mb-6">Mesajlarınızı görmek için giriş yapmalısınız.</p>
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
                                <Mail className="w-6 h-6 text-emerald-500" />
                                Mesajlar
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowNewChat(!showNewChat)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
                        >
                            Yeni Mesaj
                        </button>
                    </div>

                    {/* New Chat Search */}
                    {showNewChat && (
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                />
                            </div>

                            {/* Search Results */}
                            {searchQuery.length >= 2 && (
                                <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                                    {searching ? (
                                        <div className="p-4 text-center">
                                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">
                                            Kullanıcı bulunamadı
                                        </div>
                                    ) : (
                                        searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => startConversation(result.id)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                                    {result.full_name?.charAt(0) || "?"}
                                                </div>
                                                <span className="text-white">{result.full_name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Conversations List */}
            <div className="max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl text-slate-400 mb-2">Henüz mesajınız yok</h3>
                        <p className="text-slate-500 mb-4">Yeni bir sohbet başlatın!</p>
                        <button
                            onClick={() => setShowNewChat(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                            <Users className="w-5 h-5" />
                            Kullanıcı Ara
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {conversations.map((conv) => (
                            <Link
                                key={conv.id}
                                href={`/mesajlar/${conv.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                        {conv.other_user.full_name?.charAt(0) || "?"}
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                            {conv.unread_count > 9 ? "9+" : conv.unread_count}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-medium ${conv.unread_count > 0 ? "text-white" : "text-slate-300"}`}>
                                            {conv.other_user.full_name}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {formatTime(conv.last_message_at)}
                                        </span>
                                    </div>
                                    {conv.last_message && (
                                        <p className={`text-sm truncate ${conv.unread_count > 0 ? "text-slate-300" : "text-slate-500"}`}>
                                            {conv.last_message.sender_id === user.id && "Sen: "}
                                            {conv.last_message.content}
                                        </p>
                                    )}
                                </div>

                                {conv.unread_count > 0 && (
                                    <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}