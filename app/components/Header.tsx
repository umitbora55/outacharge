"use client";

import { useState, useEffect } from "react";
import { Zap, Menu, X, Map, MessageSquare, Mail, Bell, User, LogIn, Youtube, Building2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Okunmamış sayıları getir
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCounts = async () => {
      // Okunmamış mesajlar
      const { count: msgCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .eq("is_read", false);

      // Okunmamış bildirimler
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadMessages(msgCount || 0);
      setUnreadNotifications(notifCount || 0);
    };

    fetchUnreadCounts();

    // Realtime subscription
    const channel = supabase
      .channel("header-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnreadCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchUnreadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-emerald-400" />
            Outa<span className="text-emerald-400">Charge</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/harita"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Map className="w-4 h-4" />
              Harita
            </Link>
            <Link
              href="/operatorler"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Building2 className="w-4 h-4" />
              Operatörler
            </Link>
            <Link
              href="/topluluk"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <MessageSquare className="w-4 h-4" />
              Topluluk
            </Link>
            <Link
              href="/topluluk/markalar"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Building2 className="w-4 h-4" />
              Markalar
            </Link>
            <Link
              href="/incelemeler"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Youtube className="w-4 h-4" />
              İncelemeler
            </Link>

            {user ? (
              <>
                <Link
                  href="/mesajlar"
                  className="relative flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden lg:inline">Mesajlar</span>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  href="/bildirimler"
                  className="relative flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden lg:inline">Bildirimler</span>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                <Link
                  href="/profil"
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.fullName?.charAt(0) || "?"}
                  </div>
                  <span className="hidden lg:inline">{user.fullName?.split(" ")[0]}</span>
                </Link>
              </>
            ) : (
              <Link
                href="/?login=true"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 hover:bg-slate-800 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-700">
            <div className="flex flex-col gap-2 pt-4">
              <Link
                href="/harita"
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Map className="w-5 h-5" />
                Harita
              </Link>
              <Link
                href="/operatorler"
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Building2 className="w-5 h-5" />
                Operatörler
              </Link>
              <Link
                href="/topluluk"
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <MessageSquare className="w-5 h-5" />
                Topluluk
              </Link>
              <Link
                href="/topluluk/markalar"
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Building2 className="w-5 h-5" />
                Markalar
              </Link>
              <Link
                href="/incelemeler"
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <Youtube className="w-5 h-5" />
                İncelemeler
              </Link>

              {user ? (
                <>
                  <Link
                    href="/mesajlar"
                    className="flex items-center justify-between px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Mail className="w-5 h-5" />
                      Mesajlar
                    </span>
                    {unreadMessages > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                        {unreadMessages}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/bildirimler"
                    className="flex items-center justify-between px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Bell className="w-5 h-5" />
                      Bildirimler
                    </span>
                    {unreadNotifications > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {unreadNotifications}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profil"
                    className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    Profilim
                  </Link>
                </>
              ) : (
                <Link
                  href="/?login=true"
                  className="flex items-center justify-center gap-2 mt-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="w-5 h-5" />
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}