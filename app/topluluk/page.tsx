"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../components/HeaderWhite";
import {
    Search,
    PenLine,
    Loader2,
    Clock,
    TrendingUp,
    MessageCircle,
    Eye,
    Car,
    Zap,
    Route,
    Wrench,
    AlertTriangle,
    Lightbulb,
    Star,
    HelpCircle,
    Battery,
    Settings,
    ThumbsUp,
    Flame,
    Users,
    ChevronRight,
    Filter,
    X
} from "lucide-react";

interface Post {
    id: string;
    user_id: string;
    title: string;
    content: string;
    category: string;
    brand_community_id: string | null;
    operator_name: string | null;
    comment_count: number;
    view_count: number;
    upvotes: number;
    downvotes: number;
    created_at: string;
    user: {
        id: string;
        full_name: string;
    };
    brand?: {
        slug: string;
        brand: string;
    };
    vehicle_model?: string | null;
    vehicle_year?: number | null;
}

interface BrandCommunity {
    id: string;
    brand: string;
    slug: string;
    member_count: number;
    post_count: number;
}

// Kategori tanımları
const categories = [
    { id: 'all', label: 'Tümü', icon: Flame, color: 'zinc' },
    { id: 'deneyim', label: 'Deneyim', icon: Car, color: 'emerald' },
    { id: 'sarj_deneyimi', label: 'Şarj', icon: Zap, color: 'amber' },
    { id: 'menzil_testi', label: 'Menzil', icon: Route, color: 'blue' },
    { id: 'sorun', label: 'Sorun', icon: Wrench, color: 'orange' },
    { id: 'sikayet', label: 'Şikayet', icon: AlertTriangle, color: 'red' },
    { id: 'ipucu', label: 'İpucu', icon: Lightbulb, color: 'yellow' },
    { id: 'gizli_ozellik', label: 'Gizli Özellik', icon: Star, color: 'purple' },
    { id: 'soru', label: 'Soru', icon: HelpCircle, color: 'cyan' },
    { id: 'batarya', label: 'Batarya', icon: Battery, color: 'green' },
    { id: 'yazilim', label: 'Yazılım', icon: Settings, color: 'indigo' },
    { id: 'tavsiye', label: 'Tavsiye', icon: ThumbsUp, color: 'pink' },
];


