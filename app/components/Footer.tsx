"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Twitter,
    Instagram,
    Linkedin,
    Github,
    Mail,
    MapPin,
    Zap
} from "lucide-react";

interface FooterProps {
    language: 'tr' | 'en';
}

const Footer: React.FC<FooterProps> = ({ language }) => {
    const t = {
        tr: {
            bio: "Elektrikli araç yolculuklarını daha akıllı, daha güvenli ve daha keyifli hale getiriyoruz. Doğayı ve teknolojiyi şarjla buluşturan yeni nesil platform.",
            sections: {
                platform: {
                    title: "Platform",
                    links: [
                        { label: "Şarj Haritası", href: "/harita" },
                        { label: "Rota Planlayıcı", href: "/rota-planla" },
                        { label: "Hesaplayıcı", href: "/hesaplayici" },
                        { label: "Topluluk", href: "/topluluk" },
                    ]
                },
                corporate: {
                    title: "Kurumsal",
                    links: [
                        { label: "Hakkımızda", href: "/profil" },
                        { label: "Operatörler", href: "/operatorler" },
                        { label: "Markalar", href: "/markalar" },
                        { label: "İletişim", href: "mailto:info@outacharge.com" },
                    ]
                },
                legal: {
                    title: "Yasal",
                    links: [
                        { label: "Gizlilik Politikası", href: "#" },
                        { label: "Kullanım Şartları", href: "#" },
                        { label: "Çerez Politikası", href: "#" },
                        { label: "KVKK Aydınlatma", href: "#" },
                    ]
                }
            },
            contact: {
                title: "Bize Ulaşın",
                email: "destek@outacharge.com",
                location: "İstanbul, Türkiye"
            },
            newsletter: {
                title: "Gelecekten Haberdar Ol",
                placeholder: "E-posta adresin",
                button: "Abone Ol"
            },
            copyright: "© 2024 OutaCharge. Tüm hakları saklıdır."
        },
        en: {
            bio: "We make electric vehicle journeys smarter, safer, and more enjoyable. The next-generation platform connecting nature and technology with a charge.",
            sections: {
                platform: {
                    title: "Platform",
                    links: [
                        { label: "Charging Map", href: "/harita" },
                        { label: "Route Planner", href: "/rota-planla" },
                        { label: "Calculator", href: "/hesaplayici" },
                        { label: "Community", href: "/topluluk" },
                    ]
                },
                corporate: {
                    title: "Corporate",
                    links: [
                        { label: "About Us", href: "/profil" },
                        { label: "Operators", href: "/operatorler" },
                        { label: "Brands", href: "/markalar" },
                        { label: "Contact", href: "mailto:info@outacharge.com" },
                    ]
                },
                legal: {
                    title: "Legal",
                    links: [
                        { label: "Privacy Policy", href: "#" },
                        { label: "Terms of Service", href: "#" },
                        { label: "Cookie Policy", href: "#" },
                        { label: "GDPR Compliance", href: "#" },
                    ]
                }
            },
            contact: {
                title: "Contact Us",
                email: "support@outacharge.com",
                location: "Istanbul, Turkey"
            },
            newsletter: {
                title: "Stay Charged",
                placeholder: "Your email adress",
                button: "Subscribe"
            },
            copyright: "© 2024 OutaCharge. All rights reserved."
        }
    };

    const content = t[language];

    return (
        <footer className="relative bg-[#050505] pt-32 pb-16 px-6 border-t border-white/5 overflow-hidden font-sans selection:bg-green-500/30">
            {/* NOISE TEXTURE OVERLAY - Premium Matte Finish */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
                style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />

            {/* INTENSE LUMINOUS MESH BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-green-500/20 rounded-full blur-[160px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        x: [0, -50, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[160px]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-[#050505]/20 to-[#050505]/90" />
            </div>

            <div className="max-w-7xl mx-auto relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 lg:gap-20 mb-32">

                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-12">
                        <Link href="/" className="inline-block group">
                            <div className="flex items-center gap-5">
                                <motion.div
                                    whileHover={{ rotate: -10, scale: 1.1, filter: "brightness(1.5)" }}
                                    className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-green-400 via-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(34,197,94,0.3)] border border-white/20"
                                >
                                    <Zap className="w-9 h-9 fill-current" />
                                </motion.div>
                                <span className="text-5xl font-black tracking-tighter">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white">Outa</span>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-500 to-blue-400">Charge</span>
                                </span>
                            </div>
                        </Link>

                        <div className="relative group/bio">
                            <div className="absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-blue-500 to-transparent rounded-full opacity-40 group-hover/bio:opacity-100 transition-opacity duration-700" />
                            <p className="text-white/40 text-2xl font-medium leading-tight max-w-sm group-hover:text-white/60 transition-colors duration-500 italic tracking-tight">
                                {content.bio}
                            </p>
                        </div>

                        <div className="flex items-center gap-6">
                            {[
                                { icon: Twitter, href: "#" },
                                { icon: Instagram, href: "#" },
                                { icon: Linkedin, href: "#" },
                                { icon: Github, href: "#" },
                            ].map((social, i) => (
                                <motion.a
                                    key={i}
                                    href={social.href}
                                    whileHover={{ y: -8, scale: 1.15, rotate: i % 2 === 0 ? 5 : -5 }}
                                    className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-3xl flex items-center justify-center text-white/30 hover:text-white shadow-2xl transition-all border border-white/10 hover:border-white/30 hover:bg-white/10"
                                >
                                    <social.icon className="w-6 h-6" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="space-y-12 pt-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{content.sections.platform.title}</h4>
                        <ul className="space-y-8">
                            {content.sections.platform.links.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-white/40 hover:text-white transition-all font-bold text-xl flex items-center group/link">
                                        <div className="w-0 group-hover/link:w-4 h-1 bg-green-400 rounded-full mr-0 group-hover/link:mr-4 transition-all duration-500 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-12 pt-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{content.sections.corporate.title}</h4>
                        <ul className="space-y-8">
                            {content.sections.corporate.links.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-white/40 hover:text-white transition-all font-bold text-xl flex items-center group/link">
                                        <div className="w-0 group-hover/link:w-4 h-1 bg-blue-400 rounded-full mr-0 group-hover/link:mr-4 transition-all duration-500 shadow-[0_0_20px_rgba(96,165,250,0.8)]" />
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-12 pt-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{content.newsletter.title}</h4>
                        <div className="space-y-10">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-500 to-emerald-400 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-20 transition duration-1000 animate-pulse" />
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder={content.newsletter.placeholder}
                                        className="w-full px-8 py-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] text-lg font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-4 focus:ring-white/10 transition-all shadow-inner"
                                    />
                                    <button className="absolute right-3 top-3 px-6 py-3.5 bg-white text-slate-900 text-xs font-black rounded-2xl hover:bg-green-400 transition-all shadow-2xl active:scale-95">
                                        {content.newsletter.button}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-6 text-white/30 group/item cursor-pointer">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/item:text-green-400 group-hover/item:bg-white/10 group-hover/item:border-white/20 transition-all shadow-2xl">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <span className="text-lg font-black tracking-tight">{content.contact.email}</span>
                                </div>
                                <div className="flex items-center gap-6 text-white/30 group/item cursor-pointer">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/item:text-blue-400 group-hover/item:bg-white/10 group-hover/item:border-white/20 transition-all shadow-2xl">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <span className="text-lg font-black tracking-tight">{content.contact.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-20 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-12">
                    <div className="flex flex-wrap justify-center items-center gap-12">
                        {content.sections.legal.links.map((link, i) => (
                            <Link key={i} href={link.href} className="text-[9px] font-black text-white/20 hover:text-white transition-all uppercase tracking-[0.5em]">
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-5 py-4 px-8 rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 shadow-3xl"
                    >
                        <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_15px_rgba(74,222,128,1)] animate-pulse" />
                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] leading-none">
                            {content.copyright}
                        </p>
                    </motion.div>
                </div>
            </div>

            <style jsx>{`
                footer {
                    background-image: 
                        radial-gradient(circle at 50% 100%, rgba(34, 197, 94, 0.05), transparent 50%),
                        radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.05), transparent 50%);
                }
            `}</style>
        </footer>
    );
};

export default Footer;
