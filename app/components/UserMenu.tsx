"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, Car, Heart, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useAuth, User as UserType } from "@/lib/auth";

interface UserMenuProps {
  onLogout?: () => void;
}

export default function UserMenu({ onLogout }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    onLogout?.();
  };

  // Get initials from full name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-full transition"
      >
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {getInitials(user.fullName)}
        </div>
        <span className="hidden md:inline text-white text-sm font-medium max-w-[120px] truncate">
          {user.fullName.split(" ")[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
          {/* User Info */}
          <div className="p-4 border-b border-slate-700">
            <div className="font-medium text-white">{user.fullName}</div>
            <div className="text-sm text-slate-400">{user.email}</div>
            {user.vehicleBrand && user.vehicleModel && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                <Car className="w-3 h-3" />
                {user.vehicleBrand} {user.vehicleModel}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/profil"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <User className="w-4 h-4" />
              <span>Profilim</span>
            </Link>
            <Link
              href="/favoriler"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Heart className="w-4 h-4" />
              <span>Favori İstasyonlar</span>
            </Link>
            <Link
              href="/ayarlar"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Settings className="w-4 h-4" />
              <span>Ayarlar</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-700 py-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-400 hover:bg-slate-700 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}