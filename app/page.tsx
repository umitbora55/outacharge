"use client";
import React, { useState } from "react";
import Onboarding from "./components/Onboarding";
import HeroSection from "./components/HeroSection";
import { motion } from "framer-motion";
import { Users, ArrowRight, Zap, Globe, Sun, Leaf, Heart } from "lucide-react";
import Link from "next/link";

export default function Home() {
    const [language, setLanguage] = useState<'tr' | 'en'>('tr');

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
    };

    const t = {
        tr: {
            network: {
                badge: "Ağ Kapsamı",
                headline: ["Seninle Büyüyen", "Bir İletişim Ağı."],
                desc: "Şehir merkezlerinden uzak dağ geçitlerine kadar, seni doğaya bağlayan bir şarj ağı kuruyoruz.",
                bullets: ["Temiz Enerji", "Hızlı Şarj", "Her Zaman Erişilebilir"],
                cta: "Haritayı Keşfet",
                card: { badge: "Küresel Erişim", sub: "Tek hesap. Sınırsız destinasyon." }
            },
            community: {
                badge: "Topluluk",
                headline: ["İnsanlar Tarafından", "Yönlendirilen."],
                desc: "Dürüst incelemeler, gerçek zamanlı fotoğraflar ve en iyi şarjı bulmak için birbirine yardım eden bir topluluk.",
                cta: "Topluluğa Katıl",
                card: { badge: "4.9/5 Yıldız", sub: "Topluluk Puanı" }
            },
            route: {
                badge: "Akıllı Planlama",
                headline: ["Endişesiz", "Yolculuklar."],
                desc: "Akıllı planlayıcımız, arazi, hava durumu ve trafiği hesaba katarak en doğru menzil tahminlerini sunar.",
                cta: "Yolculuğunu Planla",
                card: { badge: "Rota", sub: "Akıllı Rota" }
            }
        },
        en: {
            network: {
                badge: "Network Coverage",
                headline: ["A Network That", "Grows With You."],
                desc: "From city centers to remote mountain passes, we're building a charging network that connects you to nature.",
                bullets: ["Clean Energy", "Fast Charging", "Always Available"],
                cta: "Explore Map",
                card: { badge: "Global Access", sub: "One account. Endless destinations." }
            },
            community: {
                badge: "Community",
                headline: ["Driven by", "People."],
                desc: "Honest reviews, real-time photos, and a community that helps each other find the best charge.",
                cta: "Join Communities",
                card: { badge: "4.9/5 Star Rating", sub: "Community Score" }
            },
            route: {
                badge: "Smart Planning",
                headline: ["Worry-Free", "Travels."],
                desc: "Our smart planner accounts for terrain, weather, and traffic to give you the most accurate range estimates.",
                cta: "Plan Your Trip",
                card: { badge: "Route", sub: "Smart Route" }
            }
        }
    };

    const content = t[language];

    // Helper for translating link routes if needed, but sticking to TR routes for now since the app structure is fixed.

    return (
        <div className="bg-[#FFFFFF] min-h-screen text-slate-800 selection:bg-green-100 overflow-x-hidden font-sans">
            <Onboarding />

            <div className="fixed inset-0 z-0 bg-stone-50" />

            <div className="relative z-10">
                {/* Hero Section with Language Props */}
                <HeroSection language={language} onToggleLanguage={toggleLanguage} />

                {/* Feature Sections */}
                <div className="relative px-6 pb-32 space-y-32 md:space-y-48 max-w-7xl mx-auto mt-20">

                    {/* Section 1: Network */}
                    <motion.section
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="grid md:grid-cols-2 gap-16 items-center"
                    >
                        <div className="space-y-8 order-2 md:order-1">
                            <div className="space-y-4">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                                    {content.network.badge}
                                </span>
                                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                    {content.network.headline[0]} <br /> <span className="text-green-600">{content.network.headline[1]}</span>
                                </h2>
                            </div>
                            <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                                {content.network.desc}
                            </p>

                            <ul className="space-y-4 pt-4">
                                {content.network.bullets.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <Leaf className="w-3.5 h-3.5 fill-current" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <Link href="/harita" className="group inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-sm font-bold tracking-wide rounded-2xl hover:bg-slate-800 transition-all mt-6 shadow-lg shadow-slate-900/10">
                                {content.network.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="relative order-1 md:order-2">
                            <div className="aspect-square rounded-[2.5rem] bg-white relative overflow-hidden group shadow-2xl shadow-slate-200 border border-slate-100 p-8 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16" />
                                <div className="relative z-10 w-16 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-bold text-slate-900 mb-2">{content.network.card.badge}</h3>
                                    <p className="text-slate-500 font-medium">{content.network.card.sub}</p>
                                </div>
                                <svg className="absolute bottom-0 right-0 w-full h-1/2 opacity-10 text-green-600" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0,100 C30,90 40,50 100,20" fill="none" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>
                    </motion.section>

                    {/* Section 2: Community */}
                    <motion.section
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="grid md:grid-cols-2 gap-16 items-center"
                    >
                        <div className="relative">
                            <div className="aspect-[4/3] rounded-[2.5rem] bg-white relative overflow-hidden group shadow-2xl shadow-slate-200 border border-slate-100 flex items-center justify-center hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -ml-16 -mb-16" />
                                <motion.div
                                    className="absolute w-12 h-12 rounded-full bg-slate-200 border-2 border-white shadow-md top-1/4 left-1/4"
                                    animate={{ y: [-5, 5, -5] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <motion.div
                                    className="absolute w-16 h-16 rounded-full bg-slate-300 border-2 border-white shadow-md bottom-1/3 right-1/4"
                                    animate={{ y: [5, -5, 5] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-xl shadow-yellow-400/30 mb-4 transform group-hover:scale-110 transition-transform duration-300">
                                        <Heart className="w-10 h-10 text-white fill-white" />
                                    </div>
                                    <div className="px-6 py-2 rounded-full bg-white shadow-lg border border-slate-100">
                                        <span className="text-sm font-bold text-slate-800">{content.community.card.badge}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 relative">
                            <div className="space-y-4">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold uppercase tracking-wider">
                                    {content.community.badge}
                                </span>
                                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                    {content.community.headline[0]} <br /> <span className="text-yellow-500">{content.community.headline[1]}</span>
                                </h2>
                            </div>
                            <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                                {content.community.desc}
                            </p>
                            <Link href="/topluluk" className="group inline-flex items-center gap-3 px-8 py-4 border-2 border-slate-100 bg-white text-slate-900 text-sm font-bold tracking-wide rounded-2xl hover:border-slate-300 transition-all mt-6">
                                {content.community.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400" />
                            </Link>
                        </div>
                    </motion.section>

                    {/* Section 3: Intelligence (Route Planner Preview) */}
                    <motion.section
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="grid md:grid-cols-2 gap-16 items-center"
                    >
                        <div className="space-y-8 order-2 md:order-1">
                            <div className="space-y-4">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                                    {content.route.badge}
                                </span>
                                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                    {content.route.headline[0]} <br /> <span className="text-blue-500">{content.route.headline[1]}</span>
                                </h2>
                            </div>
                            <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                                {content.route.desc}
                            </p>
                            <Link href="/rota-planla" className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-sm font-bold tracking-wide rounded-2xl hover:bg-blue-700 transition-all mt-6 shadow-xl shadow-blue-500/20">
                                {content.route.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="relative order-1 md:order-2">
                            {/* Illustrative Route Card */}
                            <div className="aspect-square rounded-[2.5rem] bg-white relative overflow-hidden group shadow-2xl shadow-slate-200 border border-slate-100 p-8 flex flex-col hover:-translate-y-2 transition-transform duration-500">

                                {/* Background Map Abstract */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M0,0 Q50,50 100,100 M100,0 Q50,50 0,100" stroke="currentColor" strokeWidth="0.5" fill="none" />
                                        <circle cx="20" cy="30" r="1" fill="currentColor" />
                                        <circle cx="80" cy="70" r="1" fill="currentColor" />
                                        <circle cx="50" cy="50" r="2" fill="currentColor" />
                                    </svg>
                                </div>

                                {/* Floating Inputs */}
                                <div className="relative z-10 space-y-4 mt-8">
                                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center gap-4 transform group-hover:translate-x-2 transition-transform duration-500">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <div className="w-3 h-3 rounded-full bg-current" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="h-2 w-16 bg-slate-200 rounded-full mb-2" />
                                            <div className="h-2 w-32 bg-slate-100 rounded-full" />
                                        </div>
                                    </div>

                                    <div className="absolute left-8 top-12 bottom-12 w-0.5 border-l-2 border-dashed border-slate-200 h-8 z-0 ml-4" />

                                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center gap-4 transform group-hover:translate-x-4 transition-transform duration-700 delay-100">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <Zap className="w-4 h-4 fill-current" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="h-2 w-20 bg-slate-200 rounded-full mb-2" />
                                            <div className="h-2 w-24 bg-slate-100 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Stats */}
                                <div className="mt-auto bg-slate-50 rounded-2xl p-6 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mesafe</div>
                                        <div className="text-xl font-bold text-slate-900">450 km</div>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Süre</div>
                                        <div className="text-xl font-bold text-slate-900">4s 20dk</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                </div>

                <div className="pb-32 text-center opacity-40 pointer-events-none select-none">
                    <span className="text-[12vw] font-black tracking-tight uppercase whitespace-nowrap text-slate-100">
                        OutaCharge
                    </span>
                </div>
            </div>
        </div>
    );
}
