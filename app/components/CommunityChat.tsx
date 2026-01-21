"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Send, User, MessageCircle, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Message {
    id: string;
    user_id: string;
    full_name: string;
    content: string;
    created_at: string;
}

export default function CommunityChat() {
    const { user, session } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [showScrollButton, setShowScrollButton] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // 1. Fetch initial messages
        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from("community_messages")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(50);

                if (!error && data) {
                    setMessages(data.reverse());
                } else if (error) {
                    const isTableMissing = error.code === '42P01' || (error.message && error.message.includes("Could not find the table"));
                    if (isTableMissing) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn("Topluluk sohbet tablosu henüz oluşturulmamış.");
                        }
                    }
                }
            } catch (err) {
                console.error("Fetch messages failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        // 2. Real-time subscription
        const channel = supabase
            .channel("community_live_chat")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "community_messages" },
                (payload: { new: Message }) => {
                    const newMsg = payload.new;
                    setMessages((prev) => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;

                        // Scroll check
                        if (scrollRef.current) {
                            const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 100;
                            if (!isNearBottom && newMsg.user_id !== user?.id) {
                                setUnreadCount(prev => prev + 1);
                            }
                        }

                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, user?.id]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior
            });
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        if (unreadCount === 0 || (scrollRef.current && scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 100)) {
            scrollToBottom('auto');
        }
    }, [messages]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 150;
            setShowScrollButton(!isNearBottom);
            if (isNearBottom) setUnreadCount(0);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || isSending) return;

        setIsSending(true);
        const text = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase.from("community_messages").insert([{
                user_id: user.id,
                full_name: user.fullName || "Anonim",
                content: text,
            }]);

            if (error) {
                console.error("Error sending message:", error);
            } else {
                scrollToBottom();
            }
        } catch (err) {
            console.error("Send message failed:", err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-white/5 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 relative">
            {/* Premium Header */}
            <div className="px-8 py-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/5 backdrop-blur-2xl relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group">
                        <MessageCircle className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-black text-zinc-900 dark:text-white tracking-tight">CANLI AKIŞ</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Topluluk Terminali</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Feed */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-[#0A0A0A] scrollbar-none"
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-[10px] text-zinc-400 font-bold tracking-[0.2em] uppercase">Şifreleme Çözülüyor...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in zoom-in duration-700">
                        <div className="w-16 h-16 bg-zinc-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-zinc-100 dark:border-white/10">
                            <Zap className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Sessizliği Bozun</p>
                        <p className="text-[11px] text-zinc-400 mt-2 font-medium">İlk mesajı siz gönderin ve topluluğu başlatın.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const isOwn = msg.user_id === user?.id;
                            const showName = !isOwn && (idx === 0 || messages[idx - 1].user_id !== msg.user_id);

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`max-w-[85%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                                        {showName && (
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter mb-1.5 px-2">
                                                {msg.full_name}
                                            </span>
                                        )}
                                        <div className={`relative px-5 py-3.5 rounded-3xl text-[13px] leading-relaxed shadow-sm group transition-all duration-300 ${isOwn
                                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-lg"
                                            : "bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-100 dark:border-white/5 rounded-tl-lg"
                                            }`}>
                                            {msg.content}
                                            <span className={`absolute bottom-1 ${isOwn ? 'right-3' : 'left-3'} opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold uppercase tracking-tighter ${isOwn ? 'text-white/40' : 'text-zinc-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Floating Nav Button */}
            <AnimatePresence>
                {showScrollButton && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => scrollToBottom()}
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-2xl border border-white/10 flex items-center gap-2 z-20 hover:scale-105 active:scale-95 transition-all group"
                    >
                        <Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-tight">
                            {unreadCount > 0 ? `${unreadCount} Yeni Mesaj` : "En Alta Git"}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input Section */}
            <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] relative z-10">
                <form onSubmit={handleSendMessage} className="relative">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={newMessage}
                                disabled={!session || isLoading}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={session ? "Mesajınızı bırakın..." : "Sohbet için giriş yapın"}
                                className="w-full pl-6 pr-16 py-5 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-[14px] font-medium transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || !session || isSending}
                                className="absolute right-2.5 top-2.5 bottom-2.5 px-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-20 transition-all duration-300 flex items-center justify-center shadow-xl group"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                            </button>
                        </div>
                    </div>
                </form>
                {!session && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center"
                    >
                        <p className="text-[11px] font-bold text-zinc-400 tracking-tight">
                            Hemen katılmak için <Link href="/giris" className="text-emerald-500 hover:underline">Giriş Yapın</Link>
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
