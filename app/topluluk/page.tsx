"use client";

import { useState, useEffect } from "react";
import {
    Search,
    MessageCircle,
    Eye,
    Clock,
    TrendingUp,
    PenLine,
    Filter,
    X,
    ChevronRight,
    Car,
    Zap,
    Users,
    MessageSquare,
    Loader2,
    AlertTriangle,
    HelpCircle,
    Lightbulb,
    Newspaper
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import CommunityChat from "../components/CommunityChat";

// Types
interface Post {
    id: string;
    title: string;
    content: string;
    category: string;
    user_id: string;
    operator_name?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    brand_community_id?: string;
    view_count: number;
    comment_count: number;
    created_at: string;
    user: {
        full_name: string;
    };
}

const categories = [
    { id: 'all', label: 'Tümü', icon: MessageCircle },
    { id: 'istasyon_sikayeti', label: 'İstasyon Şikayeti', icon: AlertTriangle },
    { id: 'operator_sikayeti', label: 'Operatör Şikayeti', icon: Zap },
    { id: 'deneyim', label: 'Deneyim', icon: Car },
    { id: 'soru', label: 'Soru', icon: HelpCircle },
    { id: 'oneri', label: 'Öneri', icon: Lightbulb },
    { id: 'haber', label: 'Haber', icon: Newspaper },
];

const categoryColors: Record<string, { bg: string, text: string, border: string }> = {
    // Premium Minimalist Style - All Monochrome/Glass
    istasyon_sikayeti: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
    operator_sikayeti: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
    deneyim: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
    soru: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
    oneri: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
    haber: { bg: 'bg-white', text: 'text-slate-700', border: 'border-slate-200' },
};

// Brand logos mapping
const brandLogos: Record<string, string> = {
    'Tesla': '/images/brand-logos/tesla.png',
    'Togg': '/images/brand-logos/togg.png',
    'BMW': '/images/brand-logos/bmw.png',
    'Mercedes-Benz': '/images/brand-logos/mercedes.png',
    'Hyundai': '/images/brand-logos/hyundai.png',
    'Kia': '/images/brand-logos/kia.png',
    'Volvo': '/images/brand-logos/volvo.png',
    'Renault': '/images/brand-logos/renault.png',
    'Skywell': '/images/brand-logos/skywell.png',
    'BYD': '/images/brand-logos/byd.png',
    'MG': '/images/brand-logos/mg.png',
    'Fiat': '/images/brand-logos/fiat.png',
    'Ford': '/images/brand-logos/ford.png',
    'Porsche': '/images/brand-logos/porsche.png',
    'Audi': '/images/brand-logos/audi.png',
};

// Brand community backgrounds
const brandCommunities = [
    { id: 'tesla', name: 'Tesla', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png', color: '#E31937', postCount: 1250 },
    { id: 'togg', name: 'Togg', logo: 'https://raw.githubusercontent.com/nicholasadamou/car-logos/refs/heads/master/logos/togg/togg.png', color: '#004C5A', postCount: 840 },
    { id: 'bmw', name: 'BMW', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png', color: '#0066B3', postCount: 620 },
    { id: 'mercedes', name: 'Mercedes-Benz', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png', color: '#000000', postCount: 540 },
    { id: 'hyundai', name: 'Hyundai', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/hyundai.png', color: '#002C5F', postCount: 480 },
    { id: 'kia', name: 'Kia', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/kia.png', color: '#BB162B', postCount: 390 },
    { id: 'volvo', name: 'Volvo', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volvo.png', color: '#003057', postCount: 340 },
    { id: 'renault', name: 'Renault', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/renault.png', color: '#FFCC33', postCount: 310 },
    { id: 'audi', name: 'Audi', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/audi.png', color: '#000000', postCount: 290 },
    { id: 'porsche', name: 'Porsche', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/porsche.png', color: '#000000', postCount: 180 },
    { id: 'volkswagen', name: 'Volkswagen', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volkswagen.png', color: '#000000', postCount: 410 },
    { id: 'ford', name: 'Ford', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ford.png', color: '#000000', postCount: 220 },
    { id: 'byd', name: 'BYD', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/byd.png', color: '#000000', postCount: 670 },
    { id: 'mg', name: 'MG', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mg.png', color: '#000000', postCount: 340 },
    { id: 'fiat', name: 'Fiat', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/fiat.png', color: '#000000', postCount: 150 },
];

export default function ToplulukPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'new' | 'popular'>('new');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [displayedBrands, setDisplayedBrands] = useState(brandCommunities.slice(0, 10));

    // Header Content
    const content = {
        locations: "İstasyonlar",
        community: "Topluluk",
        login: "Giriş Yap",
        getStarted: "Hemen Başla"
    };

    useEffect(() => {
        // Shuffle brands on mount
        const shuffled = [...brandCommunities].sort(() => 0.5 - Math.random());
        setDisplayedBrands(shuffled.slice(0, 10));
        fetchPosts();
    }, [selectedCategory, sortBy, selectedBrand]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let query = supabase.from('posts').select('*, user:users(full_name)');

            if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
            if (selectedBrand) query = query.eq('operator_name', selectedBrand);
            query = query.order(sortBy === 'new' ? 'created_at' : 'view_count', { ascending: false });

            let { data, error } = await query;

            // Fallback if join fails
            if (error) {
                console.warn("Fallback fetch due to join error");
                // Minimal fallback implementation details omitted for brevity, assuming standard fetch works
                let fQuery = supabase.from('posts').select('*');
                if (selectedCategory !== 'all') fQuery = fQuery.eq('category', selectedCategory);
                if (selectedBrand) fQuery = fQuery.eq('operator_name', selectedBrand);
                fQuery = fQuery.order(sortBy === 'new' ? 'created_at' : 'view_count', { ascending: false });
                const { data: pData } = await fQuery;
                setPosts(pData?.map(p => ({ ...p, user: { full_name: 'Anonim' } })) || []);
            } else {
                setPosts(data || []);
            }

        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    };

    const getCategoryIcon = (categoryId: string) => categories.find(c => c.id === categoryId)?.icon || MessageCircle;
    const getBrandLogo = (brandName: string) => brandLogos[brandName] || null;

    return (
        <div className="min-h-screen bg-[#f0fdf4] font-sans text-slate-900 pb-20 overflow-x-hidden relative">

            {/* Background Illustration (Premium Touch) */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-top bg-no-repeat grayscale-[20%]"
                    style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f0fdf4]/50 to-[#f0fdf4]" />
            </div>

            {/* 1. Header (Consistent with Landing) */}
            <nav className="fixed top-6 left-6 right-6 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Outa<span className="text-green-600">Charge</span></span>
                </Link>

                <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
                    <Link href="/harita" className="hover:text-green-600 transition-colors">{content.locations}</Link>
                    <Link href="/topluluk" className="text-green-600 transition-colors">{content.community}</Link>
                    <Link href="/operatorler" className="hover:text-green-600 transition-colors">Operatörler</Link>
                    <Link href="/harita" className="hover:text-green-600 transition-colors">İstasyonlar</Link>
                    <Link href="/rota-planla" className="hover:text-green-600 transition-colors">Rota Planlayıcı</Link>
                    <Link href="/incelemeler" className="hover:text-green-600 transition-colors">İncelemeler</Link>
                    <Link href="/hesaplayici" className="hover:text-green-600 transition-colors">Hesaplayıcı</Link>
                </div>

                <div className="hidden md:flex items-center gap-5">
                    <Link href="/giris">
                        <button className="text-sm font-semibold text-slate-600 hover:text-green-700 transition-colors">
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

            {/* 2. Hero Section - Creative & Dynamic */}
            <div className="relative z-10 pt-44 pb-16 px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 relative group cursor-default"
                >
                    <div className="absolute inset-0 bg-green-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full" />
                    <div className="relative px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-green-900/5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-slate-600 text-xs font-bold tracking-[0.15em] uppercase">Community Hub</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
                        Birlikte, <br className="md:hidden" />
                        <span className="relative inline-block">
                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 animate-gradient-x">Daha İleriye.</span>
                            <span className="absolute -bottom-2 left-0 right-0 h-4 bg-green-200/50 -rotate-1 rounded-full blur-sm -z-10" />
                        </span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg md:text-2xl text-slate-500 max-w-2xl font-medium leading-relaxed"
                >
                    Elektrikli araç sahiplerinin <span className="text-slate-900 font-semibold underline decoration-green-300 decoration-2 underline-offset-4">buluşma noktası.</span>
                    <br />Deneyimlerini paylaş, geleceğe yön ver.
                </motion.p>
            </div>

            {/* 3. Main Content Grid */}
            <div className="container max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left: Feed (Masonry Style Cards) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Filters Bar - Glass Pills */}
                    <div className="hidden md:flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`relative group flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${isSelected
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                                        : 'bg-white/60 backdrop-blur-md text-slate-500 hover:bg-white hover:text-green-600 shadow-sm border border-white/50 hover:shadow-md'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isSelected ? 'text-green-400' : ''}`} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Posts List */}
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>
                    ) : posts.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
                            <MessageCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Henüz içerik yok</h3>
                            <p className="text-slate-500 mt-2">Bu kategoride ilk paylaşımı sen yap!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {posts.map((post, idx) => {
                                const CategoryIcon = getCategoryIcon(post.category);
                                const brandLogo = post.operator_name ? getBrandLogo(post.operator_name) : null;
                                return (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link href={`/topluluk/${post.id}`}>
                                            <div className="group relative bg-white/80 backdrop-blur-sm rounded-[2rem] p-7 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-white/50 hover:border-green-200/50 hover:shadow-[0_20px_40px_-12px_rgba(22,163,74,0.15)] transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden">

                                                {/* Hover Gradient Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                <div className="relative flex items-start justify-between gap-6">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform duration-300`}>
                                                                <CategoryIcon className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                                                <span className="text-slate-600">{post.user.full_name}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                <span>{formatDate(post.created_at)}</span>
                                                            </div>
                                                        </div>

                                                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-green-700 transition-all leading-tight">
                                                            {post.title}
                                                        </h3>
                                                        <p className="text-slate-500 text-base line-clamp-2 leading-relaxed font-medium">
                                                            {post.content}
                                                        </p>

                                                        <div className="mt-6 flex items-center gap-6 border-t border-slate-100/50 pt-4">
                                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-600/80 transition-colors">
                                                                <MessageCircle className="w-4 h-4" />
                                                                {post.comment_count || 0} Yorum
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-600/80 transition-colors">
                                                                <Eye className="w-4 h-4" />
                                                                {post.view_count || 0} Görüntülenme
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {brandLogo && (
                                                        <div className="hidden sm:flex w-16 h-16 bg-white rounded-2xl p-3 items-center justify-center border border-slate-100 shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                                            <img src={brandLogo} alt="" className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Floating Sidebar (Glass) */}
                <div className="hidden lg:block lg:col-span-4 space-y-6">

                    {/* New Post Button */}
                    <Link href="/topluluk/yeni" className="block w-full group">
                        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 group-hover:bg-slate-800 transition-all transform group-hover:scale-[1.02]">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <PenLine className="w-4 h-4" />
                            </div>
                            <span className="font-bold">Yeni Konu Başlat</span>
                        </div>
                    </Link>

                    {/* Brand Communities (Pills) */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Marka Toplulukları
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {displayedBrands.slice(0, 10).map((brand) => (
                                <Link key={brand.id} href={`/topluluk/markalar/${brand.id}`}>
                                    <div className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-700 text-xs font-semibold transition-colors border border-slate-100">
                                        {brand.name}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Live Chat Teaser */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-[500px] relative">
                        <div className="absolute top-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm z-10 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-sm">Canlı Sohbet</h3>
                        </div>
                        <div className="pt-12 h-full">
                            <CommunityChat />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}