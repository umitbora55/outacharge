"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    MessageCircle,
    Send,
    Loader2,
    X,
    Users,
    LogIn,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
    MapPin,
    Eye,
    EyeOff,
    Mail,
    Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface ChargingStop {
    station: {
        id: number;
        name: string;
        operator: string;
        lat: number;
        lng: number;
        power: number;
        powerType: string;
        address: string;
    };
    arrivalCharge: number;
    departureCharge: number;
    chargingTime: number;
    chargingCost: number;
    distanceFromPrev: number;
}

interface Message {
    id: string;
    user_id: string;
    user_name: string;
    message: string;
    created_at: string;
    pending?: boolean;
    failed?: boolean;
    tempId?: string;
}

interface ChannelParticipant {
    station_id: number;
    is_active: boolean;
}

interface OnlineCount {
    [stationId: number]: number;
}

interface RouteChatHubProps {
    chargingStops: ChargingStop[];
    isOpen: boolean;
    onClose: () => void;
}

export default function RouteChatHub({
    chargingStops,
    isOpen,
    onClose,
}: RouteChatHubProps) {
    const { user } = useAuth();

    // Login form states
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    // Active tab (station id)
    const [activeStationId, setActiveStationId] = useState<number | null>(null);

    // Joined channels
    const [joinedChannels, setJoinedChannels] = useState<Set<number>>(new Set());
    const [joiningChannel, setJoiningChannel] = useState<number | null>(null);

    // Online counts per station
    const [onlineCounts, setOnlineCounts] = useState<OnlineCount>({});

    // Messages for active channel
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const pendingMessagesRef = useRef<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    // Tab scroll
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Set first station as active on open
    useEffect(() => {
        if (isOpen && chargingStops.length > 0 && !activeStationId) {
            setActiveStationId(chargingStops[0].station.id);
        }
    }, [isOpen, chargingStops, activeStationId]);

    // Fetch user's joined channels
    useEffect(() => {
        if (!user || !isOpen) return;

        const fetchJoinedChannels = async () => {
            const stationIds = chargingStops.map(s => s.station.id);

            const { data } = await supabase
                .from("chat_participants")
                .select("station_id, is_active")
                .eq("user_id", user.id)
                .in("station_id", stationIds)
                .eq("is_active", true);

            if (data) {
                setJoinedChannels(new Set(data.map(d => d.station_id)));
            }
        };

        fetchJoinedChannels();
    }, [user, isOpen, chargingStops]);

    // Fetch online counts for all stations
    useEffect(() => {
        if (!isOpen) return;

        const fetchOnlineCounts = async () => {
            const stationIds = chargingStops.map(s => s.station.id);
            const counts: OnlineCount = {};

            for (const stationId of stationIds) {
                const { count } = await supabase
                    .from("chat_participants")
                    .select("*", { count: "exact", head: true })
                    .eq("station_id", stationId)
                    .eq("is_active", true);

                counts[stationId] = count || 0;
            }

            setOnlineCounts(counts);
        };

        fetchOnlineCounts();

        // Refresh every 30 seconds
        const interval = setInterval(fetchOnlineCounts, 30000);
        return () => clearInterval(interval);
    }, [isOpen, chargingStops]);

    // Fetch messages when active station changes
    useEffect(() => {
        if (!activeStationId || !joinedChannels.has(activeStationId)) {
            setMessages([]);
            return;
        }

        fetchMessages();
    }, [activeStationId, joinedChannels]);

    // Realtime subscription for active channel
    useEffect(() => {
        if (!activeStationId || !joinedChannels.has(activeStationId)) return;

        const channel = supabase
            .channel(`route-chat-${activeStationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "station_messages",
                    filter: `station_id=eq.${activeStationId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;

                    setMessages((prev) => {
                        // Check for pending message match
                        const pendingMsg = prev.find(
                            (m) =>
                                m.pending &&
                                m.user_id === newMsg.user_id &&
                                m.message === newMsg.message
                        );

                        if (pendingMsg) {
                            pendingMessagesRef.current.delete(pendingMsg.tempId!);
                            return prev.map((m) =>
                                m.tempId === pendingMsg.tempId
                                    ? { ...newMsg, pending: false, failed: false }
                                    : m
                            );
                        }

                        // Check for duplicates
                        if (prev.some((m) => m.id === newMsg.id)) return prev;

                        return [...prev, newMsg];
                    });

                    // Auto scroll if at bottom
                    if (isAtBottomRef.current) {
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                        }, 100);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "station_messages",
                    filter: `station_id=eq.${activeStationId}`,
                },
                (payload) => {
                    const deletedId = payload.old.id;
                    setMessages((prev) => prev.filter((m) => m.id !== deletedId));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeStationId, joinedChannels]);

    // Scroll to bottom when messages load
    useEffect(() => {
        if (!loadingMessages && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            isAtBottomRef.current = true;
        }
    }, [loadingMessages, messages.length]);

    // Tab scroll detection
    useEffect(() => {
        const checkScroll = () => {
            if (!tabsContainerRef.current) return;
            const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        };

        checkScroll();
        tabsContainerRef.current?.addEventListener("scroll", checkScroll);
        window.addEventListener("resize", checkScroll);

        return () => {
            tabsContainerRef.current?.removeEventListener("scroll", checkScroll);
            window.removeEventListener("resize", checkScroll);
        };
    }, [chargingStops]);

    const fetchMessages = async () => {
        if (!activeStationId) return;

        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from("station_messages")
                .select("*")
                .eq("station_id", activeStationId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (!error && data) {
                setMessages(data.reverse());
            }
        } catch (err) {
            console.error("Messages fetch error:", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const joinChannel = async (stationId: number, stationName: string) => {
        if (!user) return;

        setJoiningChannel(stationId);

        try {
            const { error } = await supabase.from("chat_participants").upsert({
                user_id: user.id,
                station_id: stationId,
                station_name: stationName,
                is_active: true,
                last_seen: new Date().toISOString(),
            });

            if (!error) {
                setJoinedChannels((prev) => new Set([...prev, stationId]));
                setOnlineCounts((prev) => ({
                    ...prev,
                    [stationId]: (prev[stationId] || 0) + 1,
                }));
            }
        } catch (err) {
            console.error("Join channel error:", err);
        } finally {
            setJoiningChannel(null);
        }
    };

    const leaveChannel = async (stationId: number) => {
        if (!user) return;

        setJoiningChannel(stationId);

        try {
            const { error } = await supabase
                .from("chat_participants")
                .update({ is_active: false })
                .eq("user_id", user.id)
                .eq("station_id", stationId);

            if (!error) {
                setJoinedChannels((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(stationId);
                    return newSet;
                });
                setOnlineCounts((prev) => ({
                    ...prev,
                    [stationId]: Math.max(0, (prev[stationId] || 1) - 1),
                }));

                // Clear messages if leaving active channel
                if (activeStationId === stationId) {
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error("Leave channel error:", err);
        } finally {
            setJoiningChannel(null);
        }
    };

    const joinAllChannels = async () => {
        if (!user) return;

        for (const stop of chargingStops) {
            if (!joinedChannels.has(stop.station.id)) {
                await joinChannel(stop.station.id, stop.station.name);
            }
        }
    };

    const leaveAllChannels = async () => {
        if (!user) return;

        for (const stationId of joinedChannels) {
            await leaveChannel(stationId);
        }
    };

    const handleScroll = useCallback(() => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30;
    }, []);

    const sendMessage = async () => {
        if (!user || !newMessage.trim() || !activeStationId) return;

        const messageText = newMessage.trim();
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        pendingMessagesRef.current.add(tempId);

        const optimisticMessage: Message = {
            id: tempId,
            tempId,
            user_id: user.id,
            user_name: user.fullName,
            message: messageText,
            created_at: new Date().toISOString(),
            pending: true,
            failed: false,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage("");

        setTimeout(() => {
            inputRef.current?.focus();
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            isAtBottomRef.current = true;
        }, 50);

        try {
            const { data, error } = await supabase
                .from("station_messages")
                .insert({
                    station_id: activeStationId,
                    user_id: user.id,
                    user_name: user.fullName,
                    message: messageText,
                })
                .select()
                .single();

            if (error) throw error;

            if (pendingMessagesRef.current.has(tempId)) {
                pendingMessagesRef.current.delete(tempId);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.tempId === tempId ? { ...data, pending: false, failed: false } : m
                    )
                );
            }

            // Update last_seen
            await supabase
                .from("chat_participants")
                .update({ last_seen: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("station_id", activeStationId);

        } catch (err) {
            console.error("Send message error:", err);
            pendingMessagesRef.current.delete(tempId);
            setMessages((prev) =>
                prev.map((m) =>
                    m.tempId === tempId ? { ...m, pending: false, failed: true } : m
                )
            );
        }
    };

    const scrollTabs = (direction: "left" | "right") => {
        if (!tabsContainerRef.current) return;
        const scrollAmount = 200;
        tabsContainerRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");
        setLoginLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });

            if (error) {
                if (error.message.includes("Invalid login")) {
                    setLoginError("E-posta veya şifre hatalı");
                } else {
                    setLoginError(error.message);
                }
            } else {
                // Başarılı giriş - formu kapat
                setShowLoginForm(false);
                setLoginEmail("");
                setLoginPassword("");
            }
        } catch (err) {
            setLoginError("Bir hata oluştu. Tekrar deneyin.");
        } finally {
            setLoginLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return "şimdi";
        if (diffMins < 60) return `${diffMins} dk`;
        if (diffHours < 24) return `${diffHours} sa`;

        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const activeStop = chargingStops.find((s) => s.station.id === activeStationId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-zinc-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Rota Chat&apos;leri</h2>
                            <p className="text-xs text-zinc-400">
                                {chargingStops.length} durak • {joinedChannels.size} katıldığın
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {user && (
                            <>
                                {joinedChannels.size < chargingStops.length ? (
                                    <button
                                        onClick={joinAllChannels}
                                        className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full transition flex items-center gap-1"
                                    >
                                        <LogIn className="w-3 h-3" />
                                        Tümüne Katıl
                                    </button>
                                ) : (
                                    <button
                                        onClick={leaveAllChannels}
                                        className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-full transition flex items-center gap-1"
                                    >
                                        <LogOut className="w-3 h-3" />
                                        Tümünden Çık
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-zinc-100 border-b border-zinc-200 flex items-center relative flex-shrink-0">
                    {canScrollLeft && (
                        <button
                            onClick={() => scrollTabs("left")}
                            className="absolute left-0 z-10 h-full px-2 bg-gradient-to-r from-zinc-100 to-transparent"
                        >
                            <ChevronLeft className="w-5 h-5 text-zinc-600" />
                        </button>
                    )}

                    <div
                        ref={tabsContainerRef}
                        className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-2"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {chargingStops.map((stop, index) => {
                            const isActive = activeStationId === stop.station.id;
                            const isJoined = joinedChannels.has(stop.station.id);
                            const onlineCount = onlineCounts[stop.station.id] || 0;

                            return (
                                <button
                                    key={stop.station.id}
                                    onClick={() => setActiveStationId(stop.station.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${isActive
                                        ? "bg-white text-zinc-900 shadow-md"
                                        : "bg-transparent text-zinc-600 hover:bg-white/50"
                                        }`}
                                >
                                    <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <span className="max-w-[120px] truncate">{stop.station.operator}</span>
                                    {isJoined ? (
                                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            {onlineCount}
                                        </span>
                                    ) : (
                                        <span className="w-2 h-2 bg-zinc-300 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <button
                            onClick={() => scrollTabs("right")}
                            className="absolute right-0 z-10 h-full px-2 bg-gradient-to-l from-zinc-100 to-transparent"
                        >
                            <ChevronRight className="w-5 h-5 text-zinc-600" />
                        </button>
                    )}
                </div>

                {/* Active Station Info */}
                {activeStop && (
                    <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900 text-sm">
                                        {activeStop.station.name}
                                    </h3>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {activeStop.station.operator} • {activeStop.station.power} kW
                                    </p>
                                </div>
                            </div>

                            {user && (
                                <div>
                                    {joinedChannels.has(activeStop.station.id) ? (
                                        <button
                                            onClick={() => leaveChannel(activeStop.station.id)}
                                            disabled={joiningChannel === activeStop.station.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-full text-sm transition disabled:opacity-50"
                                        >
                                            {joiningChannel === activeStop.station.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <LogOut className="w-4 h-4" />
                                            )}
                                            Kanaldan Çık
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                joinChannel(activeStop.station.id, activeStop.station.name)
                                            }
                                            disabled={joiningChannel === activeStop.station.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm transition disabled:opacity-50"
                                        >
                                            {joiningChannel === activeStop.station.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <LogIn className="w-4 h-4" />
                                            )}
                                            Kanala Katıl
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Messages Area */}
                <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
                >
                    {!user ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                                <MessageCircle className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-zinc-800 font-semibold text-lg">Giriş Yapmanız Gerekiyor</p>
                            <p className="text-zinc-500 text-sm mt-1 mb-6">
                                Chat&apos;lere katılmak için lütfen giriş yapın
                            </p>
                            <button
                                onClick={() => setShowLoginForm(true)}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full font-medium transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
                            >
                                <LogIn className="w-5 h-5" />
                                Giriş Yap
                            </button>
                            <p className="text-zinc-400 text-xs mt-4">
                                Hesabınız yok mu?{" "}
                                <a href="/kayit" className="text-emerald-600 hover:text-emerald-700 font-medium">
                                    Kayıt olun
                                </a>
                            </p>
                        </div>
                    ) : !activeStationId ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-zinc-400">Bir kanal seçin</p>
                        </div>
                    ) : !joinedChannels.has(activeStationId) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-zinc-600 font-medium">Kanala Katılın</p>
                            <p className="text-zinc-400 text-sm mt-1">
                                Mesajları görmek ve yazmak için kanala katılın
                            </p>
                            <button
                                onClick={() =>
                                    activeStop &&
                                    joinChannel(activeStop.station.id, activeStop.station.name)
                                }
                                disabled={joiningChannel !== null}
                                className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition disabled:opacity-50"
                            >
                                {joiningChannel ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <LogIn className="w-4 h-4" />
                                )}
                                Kanala Katıl
                            </button>
                        </div>
                    ) : loadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                                <MessageCircle className="w-8 h-8 text-zinc-400" />
                            </div>
                            <p className="text-zinc-600 font-medium">Henüz mesaj yok</p>
                            <p className="text-zinc-400 text-sm mt-1">
                                İlk mesajı siz yazın!
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div
                                    key={msg.tempId || msg.id}
                                    className={`flex gap-3 ${user && msg.user_id === user.id ? "flex-row-reverse" : ""
                                        } ${msg.pending ? "opacity-60" : ""}`}
                                >
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${user && msg.user_id === user.id
                                            ? "bg-emerald-500 text-white"
                                            : "bg-zinc-200 text-zinc-600"
                                            }`}
                                    >
                                        {getInitials(msg.user_name)}
                                    </div>

                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.failed
                                            ? "bg-red-100 border border-red-200"
                                            : user && msg.user_id === user.id
                                                ? "bg-emerald-500 text-white"
                                                : "bg-zinc-100 text-zinc-900"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-xs font-medium ${msg.failed
                                                    ? "text-red-600"
                                                    : user && msg.user_id === user.id
                                                        ? "text-emerald-100"
                                                        : "text-zinc-500"
                                                    }`}
                                            >
                                                {msg.user_name}
                                            </span>
                                            <span
                                                className={`text-xs ${user && msg.user_id === user.id
                                                    ? "text-emerald-200"
                                                    : "text-zinc-400"
                                                    }`}
                                            >
                                                {msg.pending ? (
                                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                                ) : msg.failed ? (
                                                    <span className="text-red-500">!</span>
                                                ) : (
                                                    formatTime(msg.created_at)
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-sm break-words">{msg.message}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                {user && activeStationId && joinedChannels.has(activeStationId) && (
                    <div className="p-4 border-t border-zinc-200 bg-white flex-shrink-0">
                        <div className="flex gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Mesaj yazın..."
                                maxLength={500}
                                className="flex-1 bg-zinc-100 text-zinc-900 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-full transition"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Login Modal */}
            {showLoginForm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 text-center relative">
                            <button
                                onClick={() => {
                                    setShowLoginForm(false);
                                    setLoginError("");
                                }}
                                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-white text-xl font-bold">Hoş Geldiniz</h3>
                            <p className="text-emerald-100 text-sm mt-1">
                                Chat&apos;lere katılmak için giriş yapın
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="p-6 space-y-4">
                            {loginError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    {loginError}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-zinc-600 text-sm font-medium mb-2">
                                    E-posta
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="ornek@email.com"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-zinc-600 text-sm font-medium mb-2">
                                    Şifre
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password */}
                            <div className="text-right">
                                <a
                                    href="/sifre-sifirla"
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                    Şifremi Unuttum
                                </a>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-zinc-300 disabled:to-zinc-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {loginLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Giriş yapılıyor...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Giriş Yap
                                    </>
                                )}
                            </button>

                            {/* Register Link */}
                            <p className="text-center text-zinc-500 text-sm pt-2">
                                Hesabınız yok mu?{" "}
                                <a
                                    href="/kayit"
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                                >
                                    Hemen kayıt olun
                                </a>
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}