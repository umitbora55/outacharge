"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import HeaderWhite from "../components/HeaderWhite";

export default function GirisPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-emerald-500/30 font-sans text-zinc-900 dark:text-white overflow-hidden relative">
      <HeaderWhite />

      {/* Main Container - Aggressively pushed to top for absolute zero-scroll */}
      <div className="flex flex-col items-center justify-start min-h-screen w-full px-4 pt-[4vh] pb-8">

        {/* Content Wrapper - Maximum compression */}
        <div className="w-full max-w-md flex flex-col gap-3 scale-[0.98] sm:scale-100 transform-gpu">

          {/* Hero Section - Maximum Compression */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 mb-1">
              <span className="text-zinc-500 text-[8px] font-bold tracking-[0.5em] uppercase">Private Access</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extralight tracking-tight mb-1 leading-tight">
              Geleceğe <br />
              <span className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 animate-gradient-x">
                şarjlı çık.
              </span>
            </h1>
            <p className="text-zinc-500 max-w-[260px] mx-auto text-[10px] md:text-xs font-light leading-relaxed">
              OutaCharge dünyasına giriş yapın ve yüksek hassasiyetli ağın bir parçası olun.
            </p>
          </motion.div>

          {/* Login Form Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
            <div className="relative group">
              {/* Subtle glow effect behind the form */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>

              <div className="relative bg-white dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden p-5 md:p-7">

                {/* Social Login Section */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-11 flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-2xl font-medium text-xs text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          className="text-[#4285F4]"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          className="text-[#34A853]"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z"
                          className="text-[#FBBC05]"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          className="text-[#EA4335]"
                        />
                      </svg>
                      <span>Google ile Giriş Yap</span>
                    </>
                  )}
                </button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.2em]">
                    <span className="bg-white dark:bg-zinc-900/50 px-3 text-zinc-500">veya</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">
                      E-posta Adresi
                    </label>
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ad@email.com"
                        required
                        className="w-full h-11 pl-11 pr-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-light"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Şifre
                      </label>
                      <Link href="/sifre-sifirlama" className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-500 hover:text-emerald-400 transition-colors">
                        Unuttun mu?
                      </Link>
                    </div>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within/input:text-emerald-500 transition-colors" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-11 pr-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-light"
                      />
                    </div>
                  </div>

                  {/* Error Indicator */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-[10px] text-red-500"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative h-11 group/btn bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-semibold text-xs overflow-hidden transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-1.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center justify-center gap-2 group-hover/btn:text-white transition-colors">
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Giriş Yap</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                </form>

                {/* Footer Link */}
                <div className="mt-6 text-center">
                  <p className="text-zinc-500 text-[11px] font-light">
                    Hesabınız yok mu?{" "}
                    <Link href="/kayit" className="text-zinc-900 dark:text-white font-semibold hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors underline underline-offset-4 decoration-zinc-200 dark:decoration-white/10 hover:decoration-emerald-500/50">
                      Hemen Üye Olun
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative background label - Fixed to bottom to never interfere */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-20 md:h-24 flex items-center justify-center -z-10 opacity-[0.03] dark:opacity-[0.05]">
        <span className="text-[12vw] font-black tracking-tighter uppercase whitespace-nowrap">
          OutaCharge
        </span>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}

