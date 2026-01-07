"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Zap, Bell, MessageSquare, User, LogOut, LogIn } from "lucide-react";

export default function HeaderWhite() {
  const { user, session, signOut } = useAuth();

  // Use profile data if available, otherwise fallback to session metadata
  const displayUser = user || (session?.user ? {
    fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "Kullanıcı",
    email: session.user.email || ""
  } : null);



  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-900">
            Outa<span className="text-emerald-500">Charge</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/harita" className="text-zinc-900 hover:text-emerald-500 transition font-medium">
            Harita
          </Link>
          <Link href="/topluluk" className="text-zinc-900 hover:text-emerald-500 transition font-medium">
            Topluluk
          </Link>
          <Link href="/hesaplayici" className="text-zinc-900 hover:text-emerald-500 transition font-medium">
            Hesaplayıcı
          </Link>
          {displayUser && (
            <Link href="/istatistikler" className="text-zinc-900 hover:text-emerald-500 transition font-medium">
              İstatistikler
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {displayUser ? (
            <>
              <Link
                href="/bildirimler"
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <Bell className="w-5 h-5 text-zinc-900" />
              </Link>
              <Link
                href="/mesajlar"
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <MessageSquare className="w-5 h-5 text-zinc-900" />
              </Link>
              <Link
                href="/profil"
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 transition group"
                title="Profilim"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center group-hover:scale-105 transition">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-emerald-900 hidden sm:block">
                  {displayUser.fullName}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition"
                title="Çıkış Yap"
              >
                <LogOut className="w-5 h-5 text-red-600" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className="px-4 py-2 text-zinc-900 hover:text-emerald-500 transition font-medium flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Link>
              <Link
                href="/kayit"
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-black/90 transition font-medium"
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
