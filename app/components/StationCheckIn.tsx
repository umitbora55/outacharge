"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, Users, Loader2, LogIn, LogOut, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface CheckIn {
  id: string;
  user_id: string;
  station_id: number;
  status: string;
  started_at: string;
  wait_time: number | null;
}

interface StationCheckInProps {
  stationId: number;
  stationName: string;
}

export default function StationCheckIn({ stationId, stationName }: StationCheckInProps) {
  const { user } = useAuth();
  const [activeCheckIns, setActiveCheckIns] = useState<CheckIn[]>([]);
  const [userCheckIn, setUserCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [waitTime, setWaitTime] = useState<number>(0);
  const [showWaitTimeInput, setShowWaitTimeInput] = useState(false);

  useEffect(() => {
    fetchCheckIns();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCheckIns, 30000);
    return () => clearInterval(interval);
  }, [stationId, user]);

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      // Get active check-ins for this station
      const { data: checkIns, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("station_id", stationId)
        .is("ended_at", null);

      if (!error && checkIns) {
        setActiveCheckIns(checkIns);
        
        // Check if current user has an active check-in
        if (user) {
          const userActive = checkIns.find(c => c.user_id === user.id);
          setUserCheckIn(userActive || null);
        }
      }
    } catch (err) {
      console.error("Check-in fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;

    setCheckingIn(true);
    try {
      const { data, error } = await supabase
        .from("checkins")
        .insert({
          user_id: user.id,
          station_id: stationId,
          station_name: stationName,
          status: "charging",
          wait_time: waitTime > 0 ? waitTime : null,
        })
        .select()
        .single();

      if (!error && data) {
        setUserCheckIn(data);
        setActiveCheckIns(prev => [...prev, data]);
        setShowWaitTimeInput(false);
        setWaitTime(0);
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !userCheckIn) return;

    setCheckingOut(true);
    try {
      const { error } = await supabase
        .from("checkins")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", userCheckIn.id);

      if (!error) {
        setUserCheckIn(null);
        setActiveCheckIns(prev => prev.filter(c => c.id !== userCheckIn.id));
      }
    } catch (err) {
      console.error("Check-out error:", err);
    } finally {
      setCheckingOut(false);
    }
  };

  const getTimeSinceCheckIn = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dk önce`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} sa ${mins} dk önce`;
  };

  const averageWaitTime = activeCheckIns.length > 0
    ? activeCheckIns
        .filter(c => c.wait_time !== null)
        .reduce((sum, c) => sum + (c.wait_time || 0), 0) / 
        activeCheckIns.filter(c => c.wait_time !== null).length
    : null;

  return (
    <div className="bg-slate-700/30 rounded-lg p-3 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-white text-sm font-medium">Canlı Durum</span>
        </div>
        {activeCheckIns.length > 0 && (
          <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">
              {activeCheckIns.length} kişi burada
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Active Check-ins Info */}
          {activeCheckIns.length > 0 && (
            <div className="bg-slate-700/50 rounded-lg p-2 mb-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Şu an şarj eden:</span>
                <span className="text-white font-medium">{activeCheckIns.length} araç</span>
              </div>
              {averageWaitTime !== null && averageWaitTime > 0 && (
                <div className="flex items-center justify-between text-slate-300 mt-1">
                  <span>Ort. bekleme süresi:</span>
                  <span className="text-yellow-400 font-medium">~{Math.round(averageWaitTime)} dk</span>
                </div>
              )}
            </div>
          )}

          {/* User Actions */}
          {user ? (
            userCheckIn ? (
              // User is checked in
              <div className="space-y-2">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <div className="flex-1">
                    <span className="text-emerald-400 text-sm font-medium">Buradasınız</span>
                    <span className="text-slate-400 text-xs block">
                      {getTimeSinceCheckIn(userCheckIn.started_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Çıkış Yap
                    </>
                  )}
                </button>
              </div>
            ) : (
              // User can check in
              <div className="space-y-2">
                {showWaitTimeInput ? (
                  <div className="space-y-2">
                    <label className="text-slate-400 text-xs">
                      Bekleme süreniz (dakika, opsiyonel)
                    </label>
                    <input
                      type="number"
                      value={waitTime || ""}
                      onChange={(e) => setWaitTime(Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      max="120"
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowWaitTimeInput(false);
                          setWaitTime(0);
                        }}
                        className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleCheckIn}
                        disabled={checkingIn}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                      >
                        {checkingIn ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            Giriş Yap
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWaitTimeInput(true)}
                    className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-emerald-500/30"
                  >
                    <MapPin className="w-4 h-4" />
                    Buradayım
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="text-slate-500 text-xs text-center">
              Check-in yapmak için giriş yapın.
            </p>
          )}

          {/* Recent Activity */}
          {activeCheckIns.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <p className="text-slate-500 text-xs mb-1">Son aktivite:</p>
              <div className="space-y-1">
                {activeCheckIns.slice(0, 3).map((checkIn) => (
                  <div key={checkIn.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-slate-400">
                      Şarj ediyor • {getTimeSinceCheckIn(checkIn.started_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}