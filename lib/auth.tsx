"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";

// Supabase fetch helper
async function supabaseFetch(endpoint: string, options?: RequestInit) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': supabaseKey!,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': options?.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...options?.headers,
    }
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Kullanıcı profil verisi (public.users tablosundan)
export interface UserProfile {
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

export interface UserRegistrationData {
  phone?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  charging_preference?: string;
  charging_frequency?: string;
  preferred_charger_type?: string;
  home_charging_available?: boolean | null;
}

export interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, additionalData?: UserRegistrationData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Kullanıcı profilini public.users tablosundan çek
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const data = await supabaseFetch(`users?id=eq.${userId}&select=*`);

      if (data && data.length > 0) {
        const profile = data[0];
        setUser({
          id: profile.id,
          email: email,
          fullName: profile.full_name || "",
          phone: profile.phone,
          city: profile.city,
          vehicleBrand: profile.vehicle_brand,
          vehicleModel: profile.vehicle_model,
          vehicleYear: profile.vehicle_year,
          monthlyKm: profile.monthly_km,
          chargingPreference: profile.charging_preference,
          chargingFrequency: profile.charging_frequency,
          preferredChargerType: profile.preferred_charger_type,
          preferredConnectors: profile.preferred_connectors,
          homeCharging: profile.home_charging,
          notifyPriceChanges: profile.notify_price_changes,
          notifyNewStations: profile.notify_new_stations,
          notifyChargingComplete: profile.notify_charging_complete,
          notificationsEnabled: profile.notifications_enabled,
          marketingConsent: profile.marketing_consent,
          isAdmin: profile.is_admin || false,
          createdAt: profile.created_at,
          lastLogin: profile.last_login,
        });
      } else {
        // Profil bulunamadı - fallback
        console.warn("Profile not found, using fallback");
        setUser({
          id: userId,
          email: email,
          fullName: email.split('@')[0],
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      // Fallback
      setUser({
        id: userId,
        email: email,
        fullName: email.split('@')[0],
        createdAt: new Date().toISOString(),
      });
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

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profil`,
        },
      });
      return { error: error?.message || null };
    } catch (err: any) {
      return { error: err.message || "Google ile giriş yapılırken bir hata oluştu" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, additionalData?: UserRegistrationData) => {
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

      // Force sync metadata to public.users if session is created immediately
      if (data.session?.user) {
        const profileUpdates: any = {
          id: data.session.user.id,
          email: email,
          full_name: fullName,
        };

        if (additionalData?.phone) profileUpdates.phone = additionalData.phone;
        if (additionalData?.vehicle_brand) profileUpdates.vehicle_brand = additionalData.vehicle_brand;
        if (additionalData?.vehicle_model) profileUpdates.vehicle_model = additionalData.vehicle_model;
        if (additionalData?.vehicle_year) profileUpdates.vehicle_year = additionalData.vehicle_year;
        if (additionalData?.charging_preference) profileUpdates.charging_preference = additionalData.charging_preference;
        if (additionalData?.charging_frequency) profileUpdates.charging_frequency = additionalData.charging_frequency;
        if (additionalData?.preferred_charger_type) profileUpdates.preferred_charger_type = additionalData.preferred_charger_type;
        if (additionalData?.home_charging_available !== undefined) profileUpdates.home_charging = additionalData.home_charging_available;

        try {
          await supabaseFetch('users', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(profileUpdates)
          });
        } catch (e) {
          console.warn("Profile sync warning:", e);
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

      await supabaseFetch(`users?id=eq.${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(dbUpdates)
      });

      setUser({ ...user, ...updates });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Güncelleme sırasında bir hata oluştu" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, updateUser, signInWithGoogle }}>
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