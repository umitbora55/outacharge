"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
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

function MesajlarContent() {
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
            <div className="min-h-screen bg-gray-50 dark:bg-transparent flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center max-w-md shadow-xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Giriş Gerekli</h2>
                    <p className="text-gray-500 dark:text-zinc-400 mb-8">Mesajlarınıza ulaşmak ve sürücülerle iletişimde kalmak için giriş yapmalısınız.</p>
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
        <div className="min-h-screen bg-gray-50 dark:bg-transparent transition-colors">
            <HeaderWhite />

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 mb-8 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/topluluk"
                                className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Mail className="w-7 h-7 text-emerald-500" />
                                Mesajlar
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowNewChat(!showNewChat)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${showNewChat
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-none"
                                : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20"
                                }`}
                        >
                            {showNewChat ? "İptal" : "Yeni Mesaj"}
                        </button>
                    </div>

                    {/* New Chat Search */}
                    {showNewChat && (
                        <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Kullanıcı adı ile ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                                    autoFocus
                                />
                            </div>

                            {/* Search Results */}
                            {searchQuery.length >= 2 && (
                                <div className="mt-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                    {searching ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-500 dark:text-zinc-400 font-medium">Kullanıcı bulunamadı</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {searchResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => startConversation(result.id)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-[2px] group-hover:scale-110 transition-transform">
                                                        <div className="w-full h-full rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white font-bold text-lg overflow-hidden">
                                                            {result.avatar_url ? (
                                                                <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{result.full_name?.charAt(0) || "?"}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-zinc-900 dark:text-white font-bold">{result.full_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Conversations List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-zinc-700" />
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Sohbetler Boş</h3>
                            <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-xs mx-auto">Henüz kimseyle mesajlaşmadınız. Yeni bir sohbet başlatmak için yukarıdaki butonu kullanın.</p>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                <Users className="w-5 h-5" />
                                Kullanıcı Ara
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <div className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                {conversations.map((conv) => (
                                    <Link
                                        key={conv.id}
                                        href={`/mesajlar/${conv.id}`}
                                        className="flex items-center gap-5 p-5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-all group"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 p-[2px] group-hover:scale-105 transition-transform">
                                                <div className="w-full h-full rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white font-bold text-xl overflow-hidden shadow-inner">
                                                    {conv.other_user.avatar_url ? (
                                                        <img src={conv.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{conv.other_user.full_name?.charAt(0) || "?"}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {conv.unread_count > 0 && (
                                                <div className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center px-1 text-[10px] text-zinc-950 font-black shadow-lg">
                                                    {conv.unread_count > 9 ? "9+" : conv.unread_count}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`text-[17px] truncate ${conv.unread_count > 0 ? "text-zinc-900 dark:text-white font-bold" : "text-gray-800 dark:text-zinc-200 font-bold"}`}>
                                                    {conv.other_user.full_name}
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex-shrink-0 ml-4">
                                                    {formatTime(conv.last_message_at)}
                                                </span>
                                            </div>
                                            {conv.last_message && (
                                                <p className={`text-sm truncate leading-relaxed ${conv.unread_count > 0 ? "text-gray-950 dark:text-zinc-100 font-bold" : "text-gray-500 dark:text-zinc-400 font-medium"}`}>
                                                    {conv.last_message.sender_id === user.id && (
                                                        <span className="text-emerald-500/80 mr-1 font-bold italic">Siz:</span>
                                                    )}
                                                    {conv.last_message.content}
                                                </p>
                                            )}
                                        </div>

                                        {conv.unread_count > 0 && (
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 animate-pulse flex-shrink-0" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MesajlarPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        }>
            <MesajlarContent />
        </Suspense>
    );
}