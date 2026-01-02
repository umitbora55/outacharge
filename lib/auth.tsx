"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";

// Kullanıcı profil verisi (public.users tablosundan)
interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  chargingPreference?: string;
  preferredConnectors?: string[];
  notifyPriceChanges?: boolean;
  notifyNewStations?: boolean;
  notifyChargingComplete?: boolean;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
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
        console.error("Profile fetch error:", error);
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
              vehicleBrand: retryData.vehicle_brand,
              vehicleModel: retryData.vehicle_model,
              chargingPreference: retryData.charging_preference,
              preferredConnectors: retryData.preferred_connectors,
              notifyPriceChanges: retryData.notify_price_changes,
              notifyNewStations: retryData.notify_new_stations,
              notifyChargingComplete: retryData.notify_charging_complete,
              isAdmin: retryData.is_admin || false,
            });
          }
        }
        return;
      }

      if (data) {
        setUser({
          id: data.id,
          email: email,
          fullName: data.full_name || "",
          vehicleBrand: data.vehicle_brand,
          vehicleModel: data.vehicle_model,
          chargingPreference: data.charging_preference,
          preferredConnectors: data.preferred_connectors,
          notifyPriceChanges: data.notify_price_changes,
          notifyNewStations: data.notify_new_stations,
          notifyChargingComplete: data.notify_charging_complete,
          isAdmin: data.is_admin || false,
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
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    });

    // 2. Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error: error?.message || null };
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
      if (updates.vehicleBrand !== undefined) dbUpdates.vehicle_brand = updates.vehicleBrand;
      if (updates.vehicleModel !== undefined) dbUpdates.vehicle_model = updates.vehicleModel;
      if (updates.chargingPreference !== undefined) dbUpdates.charging_preference = updates.chargingPreference;
      if (updates.preferredConnectors !== undefined) dbUpdates.preferred_connectors = updates.preferredConnectors;
      if (updates.notifyPriceChanges !== undefined) dbUpdates.notify_price_changes = updates.notifyPriceChanges;
      if (updates.notifyNewStations !== undefined) dbUpdates.notify_new_stations = updates.notifyNewStations;
      if (updates.notifyChargingComplete !== undefined) dbUpdates.notify_charging_complete = updates.notifyChargingComplete;

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