// Kategori renkleri
const categoryColors: { [key: string]: { bg: string; text: string; border: string } } = {
    deneyim: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    sarj_deneyimi: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    menzil_testi: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    sorun: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    sikayet: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    ipucu: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    gizli_ozellik: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    soru: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    batarya: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    yazilim: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    tavsiye: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

// Marka logo URL'leri
const brandLogoUrls: { [key: string]: string } = {
    'tesla': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png',
    'togg': 'https://raw.githubusercontent.com/nicholasadamou/car-logos/refs/heads/master/logos/togg/togg.png',
    'bmw': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png',
    'mercedes': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png',
    'audi': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/audi.png',
    'porsche': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/porsche.png',
    'volvo': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volvo.png',
    'hyundai': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/hyundai.png',
    'kia': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/kia.png',
    'volkswagen': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volkswagen.png',
    'ford': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ford.png',
    'renault': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/renault.png',
    'peugeot': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/peugeot.png',
    'fiat': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/fiat.png',
    'mg': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mg.png',
    'byd': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/byd.png',
    'nio': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/nio.png',
    'cupra': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/cupra.png',
    'mini': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mini.png',
    'lexus': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lexus.png',
};

// Supabase fetch helper
async function supabaseFetch(endpoint: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export default function ToplulukPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [brandCommunities, setBrandCommunities] = useState<BrandCommunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'new' | 'popular'>('new');
    const [showMobileFilters, setShowMobileFilters] = useState(false);


    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            // Postları çek
            let query = 'posts?is_deleted=eq.false';

            if (selectedCategory !== 'all') {
                query += `&category=eq.${selectedCategory}`;
            }

            if (selectedBrand) {
                query += `&operator_name=eq.${selectedBrand}`;
            }



            const orderBy = sortBy === 'popular' ? 'comment_count.desc' : 'created_at.desc';
            query += `&order=${orderBy}&limit=100`;

            const data = await supabaseFetch(query);

            if (data && data.length > 0) {
                // User bilgilerini çek
                const userIds = [...new Set(data.map((p: any) => p.user_id))];
                let usersMap = new Map();

                if (userIds.length > 0) {
                    try {
                        const users = await supabaseFetch(`users?id=in.(${userIds.join(',')})&select=id,full_name`);
                        if (users) {
                            usersMap = new Map(users.map((u: any) => [u.id, u]));
                        }
                    } catch (e) { }
                }

                // Brand bilgilerini çek
                const brandIds = [...new Set(data.filter((p: any) => p.brand_community_id).map((p: any) => p.brand_community_id))];
                let brandsMap = new Map();

                if (brandIds.length > 0) {
                    try {
                        const brands = await supabaseFetch(`brand_communities?id=in.(${brandIds.join(',')})&select=id,brand,slug`);
                        if (brands) {
                            brandsMap = new Map(brands.map((b: any) => [b.id, b]));
                        }
                    } catch (e) { }
                }

                const postsWithData = data.map((post: any) => ({
                    ...post,
                    user: usersMap.get(post.user_id) || { id: post.user_id, full_name: 'Anonim' },
                    brand: post.brand_community_id ? brandsMap.get(post.brand_community_id) : null
                }));

                // Arama filtresi
                let filtered = postsWithData;
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    filtered = postsWithData.filter((p: Post) =>
                        p.title.toLowerCase().includes(q) ||
                        p.content.toLowerCase().includes(q) ||
                        p.operator_name?.toLowerCase().includes(q)
                    );
                }

                setPosts(filtered);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error("Posts fetch error:", err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, selectedBrand, sortBy, searchQuery]);

    const fetchBrandCommunities = useCallback(async () => {
        try {
            const data = await supabaseFetch('brand_communities?is_active=eq.true&order=post_count.desc&limit=6');
            setBrandCommunities(data || []);
        } catch (err) {
            console.error("Brand communities fetch error:", err);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
        fetchBrandCommunities();
    }, [fetchPosts, fetchBrandCommunities]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Az önce";
        if (minutes < 60) return `${minutes} dk`;
        if (hours < 24) return `${hours} saat`;
        if (days < 7) return `${days} gün`;
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    };

    const getCategoryIcon = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.icon || Car;
    };

    const getCategoryLabel = (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.label || categoryId;
    };

    const getBrandLogo = (brandName: string) => {
        const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace('mercedes-benz', 'mercedes');
        return brandLogoUrls[slug] || null;
    };

    return (
        <div className="min-h-screen bg-zinc-50">
            <HeaderWhite />

            {/* Hero */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
                <div className="max-w-6xl mx-auto px-4 py-12">
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
                                    className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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

            {/* Brand Communities Banner */}
            <div className="bg-white border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-zinc-600" />
                            <span className="font-semibold text-zinc-900">Marka Toplulukları</span>
                        </div>
                        <Link
                            href="/topluluk/markalar"
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                        >
                            Tümünü Gör
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {brandCommunities.map((brand) => {
                            const logoUrl = getBrandLogo(brand.brand);
                            return (
                                <Link
                                    key={brand.id}
                                    href={`/topluluk/markalar/${brand.slug}`}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all hover:shadow-md flex-shrink-0 ${selectedBrand === brand.brand
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                                        }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSelectedBrand(selectedBrand === brand.brand ? null : brand.brand);
                                    }}
                                >
                                    <div className="w-8 h-8 bg-zinc-100 rounded-lg p-1.5 flex items-center justify-center">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt={brand.brand} className="w-full h-full object-contain" />
                                        ) : (
                                            <Car className="w-4 h-4 text-zinc-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-900 text-sm">{brand.brand}</p>
                                        <p className="text-xs text-zinc-500">{brand.post_count} konu</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar - Categories */}
                    <div className="lg:w-64 flex-shrink-0">
                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowMobileFilters(true)}
                            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl mb-4"
                        >
                            <Filter className="w-5 h-5" />
                            Filtrele
                        </button>

                        {/* Desktop Sidebar */}
                        <div className="hidden lg:block bg-white rounded-2xl shadow-sm p-4 sticky top-4">
                            <h3 className="font-semibold text-zinc-900 mb-3">Kategoriler</h3>
                            <div className="space-y-1">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-zinc-600 hover:bg-zinc-50'
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
                                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-lg text-zinc-900">Kategoriler</h3>
                                        <button onClick={() => setShowMobileFilters(false)}>
                                            <X className="w-6 h-6 text-zinc-500" />
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
                                                        : 'bg-zinc-100 text-zinc-700'
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
                            <h2 className="font-semibold text-zinc-900">
                                {loading ? 'Yükleniyor...' : `${posts.length} konu`}
                            </h2>
                            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
                                <button
                                    onClick={() => setSortBy('new')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === 'new'
                                        ? 'bg-zinc-900 text-white'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                        }`}
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    Yeni
                                </button>
                                <button
                                    onClick={() => setSortBy('popular')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${sortBy === 'popular'
                                        ? 'bg-zinc-900 text-white'
                                        : 'text-zinc-500 hover:text-zinc-700'
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
                            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                                <MessageCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Henüz konu yok</h3>
                                <p className="text-zinc-500 mb-6">Bu kriterlere uygun konu bulunamadı.</p>
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
                                            className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 group"
                                        >
                                            <div className="flex gap-4">
                                                {/* Brand Logo (if brand post) */}
                                                {post.brand_community_id && brandLogo && (
                                                    <div className="hidden sm:flex w-12 h-12 bg-zinc-100 rounded-xl p-2 items-center justify-center flex-shrink-0">
                                                        <img src={brandLogo} alt={post.operator_name || ''} className="w-full h-full object-contain" />
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    {/* Tags */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        {/* Category Badge */}
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
                                                            <CategoryIcon className="w-3.5 h-3.5" />
                                                            {getCategoryLabel(post.category)}
                                                        </span>

                                                        {post.operator_name && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-medium">
                                                                <Car className="w-3.5 h-3.5" />
                                                                {post.operator_name}
                                                            </span>
                                                        )}

                                                        {/* Model & Year Badge */}
                                                        {(post.vehicle_model || post.vehicle_year) && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                                                {post.vehicle_model && <span>{post.vehicle_model}</span>}
                                                                {post.vehicle_model && post.vehicle_year && <span>•</span>}
                                                                {post.vehicle_year && <span>{post.vehicle_year}</span>}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="font-semibold text-zinc-900 mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                                                        {post.title}
                                                    </h3>

                                                    {/* Meta */}
                                                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                                                        <span className="font-medium text-zinc-700">{post.user.full_name}</span>
                                                        <span>{formatDate(post.created_at)}</span>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="hidden sm:flex flex-col items-end gap-2 text-sm text-zinc-400">
                                                    <span className="flex items-center gap-1.5">
                                                        <MessageCircle className="w-4 h-4" />
                                                        {post.comment_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
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
            </div>
        </div>
    );
}