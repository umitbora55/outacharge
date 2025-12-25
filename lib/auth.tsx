"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabase";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  city?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  chargingFrequency?: string;
  homeCharging?: boolean;
  monthlyKm?: number;
  preferredChargerType?: string;
  notificationsEnabled?: boolean;
  marketingConsent?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("outacharge_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem("outacharge_user");
      }
    }
    setLoading(false);
  }, []);

  // Hash password function
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Hash the password
      const passwordHash = await hashPassword(password);

      // Query the database
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("password_hash", passwordHash)
        .single();

      if (error || !data) {
        return { success: false, error: "E-posta veya şifre hatalı." };
      }

      // Map database fields to User interface
      const userData: User = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        city: data.city,
        vehicleBrand: data.vehicle_brand,
        vehicleModel: data.vehicle_model,
        vehicleYear: data.vehicle_year,
        chargingFrequency: data.charging_frequency,
        homeCharging: data.home_charging,
        monthlyKm: data.monthly_km,
        preferredChargerType: data.preferred_charger_type,
        notificationsEnabled: data.notifications_enabled,
        marketingConsent: data.marketing_consent,
        createdAt: data.created_at,
        lastLogin: data.last_login,
      };

      // Update last login
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.id);

      // Store in localStorage
      localStorage.setItem("outacharge_user", JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Bir hata oluştu. Lütfen tekrar deneyin." };
    }
  };

  const logout = () => {
    localStorage.removeItem("outacharge_user");
    setUser(null);
  };

  const updateUser = async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Kullanıcı oturumu bulunamadı." };
    }

    try {
      // Map User interface to database fields
      const dbData: any = {};
      if (userData.fullName) dbData.full_name = userData.fullName;
      if (userData.phone !== undefined) dbData.phone = userData.phone;
      if (userData.city !== undefined) dbData.city = userData.city;
      if (userData.vehicleBrand !== undefined) dbData.vehicle_brand = userData.vehicleBrand;
      if (userData.vehicleModel !== undefined) dbData.vehicle_model = userData.vehicleModel;
      if (userData.vehicleYear !== undefined) dbData.vehicle_year = userData.vehicleYear;
      if (userData.chargingFrequency !== undefined) dbData.charging_frequency = userData.chargingFrequency;
      if (userData.homeCharging !== undefined) dbData.home_charging = userData.homeCharging;
      if (userData.monthlyKm !== undefined) dbData.monthly_km = userData.monthlyKm;
      if (userData.preferredChargerType !== undefined) dbData.preferred_charger_type = userData.preferredChargerType;
      if (userData.notificationsEnabled !== undefined) dbData.notifications_enabled = userData.notificationsEnabled;
      if (userData.marketingConsent !== undefined) dbData.marketing_consent = userData.marketingConsent;

      const { error } = await supabase
        .from("users")
        .update(dbData)
        .eq("id", user.id);

      if (error) {
        return { success: false, error: "Güncelleme başarısız oldu." };
      }

      // Update local state
      const updatedUser = { ...user, ...userData };
      localStorage.setItem("outacharge_user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (err) {
      console.error("Update error:", err);
      return { success: false, error: "Bir hata oluştu." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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