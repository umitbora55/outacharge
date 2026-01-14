// app/components/HeaderWhite.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Zap, Bell, MessageSquare, User, LogOut, LogIn } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function HeaderWhite() {
  const { user, session, signOut } = useAuth();

  const displayUser = user || (session?.user ? {
    fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
    email: session.user.email || ""
  } : null);

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#000000]/70 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-900 transition-all duration-500">
      <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo - Apple Style Balanced Typography */}
        <Link href="/" className="flex items-center gap-2 group">
          <Zap className="w-5 h-5 text-emerald-500 transition-transform duration-500 group-hover:scale-110" />
          <span className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white">
            Outa<span className="font-light text-zinc-400">Charge</span>
          </span>
        </Link>

        {/* Global Navigation - Fine Typography */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Harita", href: "/harita" },
            { label: "Topluluk", href: "/topluluk" },
            { label: "Operatörler", href: "/operatorler" },
            { label: "Markalar", href: "/topluluk/markalar" },
            { label: "İncelemeler", href: "/incelemeler" },
            { label: "Hesaplayıcı", href: "/hesaplayici" },
            ...(displayUser ? [{ label: "İstatistikler", href: "/istatistikler" }] : [])
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center pr-2 mr-2 border-r border-zinc-100 dark:border-zinc-800">
            <ThemeToggle />
          </div>

          {displayUser ? (
            <div className="flex items-center gap-1">
              <Link
                href="/bildirimler"
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
              </Link>
              <Link
                href="/mesajlar"
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <MessageSquare className="w-[18px] h-[18px]" />
              </Link>

              {/* Profile - Understated & High-End */}
              <div className="flex items-center gap-2 ml-2">
                <Link
                  href="/profil"
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 group"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 hidden sm:block">
                    {displayUser.fullName}
                  </span>
                </Link>

                <button
                  onClick={signOut}
                  className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors duration-300"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-[17px] h-[17px]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/giris"
                className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-4 py-2 transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/kayit"
                className="text-[13px] font-medium bg-zinc-950 dark:bg-white text-white dark:text-black px-5 py-2 rounded-full hover:bg-black dark:hover:bg-zinc-100 transition-all shadow-sm"
              >
                Üye Ol
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
