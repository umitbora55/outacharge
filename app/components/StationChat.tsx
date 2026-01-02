"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

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

interface StationChatProps {
  stationId: number;
  stationName: string;
}

export default function StationChat({ stationId, stationName }: StationChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Use REF instead of STATE for scroll position - prevents useEffect re-triggers
  const isAtBottomRef = useRef(true);
  
  // Track pending message IDs to handle race conditions
  const pendingMessagesRef = useRef<Set<string>>(new Set());
  
  // For live time updates
  const [, setTick] = useState(0);

  // Live time update - every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch message count on mount
  useEffect(() => {
    fetchMessageCount();
  }, [stationId]);

  // Realtime subscription - NO isAtBottom dependency!
  useEffect(() => {
    if (!expanded) return;

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
            // Race condition fix: Check if this message matches a pending one
            const pendingMsg = prev.find(m => 
              m.pending && 
              m.user_id === newMsg.user_id && 
              m.message === newMsg.message
            );
            
            if (pendingMsg) {
              // Replace pending with real message
              pendingMessagesRef.current.delete(pendingMsg.tempId!);
              return prev.map(m => 
                m.tempId === pendingMsg.tempId 
                  ? { ...newMsg, pending: false, failed: false } 
                  : m
              );
            }
            
            // Check for exact duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            
            return [...prev, newMsg];
          });
          
          setMessageCount(c => c + 1);
          
          // Use ref for scroll check
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
          setMessageCount(c => Math.max(0, c - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId, expanded]); // Only stationId and expanded - NO isAtBottom!

  // Scroll handler with useCallback for performance
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30;
  }, []);

  // Initial scroll to bottom
  useEffect(() => {
    if (expanded && !loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isAtBottomRef.current = true;
    }
  }, [expanded, loading]);

  const fetchMessageCount = async () => {
    try {
      const { count } = await supabase
        .from("station_messages")
        .select("*", { count: 'exact', head: true })
        .eq("station_id", stationId);
      
      setMessageCount(count || 0);
    } catch (err) {
      console.error("Message count error:", err);
    }
  };

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
    
    // Track this pending message
    pendingMessagesRef.current.add(tempId);
    
    // Optimistic update
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
    
    // Scroll to bottom
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

      // Only update if realtime hasn't already handled it
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

  const removeFailedMessage = (tempId: string) => {
    pendingMessagesRef.current.delete(tempId);
    setMessages(prev => prev.filter(m => m.tempId !== tempId));
  };

  const deleteMessage = async (messageId: string) => {
    setDeletingId(messageId);
    
    // Optimistic delete
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
      // Rollback on error
      if (messageToDelete) {
        setMessages(prev => [...prev, messageToDelete].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
      }
    } finally {
      setDeletingId(null);
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
    if (diffSecs < 60) return `${diffSecs} sn`;
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} sa`;
    if (diffDays < 7) return `${diffDays} gün`;
    
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="border-t border-slate-700 mt-3 pt-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-white text-sm font-medium">Sohbet</span>
          {messageCount > 0 && (
            <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded-full">
              {messageCount}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Chat Content */}
      {expanded && (
        <div className="mt-2">
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="bg-slate-800/50 rounded-lg h-48 overflow-y-auto p-2 space-y-2"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Henüz mesaj yok. İlk mesajı siz yazın!
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.tempId || msg.id}
                    className={`flex gap-2 ${
                      user && msg.user_id === user.id ? "flex-row-reverse" : ""
                    } ${msg.pending ? "opacity-60" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
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
                      } border rounded-lg px-3 py-2`}
                    >
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
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
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                            </span>
                          ) : msg.failed ? (
                            <span className="text-red-400">!</span>
                          ) : (
                            formatTime(msg.created_at)
                          )}
                        </span>
                        
                        {user && msg.user_id === user.id && !msg.pending && !msg.failed && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingId === msg.id}
                            className="text-slate-500 hover:text-red-400 transition ml-auto"
                          >
                            {deletingId === msg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      <p className="text-white text-sm break-words">{msg.message}</p>
                      
                      {/* Failed actions */}
                      {msg.failed && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-red-500/30">
                          <button
                            onClick={() => retryMessage(msg)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Tekrar
                          </button>
                          <button
                            onClick={() => removeFailedMessage(msg.tempId!)}
                            className="text-xs text-slate-500 hover:text-slate-400"
                          >
                            Kaldır
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

          {/* Input */}
          {user ? (
            <div className="flex gap-2 mt-2">
              <input
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
                className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-xs text-center mt-2">
              Mesaj göndermek için giriş yapın.
            </p>
          )}
        </div>
      )}
    </div>
  );
}