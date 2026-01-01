"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Lock, Eye, EyeOff, Check, X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SifreSifirlaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Verify token on load
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, reset_token_expiry")
          .eq("reset_token", token)
          .single();

        if (error || !data) {
          setTokenValid(false);
        } else {
          // Check if token is expired
          const expiry = new Date(data.reset_token_expiry);
          if (expiry > new Date()) {
            setTokenValid(true);
            setUserId(data.id);
          } else {
            setTokenValid(false);
            setError("Bu link süresi dolmuş. Lütfen yeni bir şifre sıfırlama isteği gönderin.");
          }
        }
      } catch (err) {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async () => {
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);

    try {
      // Hash the password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Update password and clear token
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password_hash: passwordHash,
          reset_token: null,
          reset_token_expiry: null,
        })
        .eq("id", userId);

      if (updateError) {
        setError("Şifre güncellenemedi. Lütfen tekrar deneyin.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Link doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-10 h-10 text-emerald-400" />
          <span className="text-3xl font-bold text-white">
            Outa<span className="text-emerald-400">Charge</span>
          </span>
        </Link>

        <div className="bg-slate-800 rounded-2xl p-8">
          {!tokenValid && !success ? (
            // Invalid or expired token
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Geçersiz Link</h2>
              <p className="text-slate-400 mb-6">
                {error || "Bu şifre sıfırlama linki geçersiz veya süresi dolmuş."}
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          ) : success ? (
            // Success
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Şifre Güncellendi!</h2>
              <p className="text-slate-400 mb-6">
                Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition"
              >
                Giriş Yap
              </Link>
            </div>
          ) : (
            // Reset form
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Yeni Şifre Oluştur</h2>
                <p className="text-slate-400 text-sm mt-2">Hesabınız için yeni bir şifre belirleyin.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-full font-medium transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Güncelleniyor...
                    </>
                  ) : (
                    "Şifreyi Güncelle"
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">
            Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}