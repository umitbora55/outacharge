"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function GirisPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const content = {
    locations: "İstasyonlar",
    community: "Topluluk",
    login: "Giriş Yap",
    getStarted: "Hemen Başla"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        throw new Error(error);
      }

      router.push("/profil");
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw new Error(error);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Google ile giriş başarısız");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] font-sans text-slate-900 pb-20 overflow-x-hidden relative">

      {/* Background Illustration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat grayscale-[20%]"
          style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f0fdf4]/50 to-[#f0fdf4]" />
      </div>

      {/* Consistent Floating Header */}
      <nav className="fixed top-6 left-6 right-6 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Outa<span className="text-green-600">Charge</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <Link href="/harita" className="hover:text-green-600 transition-colors">{content.locations}</Link>
          <Link href="/rota-planla" className="hover:text-green-600 transition-colors">Rota Planlayıcı</Link>
          <Link href="/topluluk" className="hover:text-green-600 transition-colors">{content.community}</Link>
          <Link href="/operatorler" className="hover:text-green-600 transition-colors">Operatörler</Link>
          <Link href="/markalar" className="hover:text-green-600 transition-colors">Markalar</Link>
          <Link href="/incelemeler" className="hover:text-green-600 transition-colors">İncelemeler</Link>
          <Link href="/hesaplayici" className="hover:text-green-600 transition-colors">Hesaplayıcı</Link>
        </div>

        <div className="hidden md:flex items-center gap-5">
          <Link href="/giris">
            <button className="text-sm font-semibold text-green-700 transition-colors">
              {content.login}
            </button>
          </Link>
          <Link href="/kayit">
            <button className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all shadow-lg shadow-slate-900/20">
              {content.getStarted}
            </button>
          </Link>
        </div>
      </nav>

      {/* Login Content - Compacted */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-16 pb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] px-4"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-green-900/10 border border-white p-6 md:p-8">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 mb-3 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Tekrar Hoşgeldiniz</h1>
              <p className="text-slate-500 text-xs">OutaCharge dünyasına giriş yapın.</p>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-10 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 mb-5 shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" className="text-[#FBBC05]" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]" /></svg>
                  <span>Google ile Devam Et</span>
                </>
              )}
            </button>

            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <span className="relative bg-white/50 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">veya</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ad@ornek.com"
                    className="w-full h-10 pl-10 pr-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Şifre</label>
                  <Link href="/sifre-sifirlama" className="text-[10px] font-bold text-green-600 hover:text-green-700">Unuttun mu?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-4 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 text-red-600 text-[10px] rounded-lg border border-red-100 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  <>
                    <span>Giriş Yap</span>
                    <ArrowRight className="w-3 h-3" />
                  </>}
              </button>
            </form>

            <div className="mt-6 text-center text-xs font-medium text-slate-500">
              Hesabın yok mu? <Link href="/kayit" className="text-green-600 hover:text-green-700 font-bold">Hemen Üye Ol</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
