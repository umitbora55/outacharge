"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, Users, Loader2, LogIn, LogOut, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getOperatorById, operators } from "@/data/operators";

interface CheckIn {
  id: string;
  user_id: string;
  station_id: number;
  station_name: string;
  status: string;
  started_at: string;
  wait_time: number | null;
}

interface StationCheckInProps {
  stationId: number;
  stationName: string;
  stationOperator: string;
  stationPower: number;
  stationPowerType: string;
}

export default function StationCheckIn({ 
  stationId, 
  stationName, 
  stationOperator,
  stationPower,
  stationPowerType 
}: StationCheckInProps) {
  const { user } = useAuth();
  const [activeCheckIns, setActiveCheckIns] = useState<CheckIn[]>([]);
  const [userCheckIn, setUserCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    duration: number;
    energyKwh: number;
    cost: number;
    savings: string;
  } | null>(null);

  useEffect(() => {
    fetchCheckIns();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCheckIns, 30000);
    return () => clearInterval(interval);
  }, [stationId, user]);

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      const { data: checkIns, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("station_id", stationId)
        .is("ended_at", null);

      if (!error && checkIns) {
        setActiveCheckIns(checkIns);
        
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
        })
        .select()
        .single();

      if (!error && data) {
        setUserCheckIn(data);
        setActiveCheckIns(prev => [...prev, data]);
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const calculateChargingCost = (durationMinutes: number, power: number, powerType: string, operatorName: string) => {
    // Calculate energy (kWh) - assume 85% efficiency
    const efficiency = 0.85;
    const energyKwh = (power * (durationMinutes / 60)) * efficiency;

    // Get current hour for time-based pricing
    const currentHour = new Date().getHours();
    let timeOfDay: "night" | "day" | "peak" = "day";
    
    if (currentHour >= 22 || currentHour < 6) {
      timeOfDay = "night";
    } else if (currentHour >= 17 && currentHour < 22) {
      timeOfDay = "peak";
    }

    // Try to get operator price
    let pricePerKwh = 10; // Default fallback
    
    // Match operator
    const lowerOperator = operatorName.toLowerCase();
    const matchedOperator = operators.find(op => 
      lowerOperator.includes(op.name.toLowerCase()) ||
      lowerOperator.includes(op.id)
    );

    if (matchedOperator) {
      if (powerType === "DC") {
        if (power >= 150) {
          pricePerKwh = matchedOperator.pricing.dcHigh || matchedOperator.pricing.dcMid || 12;
        } else if (power >= 50) {
          pricePerKwh = matchedOperator.pricing.dcMid || matchedOperator.pricing.dcLow || 11;
        } else {
          pricePerKwh = matchedOperator.pricing.dcLow || 10;
        }
      } else {
        pricePerKwh = matchedOperator.pricing.ac || 9;
      }
    } else {
      // Default prices based on power type
      pricePerKwh = powerType === "DC" ? 11.5 : 9;
    }

    // Apply time-of-day adjustment for home charging comparison
    let homePrice = 4.2; // Default daytime
    if (timeOfDay === "night") homePrice = 2.1;
    else if (timeOfDay === "peak") homePrice = 6.5;

    const cost = energyKwh * pricePerKwh;
    const homeCost = energyKwh * homePrice;
    
    // Calculate petrol equivalent
    const kmDriven = (energyKwh / 18) * 100; // 18 kWh/100km average
    const petrolLiters = (kmDriven / 100) * 7; // 7L/100km average
    const petrolCost = petrolLiters * 43; // 43 TL/L

    const savings = petrolCost - cost;

    return {
      energyKwh: Math.round(energyKwh * 10) / 10,
      cost: Math.round(cost),
      pricePerKwh,
      timeOfDay,
      petrolSavings: Math.round(savings),
      homeCostComparison: Math.round(homeCost),
    };
  };

  const handleCheckOut = async () => {
    if (!user || !userCheckIn) return;

    setCheckingOut(true);
    try {
      const startTime = new Date(userCheckIn.started_at);
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      // Calculate charging data
      const chargingData = calculateChargingCost(
        durationMinutes,
        stationPower || 50,
        stationPowerType || "DC",
        stationOperator
      );

      // Update check-in record
      await supabase
        .from("checkins")
        .update({ 
          ended_at: endTime.toISOString(),
        })
        .eq("id", userCheckIn.id);

      // Save to charging history
      await supabase.from("charging_history").insert({
        user_id: user.id,
        station_id: stationId,
        station_name: stationName,
        station_operator: stationOperator,
        energy_kwh: chargingData.energyKwh,
        cost: chargingData.cost,
        duration_minutes: durationMinutes,
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
      });

      // Show summary
      setCheckoutData({
        duration: durationMinutes,
        energyKwh: chargingData.energyKwh,
        cost: chargingData.cost,
        savings: `₺${chargingData.petrolSavings} benzine göre tasarruf`,
      });
      setShowCheckoutSummary(true);

      setUserCheckIn(null);
      setActiveCheckIns(prev => prev.filter(c => c.id !== userCheckIn.id));

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
    if (diffMins < 60) return `${diffMins} dk`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} sa ${mins} dk`;
  };

  const getLiveEstimate = () => {
    if (!userCheckIn) return null;
    
    const start = new Date(userCheckIn.started_at);
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - start.getTime()) / 60000);
    
    if (durationMinutes < 1) return null;

    const estimate = calculateChargingCost(
      durationMinutes,
      stationPower || 50,
      stationPowerType || "DC",
      stationOperator
    );

    return estimate;
  };

  const liveEstimate = getLiveEstimate();

  // Update live estimate every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    if (userCheckIn) {
      const interval = setInterval(() => setTick(t => t + 1), 60000);
      return () => clearInterval(interval);
    }
  }, [userCheckIn]);

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
      ) : showCheckoutSummary && checkoutData ? (
        // Checkout Summary
        <div className="space-y-3">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Şarj Tamamlandı!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Süre:</span>
                <span className="text-white ml-1">{checkoutData.duration} dk</span>
              </div>
              <div>
                <span className="text-slate-400">Enerji:</span>
                <span className="text-white ml-1">{checkoutData.energyKwh} kWh</span>
              </div>
              <div>
                <span className="text-slate-400">Tahmini Ücret:</span>
                <span className="text-white ml-1">₺{checkoutData.cost}</span>
              </div>
              <div>
                <span className="text-emerald-400 text-xs">{checkoutData.savings}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCheckoutSummary(false)}
            className="w-full py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition"
          >
            Tamam
          </button>
        </div>
      ) : (
        <>
          {/* Active Check-ins Info */}
          {activeCheckIns.length > 0 && !userCheckIn && (
            <div className="bg-slate-700/50 rounded-lg p-2 mb-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Şu an şarj eden:</span>
                <span className="text-white font-medium">{activeCheckIns.length} araç</span>
              </div>
            </div>
          )}

          {/* User Actions */}
          {user ? (
            userCheckIn ? (
              // User is checked in - show live data
              <div className="space-y-2">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Şarj Ediyorsunuz</span>
                    </div>
                    <div className="flex items-center gap-1 text-white text-sm font-mono">
                      <Clock className="w-3 h-3" />
                      {getTimeSinceCheckIn(userCheckIn.started_at)}
                    </div>
                  </div>
                  
                  {liveEstimate && (
                    <div className="grid grid-cols-3 gap-2 text-center mt-2 pt-2 border-t border-emerald-500/30">
                      <div>
                        <div className="text-emerald-400 text-lg font-bold">{liveEstimate.energyKwh}</div>
                        <div className="text-slate-400 text-xs">kWh</div>
                      </div>
                      <div>
                        <div className="text-emerald-400 text-lg font-bold">₺{liveEstimate.cost}</div>
                        <div className="text-slate-400 text-xs">tahmini</div>
                      </div>
                      <div>
                        <div className="text-emerald-400 text-lg font-bold">₺{liveEstimate.petrolSavings}</div>
                        <div className="text-slate-400 text-xs">tasarruf</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-red-500/30"
                >
                  {checkingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Şarjı Bitir
                    </>
                  )}
                </button>
              </div>
            ) : (
              // User can check in
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 border border-emerald-500/30"
              >
                {checkingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Şarj Başlat
                  </>
                )}
              </button>
            )
          ) : (
            <p className="text-slate-500 text-xs text-center py-2">
              Şarj takibi için giriş yapın.
            </p>
          )}

          {/* Recent Activity */}
          {activeCheckIns.length > 0 && !userCheckIn && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <p className="text-slate-500 text-xs mb-1">Aktif şarjlar:</p>
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