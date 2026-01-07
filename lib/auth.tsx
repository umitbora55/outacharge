"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";

// Kullanıcı profil verisi (public.users tablosundan)
interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  city?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  monthlyKm?: number;
  chargingPreference?: string;
  chargingFrequency?: string;
  preferredChargerType?: string;
  preferredConnectors?: string[];
  homeCharging?: boolean;
  notifyPriceChanges?: boolean;
  notifyNewStations?: boolean;
  notifyChargingComplete?: boolean;
  notificationsEnabled?: boolean;
  marketingConsent?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, additionalData?: any) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Kullanıcı profilini public.users tablosundan çek
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Profil bulunamadıysa, trigger henüz çalışmamış olabilir - biraz bekle ve tekrar dene
        if (error.code === "PGRST116") {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

          if (retryData) {
            setUser({
              id: retryData.id,
              email: email,
              fullName: retryData.full_name || "",
              phone: retryData.phone,
              city: retryData.city,
              vehicleBrand: retryData.vehicle_brand,
              vehicleModel: retryData.vehicle_model,
              vehicleYear: retryData.vehicle_year,
              monthlyKm: retryData.monthly_km,
              chargingPreference: retryData.charging_preference,
              chargingFrequency: retryData.charging_frequency,
              preferredChargerType: retryData.preferred_charger_type,
              preferredConnectors: retryData.preferred_connectors,
              homeCharging: retryData.home_charging,
              notifyPriceChanges: retryData.notify_price_changes,
              notifyNewStations: retryData.notify_new_stations,
              notifyChargingComplete: retryData.notify_charging_complete,
              notificationsEnabled: retryData.notifications_enabled,
              marketingConsent: retryData.marketing_consent,
              isAdmin: retryData.is_admin || false,
              createdAt: retryData.created_at,
              lastLogin: retryData.last_login,
            });
            return;
          }
        }

        console.warn("Profile fetch error or retry failed, using fallback:", error);
        // Fallback to minimal user from available data
        setUser({
          id: userId,
          email: email,
          fullName: email.split('@')[0],
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (data) {
        setUser({
          id: data.id,
          email: email,
          fullName: data.full_name || "",
          phone: data.phone,
          city: data.city,
          vehicleBrand: data.vehicle_brand,
          vehicleModel: data.vehicle_model,
          vehicleYear: data.vehicle_year,
          monthlyKm: data.monthly_km,
          chargingPreference: data.charging_preference,
          chargingFrequency: data.charging_frequency,
          preferredChargerType: data.preferred_charger_type,
          preferredConnectors: data.preferred_connectors,
          homeCharging: data.home_charging,
          notifyPriceChanges: data.notify_price_changes,
          notifyNewStations: data.notify_new_stations,
          notifyChargingComplete: data.notify_charging_complete,
          notificationsEnabled: data.notifications_enabled,
          marketingConsent: data.marketing_consent,
          isAdmin: data.is_admin || false,
          createdAt: data.created_at,
          lastLogin: data.last_login,
        });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider: Initial Session Check", session);
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    });

    // 2. Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth Change Event", event, session);
      setSession(session);
      if (session?.user) {
        setLoading(true);
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message || null };
    } catch (err: any) {
      return { error: err.message || "Giriş yapılırken bir hata oluştu" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, additionalData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...additionalData,
          },
        },
      });

      if (error) return { error: error.message };

      // Critical Fix: Force sync metadata to public.users if session is created immediately (auto-login)
      if (data.session?.user) {
        // Construct the payload for public.users
        const profileUpdates: any = {
          full_name: fullName,
        };

        if (additionalData?.phone) profileUpdates.phone = additionalData.phone;
        if (additionalData?.vehicle_brand) profileUpdates.vehicle_brand = additionalData.vehicle_brand;
        if (additionalData?.vehicle_model) profileUpdates.vehicle_model = additionalData.vehicle_model;
        if (additionalData?.vehicle_year) profileUpdates.vehicle_year = additionalData.vehicle_year;
        if (additionalData?.charging_preference) profileUpdates.charging_preference = additionalData.charging_preference;
        if (additionalData?.charging_frequency) profileUpdates.charging_frequency = additionalData.charging_frequency;
        if (additionalData?.preferred_charger_type) profileUpdates.preferred_charger_type = additionalData.preferred_charger_type;

        // Handle both possible key names for home charging
        if (additionalData?.home_charging_available !== undefined) {
          profileUpdates.home_charging_available = additionalData.home_charging_available;
        } else if (additionalData?.home_charging !== undefined) {
          // If legacy key used, map to what we think is the column (assuming home_charging_available based on recent usage, or maybe home_charging?)
          // Safest bet: try to update the one we saw in client code: home_charging_available
          profileUpdates.home_charging_available = additionalData.home_charging;
        }

        // Force update the profile - use upsert to handle race condition where trigger might be slow
        const { error: updateError } = await supabase
          .from("users")
          .upsert({
            id: data.session.user.id,
            email: email,
            ...profileUpdates
          })
          .select(); // select() sometimes helps retrieve the error or data properly

        if (updateError) {
          console.error("Profile sync error details:", JSON.stringify(updateError, null, 2));
          // Don't block signup success, but convert to non-fatal warning
        } else {
          // Also update local state immediately so UI reflects it without re-fetch
          setUser(prev => prev ? ({ ...prev, ...additionalData, fullName, phone: additionalData?.phone }) : null);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Kayıt olurken bir hata oluştu" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    window.location.href = "/";
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: "Kullanıcı oturum açmamış" };

    try {
      const dbUpdates: any = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.vehicleBrand !== undefined) dbUpdates.vehicle_brand = updates.vehicleBrand;
      if (updates.vehicleModel !== undefined) dbUpdates.vehicle_model = updates.vehicleModel;
      if (updates.vehicleYear !== undefined) dbUpdates.vehicle_year = updates.vehicleYear;
      if (updates.monthlyKm !== undefined) dbUpdates.monthly_km = updates.monthlyKm;
      if (updates.chargingPreference !== undefined) dbUpdates.charging_preference = updates.chargingPreference;
      if (updates.chargingFrequency !== undefined) dbUpdates.charging_frequency = updates.chargingFrequency;
      if (updates.preferredChargerType !== undefined) dbUpdates.preferred_charger_type = updates.preferredChargerType;
      if (updates.preferredConnectors !== undefined) dbUpdates.preferred_connectors = updates.preferredConnectors;
      if (updates.homeCharging !== undefined) dbUpdates.home_charging = updates.homeCharging;
      if (updates.notifyPriceChanges !== undefined) dbUpdates.notify_price_changes = updates.notifyPriceChanges;
      if (updates.notifyNewStations !== undefined) dbUpdates.notify_new_stations = updates.notifyNewStations;
      if (updates.notifyChargingComplete !== undefined) dbUpdates.notify_charging_complete = updates.notifyChargingComplete;
      if (updates.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = updates.notificationsEnabled;
      if (updates.marketingConsent !== undefined) dbUpdates.marketing_consent = updates.marketingConsent;

      const { error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Güncelleme sırasında bir hata oluştu" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}