"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Zap, Bell, MessageSquare, User, LogOut, LogIn } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle"; // <--- Import et

export default function HeaderWhite() {
  const { user, session, signOut } = useAuth();

  // Use profile data if available, otherwise fallback to session metadata
  const displayUser = user || (session?.user ? {
    fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Kullanıcı",
    email: session.user.email || ""
  } : null);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-800 transition-all duration-300">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-white">
            Outa<span className="text-emerald-500">Charge</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/harita" className="text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium">
            Harita
          </Link>
          <Link href="/topluluk" className="text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium">
            Topluluk
          </Link>
          <Link href="/incelemeler" className="text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium">
            İncelemeler
          </Link>
          <Link href="/hesaplayici" className="text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium">
            Hesaplayıcı
          </Link>
          {displayUser && (
            <Link href="/istatistikler" className="text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium">
              İstatistikler
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* TEMA DEGISTIRICI */}
          <ThemeToggle />

          {displayUser ? (
            <>
              <Link
                href="/bildirimler"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center transition"
              >
                <Bell className="w-5 h-5 text-zinc-900 dark:text-zinc-300" />
              </Link>
              <Link
                href="/mesajlar"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center transition"
              >
                <MessageSquare className="w-5 h-5 text-zinc-900 dark:text-zinc-300" />
              </Link>
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition group"
                title="Profilim"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center group-hover:scale-105 transition">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-400 hidden sm:block">
                  {displayUser.fullName}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 flex items-center justify-center transition"
                title="Çıkış Yap"
              >
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className="px-4 py-2 text-zinc-900 dark:text-white hover:text-emerald-500 transition font-medium flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Link>
              <Link
                href="/kayit"
                className="px-4 py-2 bg-black dark:bg-white dark:text-black text-white rounded-full hover:bg-black/90 dark:hover:bg-white/90 transition font-medium"
              >
                Üye Ol
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
