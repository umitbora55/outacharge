import { Zap, Car, Map, MessageSquare, XCircle, HelpCircle, AlertCircle, MapPin, Star, Shield } from "lucide-react";
import Header from "./components/Header";
import AnimatedSection from "./components/AnimatedSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-500/20 p-4 rounded-full">
                <Zap className="w-16 h-16 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Türkiye&apos;nin Şarj İstasyonlarına
              <span className="text-emerald-400"> Güvenle Gidilen</span> Tek Uygulaması
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Gerçek zamanlı kullanıcı bildirimleri, araç bazlı uyumluluk skorları ve akıllı rota planlama ile şarj istasyonuna gitmeden önce durumunu bil.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Erken Erişim İçin Kayıt Ol
              </button>
<a href="/harita" className="border border-slate-500 hover:border-slate-400 text-white px-8 py-4 rounded-full font-semibold text-lg transition">
  Haritayı Gör
</a>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-6 py-16">
        <AnimatedSection>
          <div className="bg-slate-800/50 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Sorunu Biliyoruz</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <XCircle className="w-16 h-16 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">İstasyon Müsait Diyor</h3>
                <p className="text-slate-400">Gidince bozuk çıkıyor, vakit ve enerji kaybı yaşıyorsun.</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <HelpCircle className="w-16 h-16 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Araç Uyumu Bilinmiyor</h3>
                <p className="text-slate-400">Aracın o istasyonla uyumlu mu? Deneyene kadar bilemiyorsun.</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <AlertCircle className="w-16 h-16 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Olumsuz Yorum Yok</h3>
                <p className="text-slate-400">Rakip uygulamalar kendi ağlarını kötülemiyor.</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-16">
        <AnimatedSection>
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Neden OutaCharge?</h2>
        </AnimatedSection>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedSection delay={0.1}>
            <div className="bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition h-full">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gerçek Zamanlı Veri</h3>
              <p className="text-slate-400 text-sm">Kullanıcı bildirimleriyle anlık istasyon durumu.</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition h-full">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Car className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Araç Uyumluluğu</h3>
              <p className="text-slate-400 text-sm">Aracına özel başarı oranı ve uyumluluk skoru.</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <div className="bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition h-full">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Akıllı Rota</h3>
              <p className="text-slate-400 text-sm">Güvenilir istasyonlarla optimize edilmiş rota.</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.4}>
            <div className="bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition h-full">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Şeffaf Yorumlar</h3>
              <p className="text-slate-400 text-sm">Filtresiz, gerçek kullanıcı deneyimleri.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-16">
        <AnimatedSection>
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Nasıl Çalışır?</h2>
        </AnimatedSection>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-8">
            <AnimatedSection delay={0.1}>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Aracını Seç</h3>
                  <p className="text-slate-400">Marka ve modelini gir, sana özel uyumluluk verisi göster.</p>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Haritada Gör</h3>
                  <p className="text-slate-400">Yakınındaki istasyonları güvenilirlik skorlarıyla gör.</p>
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.3}>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Bildir ve Kazan</h3>
                  <p className="text-slate-400">İstasyonu kullandıktan sonra tek tuşla bildir, puan kazan.</p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <AnimatedSection>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-3xl p-8 md:p-12 text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Erken Erişim İçin Kayıt Ol</h2>
            <p className="text-emerald-100 mb-8 max-w-xl mx-auto">İlk kullanıcılar arasında ol, ücretsiz premium üyelik kazan.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="E-posta adresin"
                className="flex-1 px-6 py-4 rounded-full bg-white text-slate-900 border-2 border-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-semibold transition">
                Kayıt Ol
              </button>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer id="contact" className="container mx-auto px-6 py-12 border-t border-slate-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            Outa<span className="text-emerald-400">Charge</span>
          </div>
          <p className="text-slate-400 text-sm">
            2024 OutaCharge. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-white transition">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-white transition">Instagram</a>
            <a href="#" className="text-slate-400 hover:text-white transition">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}