"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { 
  MessageCircle, Send, Loader2, Trash2, X, Minimize2, Maximize2,
  RefreshCw, Settings, GripHorizontal
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import ChatModeSelector, { ChatMode } from "./ChatModeSelector";

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

interface StationChatAdvancedProps {
  stationId: number;
  stationName: string;
  stationOperator?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function StationChatAdvanced({ 
  stationId, 
  stationName, 
  stationOperator,
  isOpen,
  onClose 
}: StationChatAdvancedProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineCount] = useState(1);
  
  // Chat mode
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // Floating window state
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [size] = useState({ width: 380, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const pendingMessagesRef = useRef<Set<string>>(new Set());
  
  // For live time updates
  const [, setTick] = useState(0);

  // Load saved chat mode
  useEffect(() => {
    const savedMode = localStorage.getItem("chatMode") as ChatMode | null;
    if (savedMode) {
      setChatMode(savedMode);
    } else if (isOpen) {
      setShowModeSelector(true);
    }
  }, [isOpen]);

  // Live time update
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages and subscribe to realtime
  useEffect(() => {
    if (!isOpen || !chatMode) return;

    fetchMessages();
    
    const channel = supabase
      .channel(`station-chat-${stationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'station_messages',
          filter: `station_id=eq.${stationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          setMessages((prev) => {
            const pendingMsg = prev.find(m => 
              m.pending && 
              m.user_id === newMsg.user_id && 
              m.message === newMsg.message
            );
            
            if (pendingMsg) {
              pendingMessagesRef.current.delete(pendingMsg.tempId!);
              return prev.map(m => 
                m.tempId === pendingMsg.tempId 
                  ? { ...newMsg, pending: false, failed: false } 
                  : m
              );
            }
            
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            return [...prev, newMsg];
          });
          
          if (isAtBottomRef.current) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'station_messages',
          filter: `station_id=eq.${stationId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId, isOpen, chatMode]);

  // Scroll to bottom on first load
  useEffect(() => {
    if (isOpen && !loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isAtBottomRef.current = true;
    }
  }, [isOpen, loading]);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30;
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("station_messages")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setMessages(data.reverse());
      }
    } catch (err) {
      console.error("Messages fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

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
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    
    // Keep focus on input
    setTimeout(() => {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      isAtBottomRef.current = true;
    }, 50);

    try {
      const { data, error } = await supabase.from("station_messages").insert({
        station_id: stationId,
        user_id: user.id,
        user_name: user.fullName,
        message: messageText,
      }).select().single();

      if (error) throw error;

      if (pendingMessagesRef.current.has(tempId)) {
        pendingMessagesRef.current.delete(tempId);
        setMessages(prev => prev.map(m => 
          m.tempId === tempId ? { ...data, pending: false, failed: false } : m
        ));
      }
      
    } catch (err) {
      console.error("Send message error:", err);
      pendingMessagesRef.current.delete(tempId);
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, pending: false, failed: true } : m
      ));
    }
  };

  const sendMessageDirect = async (messageText: string) => {
    if (!user || !messageText) return;

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
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      isAtBottomRef.current = true;
    }, 50);

    try {
      const { data, error } = await supabase.from("station_messages").insert({
        station_id: stationId,
        user_id: user.id,
        user_name: user.fullName,
        message: messageText,
      }).select().single();

      if (error) throw error;

      if (pendingMessagesRef.current.has(tempId)) {
        pendingMessagesRef.current.delete(tempId);
        setMessages(prev => prev.map(m => 
          m.tempId === tempId ? { ...data, pending: false, failed: false } : m
        ));
      }
      
    } catch (err) {
      console.error("Send message error:", err);
      pendingMessagesRef.current.delete(tempId);
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, pending: false, failed: true } : m
      ));
    }
  };

  const retryMessage = async (failedMessage: Message) => {
    if (!user || !failedMessage.tempId) return;

    const tempId = failedMessage.tempId;
    pendingMessagesRef.current.add(tempId);
    
    setMessages(prev => prev.map(m => 
      m.tempId === tempId ? { ...m, pending: true, failed: false } : m
    ));

    try {
      const { data, error } = await supabase.from("station_messages").insert({
        station_id: stationId,
        user_id: user.id,
        user_name: user.fullName,
        message: failedMessage.message,
      }).select().single();

      if (error) throw error;

      if (pendingMessagesRef.current.has(tempId)) {
        pendingMessagesRef.current.delete(tempId);
        setMessages(prev => prev.map(m => 
          m.tempId === tempId ? { ...data, pending: false, failed: false } : m
        ));
      }
      
    } catch (err) {
      pendingMessagesRef.current.delete(tempId);
      setMessages(prev => prev.map(m => 
        m.tempId === tempId ? { ...m, pending: false, failed: true } : m
      ));
    }
  };

  const deleteMessage = async (messageId: string) => {
    const messageToDelete = messages.find(m => m.id === messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      const { error } = await supabase
        .from("station_messages")
        .delete()
        .eq("id", messageId);
        
      if (error) throw error;
    } catch (err) {
      console.error("Delete message error:", err);
      if (messageToDelete) {
        setMessages(prev => [...prev, messageToDelete].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return "şimdi";
    if (diffSecs < 60) return `${diffSecs}sn`;
    if (diffMins < 60) return `${diffMins}dk`;
    if (diffHours < 24) return `${diffHours}sa`;
    if (diffDays < 7) return `${diffDays}g`;
    
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Dragging for floating mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (chatMode !== "floating") return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.startPosX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, dragRef.current.startPosY + deltaY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, size]);

  const handleModeSelect = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    setShowModeSelector(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [newMessage, user, stationId]);

  if (!isOpen) return null;

  if (showModeSelector) {
    return (
      <ChatModeSelector
        onSelect={handleModeSelect}
        onClose={onClose}
        currentMode={chatMode || undefined}
      />
    );
  }

  if (!chatMode) return null;

  // Header Component
  const ChatHeader = () => (
    <div className="p-4 border-b border-slate-700 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {chatMode === "floating" && (
            <div 
              className="cursor-move p-1 hover:bg-slate-700 rounded"
              onMouseDown={handleMouseDown}
            >
              <GripHorizontal className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div>
            <h3 className="text-white font-medium text-sm">{stationName}</h3>
            {stationOperator && (
              <p className="text-slate-400 text-xs">{stationOperator}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs">{onlineCount} çevrimiçi</span>
          </div>
          <button
            onClick={() => setShowModeSelector(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            title="Görünümü Değiştir"
          >
            <Settings className="w-4 h-4" />
          </button>
          {chatMode === "floating" && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Messages Component
  const ChatMessages = () => (
    <div 
      ref={chatContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-3"
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <MessageCircle className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">Henüz mesaj yok</p>
          <p className="text-slate-500 text-xs mt-1">İlk mesajı siz yazın!</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <div
              key={msg.tempId || msg.id}
              className={`flex gap-3 group ${
                user && msg.user_id === user.id ? "flex-row-reverse" : ""
              } ${msg.pending ? "opacity-60" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  user && msg.user_id === user.id
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-600 text-slate-300"
                }`}
              >
                {getInitials(msg.user_name)}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[75%] ${
                  msg.failed
                    ? "bg-red-500/20 border-red-500/30"
                    : user && msg.user_id === user.id
                    ? "bg-emerald-500/20 border-emerald-500/30"
                    : "bg-slate-700/50 border-slate-600/50"
                } border rounded-2xl px-4 py-2`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      msg.failed
                        ? "text-red-400"
                        : user && msg.user_id === user.id
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {msg.user_name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {msg.pending ? (
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                    ) : msg.failed ? (
                      <span className="text-red-400">!</span>
                    ) : (
                      formatTime(msg.created_at)
                    )}
                  </span>
                  
                  {user && msg.user_id === user.id && !msg.pending && !msg.failed && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-slate-500 hover:text-red-400 transition ml-auto opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <p className="text-white text-sm">{msg.message}</p>
                
                {msg.failed && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-red-500/30">
                    <button
                      onClick={() => retryMessage(msg)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Tekrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );

  // Input Component
  const ChatInput = () => (
    <div className="p-4 border-t border-slate-700 flex-shrink-0">
      {user ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                if (input.value.trim()) {
                  setNewMessage(input.value);
                  setTimeout(() => {
                    sendMessageDirect(input.value.trim());
                    input.value = "";
                  }, 0);
                }
              }
            }}
            placeholder="Mesaj yazın..."
            maxLength={500}
            autoComplete="off"
            className="flex-1 bg-slate-700 text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={() => {
              const input = inputRef.current;
              if (input && input.value.trim()) {
                sendMessageDirect(input.value.trim());
                input.value = "";
                input.focus();
              }
            }}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center">
          Mesaj göndermek için giriş yapın
        </p>
      )}
    </div>
  );

  // Render based on mode
  const chatContainerClass = "flex flex-col bg-slate-800";

  switch (chatMode) {
    case "panel":
      return (
        <div className="fixed top-0 right-0 h-full w-full sm:w-96 z-40 shadow-2xl animate-slide-in-right">
          <div className={`${chatContainerClass} h-full rounded-l-2xl`}>
            <ChatHeader />
            {!isMinimized && (
              <>
                <ChatMessages />
                <ChatInput />
              </>
            )}
          </div>
        </div>
      );

    case "split":
      return (
        <div className="fixed top-0 right-0 h-full w-1/2 z-40 border-l border-slate-700">
          <div className={`${chatContainerClass} h-full`}>
            <ChatHeader />
            <ChatMessages />
            <ChatInput />
          </div>
        </div>
      );

    case "floating":
      return (
        <div
          className="fixed z-40 shadow-2xl rounded-2xl overflow-hidden border border-slate-700"
          style={{
            left: position.x,
            top: position.y,
            width: isMinimized ? 300 : size.width,
            height: isMinimized ? "auto" : size.height,
          }}
        >
          <div className={`${chatContainerClass} ${isMinimized ? "" : "h-full"}`}>
            <ChatHeader />
            {!isMinimized && (
              <>
                <ChatMessages />
                <ChatInput />
              </>
            )}
          </div>
        </div>
      );

    case "modal":
      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl">
            <div className={`${chatContainerClass} h-full`}>
              <ChatHeader />
              <ChatMessages />
              <ChatInput />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}