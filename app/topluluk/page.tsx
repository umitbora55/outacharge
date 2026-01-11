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
    Loader2
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import HeaderWhite from "../components/HeaderWhite";

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
    { id: 'general', label: 'Genel', icon: Users },
    { id: 'charging', label: 'Şarj Deneyimi', icon: Zap },
    { id: 'technical', label: 'Teknik Sorular', icon: Zap },
    { id: 'car', label: 'Araç İnceleme', icon: Car },
    { id: 'news', label: 'Haberler', icon: MessageSquare },
];

const categoryColors: Record<string, { bg: string, text: string, border: string }> = {
    general: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    charging: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    technical: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    car: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    news: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
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
    { id: 'peugeot', name: 'Peugeot', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/peugeot.png', color: '#000000', postCount: 210 },
    { id: 'opel', name: 'Opel', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/opel.png', color: '#000000', postCount: 195 },
    { id: 'citroen', name: 'Citroen', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/citroen.png', color: '#000000', postCount: 180 },
];

export default function ToplulukPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'new' | 'popular'>('new');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [displayedBrands, setDisplayedBrands] = useState(brandCommunities.slice(0, 8));

    useEffect(() => {
        // Shuffle brands on mount
        const shuffled = [...brandCommunities].sort(() => 0.5 - Math.random());
        setDisplayedBrands(shuffled.slice(0, 8));
        fetchPosts();
    }, [selectedCategory, sortBy, selectedBrand]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('posts')
                .select(`
                    *,
                    user:profiles(full_name)
                `);

            // Apply filters
            if (selectedCategory !== 'all') {
                query = query.eq('category', selectedCategory);
            }
            if (selectedBrand) {
                query = query.eq('operator_name', selectedBrand);
            }

            // Apply sorting
            if (sortBy === 'new') {
                query = query.order('created_at', { ascending: false });
            } else {
                query = query.order('view_count', { ascending: false });
            }

            const { data, error } = await query;
            if (error) {
                console.error('Supabase error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }
            setPosts(data || []);
        } catch (error: any) {
            console.error('Error fetching posts:', error?.message || error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    const getCategoryIcon = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.icon || MessageCircle;
    };

    const getCategoryLabel = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.label || 'Genel';
    };

    const getBrandLogo = (brandName: string) => {
        return brandLogos[brandName] || null;
    };

    return (
        <div className="min-h-screen bg-transparent transition-colors">
            <HeaderWhite />

            {/* Hero Section */}
            <div className="relative bg-zinc-900 text-white pb-24 pt-12 overflow-hidden">
                {/* Background Image Layer */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url("/images/community-hero.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.6
                    }}
                />
                {/* Gradient Overlay for better contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-zinc-900/60 to-zinc-900 z-0" />

                <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                EV <span className="text-emerald-400">Topluluğu</span>
                            </h1>
                            <p className="text-zinc-400">
                                Deneyimlerinizi paylaşın, sorular sorun, çözümler bulun.
                            </p>
                        </div>
                        {/* Search */}
                        <div className="flex gap-3">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Konu ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/10 dark:bg-zinc-950/30 backdrop-blur border border-white/20 dark:border-zinc-800 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                            <Link
                                href="/topluluk/yeni"
                                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
                            >
                                <PenLine className="w-5 h-5" />
                                <span className="hidden sm:inline">Konu Aç</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Brand Communities Banner (Overlapping) */}
            <div className="max-w-6xl mx-auto px-4 -mt-16 mb-8 relative z-20">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            <h2 className="font-semibold text-zinc-900 dark:text-white">Marka Toplulukları</h2>
                        </div>
                        <Link href="/topluluk/markalar" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                            Tümünü Gör <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="relative overflow-hidden mt-8 px-4 pause-marquee group/marquee">
                        {/* Marquee Wrapper for Infinite Scroll */}
                        <div className="flex animate-marquee hover:pause-animation">
                            <div className="flex gap-8 items-center py-6 pr-8">
                                {/* Combine multiple copies for infinite effect */}
                                {[...brandCommunities, ...brandCommunities, ...brandCommunities].map((brand, idx) => (
                                    <motion.div
                                        key={`${brand.id}-${idx}`}
                                        whileHover={{ scale: 1.04, y: -3 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        className="flex-shrink-0"
                                    >
                                        <Link
                                            href={`/topluluk/markalar/${brand.id}`}
                                            className="group relative flex flex-col items-center p-4 min-w-[130px] rounded-xl border border-white/60 dark:border-white/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-500 overflow-hidden"
                                        >
                                            {/* Dynamic Border Glow */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />

                                            {/* Premium Logo Vessel */}
                                            <div className="relative z-10 w-16 h-16 bg-gradient-to-b from-white to-zinc-50 dark:from-white/95 dark:to-zinc-100 rounded-lg p-2.5 mb-2.5 flex items-center justify-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.08)] border border-white/80 ring-2 ring-white/40 dark:ring-white/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 ease-out">
                                                <img
                                                    src={brand.logo}
                                                    alt={brand.name}
                                                    className="w-full h-full object-contain filter drop-shadow-lg"
                                                />
                                            </div>

                                            <span className="relative z-10 text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight uppercase group-hover:text-emerald-600 transition-colors duration-300">
                                                {brand.name}
                                            </span>

                                            {/* Refraction Effect Decorator */}
                                            <div className="absolute -bottom-1 -left-1 w-12 h-12 bg-emerald-500/10 blur-[24px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                            {/* Moving Reflection Light Beam */}
                                            <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
                                                <div className="absolute -top-[100%] left-[-100%] w-[300%] h-[300%] bg-gradient-to-br from-white/20 via-transparent to-transparent rotate-45 transition-transform duration-700 group-hover:translate-x-[60%] group-hover:translate-y-[60%]" />
                                            </div>

                                            {/* Subtle Indent Decoration */}
                                            <div className="absolute bottom-2.5 w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 transition-all duration-500 group-hover:w-5 group-hover:bg-emerald-500/50" />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Immersive Edge Fades */}
                        <div className="absolute inset-y-0 left-0 w-64 bg-gradient-to-r from-white dark:from-zinc-900 via-white/80 dark:via-zinc-900/80 to-transparent z-20 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-white dark:from-zinc-900 via-white/80 dark:via-zinc-900/80 to-transparent z-20 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar - Categories */}
                    <div className="lg:w-64 flex-shrink-0">
                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowMobileFilters(true)}
                            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4 text-zinc-900 dark:text-white"
                        >
                            <Filter className="w-5 h-5" />
                            Filtrele
                        </button>

                        {/* Desktop Sidebar */}
                        <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-4 border border-zinc-100 dark:border-zinc-800 sticky top-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Kategoriler</h3>
                            <div className="space-y-1">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile Filters Modal */}
                        {showMobileFilters && (
                            <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileFilters(false)}>
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Kategoriler</h3>
                                        <button onClick={() => setShowMobileFilters(false)}>
                                            <X className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {categories.map((cat) => {
                                            const Icon = cat.icon;
                                            const isSelected = selectedCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setSelectedCategory(cat.id);
                                                        setShowMobileFilters(false);
                                                    }}
                                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all ${isSelected
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                                        }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{cat.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Active Filters */}
                        {(selectedBrand || selectedCategory !== 'all') && (
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-sm text-zinc-500">Filtreler:</span>
                                {selectedBrand && (
                                    <button
                                        onClick={() => setSelectedBrand(null)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                                    >
                                        {selectedBrand}
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {selectedCategory !== 'all' && (
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 text-zinc-700 rounded-full text-sm font-medium"
                                    >
                                        {getCategoryLabel(selectedCategory)}
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Sort */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-zinc-900 dark:text-white">
                                {loading ? 'Yükleniyor...' : `${posts.length} konu`}
                            </h2>
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg p-1 shadow-sm">
                                <button
                                    onClick={() => setSortBy('new')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === 'new'
                                        ? 'bg-zinc-900 dark:bg-zinc-700 text-white'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    Yeni
                                </button>
                                <button
                                    onClick={() => setSortBy('popular')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === 'popular'
                                        ? 'bg-zinc-900 dark:bg-zinc-700 text-white'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Popüler
                                </button>
                            </div>
                        </div>

                        {/* Posts */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm p-12 text-center">
                                <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Henüz konu yok</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-6">Bu kriterlere uygun konu bulunamadı.</p>
                                <Link
                                    href="/topluluk/yeni"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                                >
                                    <PenLine className="w-5 h-5" />
                                    İlk Konuyu Aç
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {posts.map((post) => {
                                    const CategoryIcon = getCategoryIcon(post.category);
                                    const categoryStyle = categoryColors[post.category] || { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200' };
                                    const brandLogo = post.operator_name ? getBrandLogo(post.operator_name) : null;

                                    return (
                                        <Link
                                            key={post.id}
                                            href={`/topluluk/${post.id}`}
                                            className="block bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 group"
                                        >
                                            <div className="flex gap-4">
                                                {/* Brand Logo (if brand post) */}
                                                {post.brand_community_id && brandLogo && (
                                                    <div className="hidden sm:flex w-16 h-16 bg-white dark:bg-zinc-100 rounded-2xl p-2.5 items-center justify-center flex-shrink-0 shadow-sm border border-zinc-200/50 dark:border-zinc-300">
                                                        <img src={brandLogo} alt={post.operator_name || ''} className="w-full h-full object-contain filter drop-shadow-sm" />
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    {/* Tags */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        {/* Category Badge */}
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${categoryStyle.bg} dark:bg-opacity-10 ${categoryStyle.text} border ${categoryStyle.border} dark:border-opacity-20`}>
                                                            <CategoryIcon className="w-3.5 h-3.5" />
                                                            {getCategoryLabel(post.category)}
                                                        </span>

                                                        {post.operator_name && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg text-xs font-medium border border-zinc-800 dark:border-zinc-700">
                                                                <Car className="w-3.5 h-3.5" />
                                                                {post.operator_name}
                                                            </span>
                                                        )}

                                                        {/* Model & Year Badge */}
                                                        {(post.vehicle_model || post.vehicle_year) && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-900/20">
                                                                {post.vehicle_model && <span>{post.vehicle_model}</span>}
                                                                {post.vehicle_model && post.vehicle_year && <span>•</span>}
                                                                {post.vehicle_year && <span>{post.vehicle_year}</span>}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                                                        {post.title}
                                                    </h3>

                                                    {/* Meta */}
                                                    <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{post.user.full_name}</span>
                                                        <span>{formatDate(post.created_at)}</span>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="hidden sm:flex flex-col items-end gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                                                    <span className="flex items-center gap-1.5 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                                                        <MessageCircle className="w-4 h-4" />
                                                        {post.comment_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                                                        <Eye className="w-4 h-4" />
                                                        {post.view_count || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}