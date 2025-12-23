"use client";

import { useState } from "react";
import { Zap, MapPin, Car, MessageSquare, Route, CheckCircle, Loader2 } from "lucide-react";
import Header from "./components/Header";
import AnimatedSection from "./components/AnimatedSection";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi girin.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("subscribers")
        .insert([{ email }]);

      if (error) {
        if (error.code === "23505") {
          setErrorMessage("Bu e-posta zaten kayıtlı.");
        } else {
          setErrorMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setErrorMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <AnimatedSection>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-8">
            <Zap className="w-10 h-10 text-emerald-400" />
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Türkiye&apos;nin Şarj İstasyonlarına
            <br />
            <span className="text-emerald-400">Güvenle Gidilen</span> Tek Uygulaması
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Gerçek zamanlı kullanıcı bildirimleri, araç bazlı uyumluluk skorları ve akıllı
            rota planlama ile şarj istasyonuna gitmeden önce durumunu bil.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-center max-w-xl mx-auto">
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading" || status === "success"}
className="flex-1 px-6 py-3 rounded-full bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"            />
            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white px-8 py-3 rounded-full font-semibold transition flex items-center justify-center gap-2 whitespace-nowrap"            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Kaydedildi!
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Erken Erişim İçin Kayıt Ol
                </>
              )}
            </button>
          </form>
          {status === "error" && (
            <p className="text-red-400 mt-4">{errorMessage}</p>
          )}
          {status === "success" && (
            <p className="text-emerald-400 mt-4">Teşekkürler! Lansman öncesi sizi bilgilendireceğiz.</p>
          )}
        </AnimatedSection>

        <AnimatedSection delay={0.4}>
          <div className="mt-6">
            <a href="/harita" className="border border-slate-500 hover:border-slate-400 text-white px-8 py-4 rounded-full font-semibold text-lg transition inline-block">
              Haritayı Gör
            </a>
          </div>
        </AnimatedSection>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-6 py-20">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Elektrikli Araç Sahiplerinin <span className="text-emerald-400">Ortak Sorunu</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8">
          <AnimatedSection delay={0.1}>
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="text-red-400 text-4xl font-bold mb-4">%67</div>
              <h3 className="text-xl font-semibold mb-2">Bozuk İstasyon</h3>
              <p className="text-slate-400">Kullanıcıların çoğu gittikleri istasyonu çalışmaz durumda buluyor.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="text-yellow-400 text-4xl font-bold mb-4">%45</div>
              <h3 className="text-xl font-semibold mb-2">Uyumsuz Soket</h3>
              <p className="text-slate-400">Araçlarına uygun şarj soketi olmayan istasyonlara gidiyorlar.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
              <div className="text-orange-400 text-4xl font-bold mb-4">%82</div>
              <h3 className="text-xl font-semibold mb-2">Güvenilmez Yorum</h3>
              <p className="text-slate-400">Mevcut uygulamalardaki yorumlar güncel ve güvenilir değil.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="text-emerald-400">OutaCharge</span> Farkı
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatedSection delay={0.1}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-6">
                <MapPin className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Gerçek Zamanlı Durum</h3>
              <p className="text-slate-400">Kullanıcı bildirimleriyle anlık istasyon durumu</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-6">
                <Car className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Araç Uyumluluğu</h3>
              <p className="text-slate-400">Aracınıza özel filtrelenmiş istasyonlar</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-6">
                <Route className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Akıllı Rota</h3>
              <p className="text-slate-400">Menzil ve şarj durumuna göre optimum rota</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-6">
                <MessageSquare className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Şeffaf Yorumlar</h3>
              <p className="text-slate-400">Doğrulanmış ve güncel kullanıcı deneyimleri</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <AnimatedSection>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Nasıl <span className="text-emerald-400">Çalışır</span>?
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <AnimatedSection delay={0.1}>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-semibold mb-3">Aracınızı Seçin</h3>
              <p className="text-slate-400">Marka ve model bilgisi ile uyumlu istasyonları görün</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-semibold mb-3">Haritada Görün</h3>
              <p className="text-slate-400">Yakınınızdaki istasyonları durumlarıyla birlikte görün</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-semibold mb-3">Bildir ve Kazan</h3>
              <p className="text-slate-400">İstasyon durumunu bildirin, puan kazanın</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="container mx-auto px-6 py-20">
        <AnimatedSection>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Erken Erişim İçin Kayıt Olun
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
              Lansman öncesi haberdar olun ve ilk kullanıcılar arasında yerinizi alın.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="flex-1 px-6 py-4 rounded-full bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-900/50 text-white px-8 py-4 rounded-full font-semibold transition flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  "Kayıt Ol"
                )}
              </button>
            </form>
            {status === "error" && (
              <p className="text-red-200 mt-4">{errorMessage}</p>
            )}
            {status === "success" && (
              <p className="text-white mt-4">Teşekkürler! Lansman öncesi sizi bilgilendireceğiz.</p>
            )}
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-2xl font-bold text-white flex items-center gap-2 mb-6 md:mb-0">
              <Zap className="w-8 h-8 text-emerald-400" />
              Outa<span className="text-emerald-400">Charge</span>
            </div>
            <div className="text-slate-400 text-sm">
              &copy; 2025 OutaCharge. Tüm hakları saklıdır.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}