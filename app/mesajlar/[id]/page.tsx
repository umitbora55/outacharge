"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    ArrowLeft,
    Send,
    Loader2,
    MoreVertical,
    Trash2,
    User,
    Check,
    CheckCheck
} from "lucide-react";

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface OtherUser {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

export default function MesajDetayPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const conversationId = params.id as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversation = useCallback(async () => {
        if (!user) return;

        try {
            // Konuşma bilgisi
            const { data: conv, error: convError } = await supabase
                .from("conversations")
                .select("*")
                .eq("id", conversationId)
                .single();

            if (convError) throw convError;

            // Yetki kontrolü
            if (conv.participant1_id !== user.id && conv.participant2_id !== user.id) {
                router.push("/mesajlar");
                return;
            }

            // Diğer kullanıcı
            const otherUserId = conv.participant1_id === user.id
                ? conv.participant2_id
                : conv.participant1_id;

            const { data: userData } = await supabase
                .from("users")
                .select("id, full_name, avatar_url")
                .eq("id", otherUserId)
                .single();

            setOtherUser(userData);

        } catch (err) {
            console.error("Conversation fetch error:", err);
            router.push("/mesajlar");
        }
    }, [user, conversationId, router]);

    const fetchMessages = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Okunmamış mesajları okundu olarak işaretle
            if (user) {
                await supabase
                    .from("messages")
                    .update({ is_read: true })
                    .eq("conversation_id", conversationId)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);
            }

        } catch (err) {
            console.error("Messages fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [conversationId, user]);

    useEffect(() => {
        fetchConversation();
        fetchMessages();
    }, [fetchConversation, fetchMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => [...prev, newMsg]);

                    // Okundu olarak işaretle (karşı taraftan geldiyse)
                    if (user && newMsg.sender_id !== user.id) {
                        supabase
                            .from("messages")
                            .update({ is_read: true })
                            .eq("id", newMsg.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, user]);

    const handleSend = async () => {
        if (!user || !newMessage.trim()) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase
                .from("messages")
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content
                });

            if (error) throw error;

            inputRef.current?.focus();
        } catch (err) {
            console.error("Send error:", err);
            setNewMessage(content); // Hata durumunda mesajı geri koy
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDeleteConversation = async () => {
        if (!confirm("Bu konuşmayı silmek istediğinizden emin misiniz?")) return;

        try {
            await supabase
                .from("conversations")
                .delete()
                .eq("id", conversationId);

            router.push("/mesajlar");
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDateDivider = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / 86400000);

        if (days === 0) return "Bugün";
        if (days === 1) return "Dün";
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    };

    const shouldShowDateDivider = (index: number) => {
        if (index === 0) return true;
        const currentDate = new Date(messages[index].created_at).toDateString();
        const prevDate = new Date(messages[index - 1].created_at).toDateString();
        return currentDate !== prevDate;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm flex-shrink-0">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/mesajlar"
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Link>

                            {otherUser && (
                                <Link
                                    href={`/kullanici/${otherUser.id}`}
                                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {otherUser.full_name?.charAt(0) || "?"}
                                    </div>
                                    <span className="text-white font-medium">{otherUser.full_name}</span>
                                </Link>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <MoreVertical className="w-5 h-5 text-slate-400" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[150px] z-10">
                                    <Link
                                        href={`/kullanici/${otherUser?.id}`}
                                        className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <User className="w-4 h-4" />
                                        Profili Gör
                                    </Link>
                                    <button
                                        onClick={handleDeleteConversation}
                                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Konuşmayı Sil
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            Henüz mesaj yok. İlk mesajı sen gönder!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => {
                                const isOwn = message.sender_id === user.id;

                                return (
                                    <div key={message.id}>
                                        {/* Date Divider */}
                                        {shouldShowDateDivider(index) && (
                                            <div className="flex items-center justify-center my-4">
                                                <div className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">
                                                    {formatDateDivider(message.created_at)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Message */}
                                        <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-[75%] px-4 py-2 rounded-2xl ${isOwn
                                                        ? "bg-emerald-600 text-white rounded-br-md"
                                                        : "bg-slate-700 text-white rounded-bl-md"
                                                    }`}
                                            >
                                                <p className="break-words">{message.content}</p>
                                                <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? "text-emerald-200" : "text-slate-400"}`}>
                                                    <span>{formatTime(message.created_at)}</span>
                                                    {isOwn && (
                                                        message.is_read ? (
                                                            <CheckCheck className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="bg-slate-800/80 border-t border-slate-700 backdrop-blur-sm flex-shrink-0">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Mesajınızı yazın..."
                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-full text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                            onClick={handleSend}
                            disabled={sending || !newMessage.trim()}
                            className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-colors"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}