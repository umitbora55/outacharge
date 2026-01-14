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
            <div className="min-h-screen bg-white dark:bg-[#000000] flex items-center justify-center p-4 selection:bg-red-500/30 font-sans">
                <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[3rem] p-12 text-center max-w-md shadow-2xl">
                    <div className="w-24 h-24 bg-emerald-500/5 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Mail className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-light text-zinc-900 dark:text-white mb-4 tracking-tight uppercase">Giriş Gerekli</h2>
                    <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.2em] mb-12">Authorization Required for Comms Access</p>
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

            {/* Cinematic Hero Section - Direct Comms */}
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
                            <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Direct Comms</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
                            Sync / <br />
                            <span className="font-medium">Mesajlar.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
                            Maintain peer-to-peer connectivity and encrypted tactical exchanges within the fleet network.
                        </p>

                        {/* Integrated Stats - Technical Specification Style */}
                        <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {conversations.length}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    ACTIVE CYCLES
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums uppercase text-emerald-500">
                                    {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    UNREAD LOAD
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
                                <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-white">Active Channels</h2>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-emerald-500 transition-colors">ESTABLISHED COMMS</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowNewChat(!showNewChat)}
                            className={`px-8 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${showNewChat
                                ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                                : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20"
                                }`}
                        >
                            {showNewChat ? "Terminate Session" : "Initiate Comms"}
                        </button>
                    </div>

                    {/* New Chat Search - Integrated */}
                    {showNewChat && (
                        <div className="mt-12 animate-in slide-in-from-top-4 duration-500">
                            <div className="bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.03] rounded-[2.5rem] p-8">
                                <div className="relative group mb-8">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH CORE IDENTITY..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-14 pr-6 py-4 bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] rounded-[1.5rem] text-zinc-900 dark:text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-bold tracking-widest text-[10px]"
                                        autoFocus
                                    />
                                </div>

                                {searchQuery.length >= 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {searching ? (
                                            <div className="col-span-full py-12 text-center">
                                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="col-span-full py-12 text-center">
                                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No matching identity</p>
                                            </div>
                                        ) : (
                                            searchResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => startConversation(result.id)}
                                                    className="flex items-center gap-5 p-4 bg-white dark:bg-zinc-900/40 border border-zinc-50 dark:border-white/[0.01] rounded-[1.5rem] hover:border-emerald-500/30 transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-[1.2rem] bg-zinc-950 dark:bg-white/5 p-1 group-hover:scale-105 transition-transform">
                                                        <div className="w-full h-full rounded-[1rem] bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-white font-light text-lg overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                                            {result.avatar_url ? (
                                                                <img src={result.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{result.full_name?.charAt(0) || "?"}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">{result.full_name}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Conversations List - Technical Ledger Style */}
                <div className="pt-20">
                    {loading ? (
                        <div className="flex items-center justify-center py-40">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-[3rem]">
                            <MessageSquare className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-8" />
                            <h3 className="text-xl font-light text-zinc-400 uppercase tracking-widest">No active channels</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-2">NETWORK STANDBY</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {conversations.map((conv) => (
                                <Link
                                    key={conv.id}
                                    href={`/mesajlar/${conv.id}`}
                                    className={`group flex items-center gap-10 p-8 rounded-[2.5rem] border transition-all ${conv.unread_count > 0
                                        ? "bg-white dark:bg-[#0A0A0A] border-emerald-500/20 shadow-2xl shadow-emerald-500/5"
                                        : "bg-[#FAFAFA] dark:bg-[#080808] border-zinc-50 dark:border-white/[0.03] hover:border-emerald-500/10"
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 dark:bg-white/5 p-1 group-hover:scale-105 transition-transform">
                                            <div className="w-full h-full rounded-[1.2rem] bg-zinc-800 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-white font-light text-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                                {conv.other_user.avatar_url ? (
                                                    <img src={conv.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{conv.other_user.full_name?.charAt(0) || "?"}</span>
                                                )}
                                            </div>
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-emerald-500 border-4 border-white dark:border-[#0A0A0A] rounded-full flex items-center justify-center px-1 text-[8px] text-zinc-950 font-black">
                                                {conv.unread_count}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xl font-light tracking-tight ${conv.unread_count > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-500"}`}>
                                                    {conv.other_user.full_name}
                                                </span>
                                                {conv.unread_count > 0 && (
                                                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                                        Active Data
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest opacity-50">
                                                {formatTime(conv.last_message_at)}
                                            </span>
                                        </div>
                                        {conv.last_message && (
                                            <p className={`text-[15px] truncate leading-relaxed ${conv.unread_count > 0 ? "text-zinc-800 dark:text-zinc-100 font-medium" : "text-zinc-500 dark:text-zinc-500 font-light"}`}>
                                                {conv.last_message.sender_id === user.id && (
                                                    <span className="text-emerald-500/80 mr-2 font-bold uppercase tracking-widest text-[10px]">YOU /</span>
                                                )}
                                                {conv.last_message.content}
                                            </p>
                                        )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/[0.05] text-zinc-400 group-hover:text-emerald-500 transition-all">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-48 flex flex-col items-center">
                    <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-900" />
                    <p className="text-zinc-100 dark:text-zinc-900/10 text-[8vw] font-black leading-none select-none tracking-tighter mt-12">
                        MESSAGES
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