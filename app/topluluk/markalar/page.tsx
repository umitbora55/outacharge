"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../../components/HeaderWhite";
import {
    Car,
    Users,
    MessageSquare,
    Loader2,
    Star,
    Shield,
    Zap,
    ChevronRight
} from "lucide-react";

interface BrandCommunity {
    id: string;
    brand: string;
    slug: string;
    logo_url: string | null;
    cover_url: string | null;
    description: string;
    member_count: number;
    post_count: number;
    is_member?: boolean;
    is_user_brand?: boolean;
}

// Marka logo URL'leri (GitHub raw)
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

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

export default function MarkaTopluluklariPage() {
    const { user } = useAuth();
    const [communities, setCommunities] = useState<BrandCommunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCommunities();
    }, [user]);

    const fetchCommunities = async () => {
        setLoading(true);
        try {
            const data = await supabaseFetch('brand_communities?is_active=eq.true&order=member_count.desc');

            if (user) {
                try {
                    const memberships = await supabaseFetch(`brand_community_members?user_id=eq.${user.id}&select=community_id`);
                    const membershipSet = new Set<string>(memberships.map((m: any) => m.community_id));
                    setUserMemberships(membershipSet);
                } catch (e) {
                    console.log("Memberships fetch failed");
                }
            }

            const userBrand = user?.vehicleBrand?.toLowerCase();

            const communitiesWithStatus = data.map((community: BrandCommunity) => ({
                ...community,
                is_user_brand: userBrand ? community.brand.toLowerCase().includes(userBrand) || userBrand.includes(community.brand.toLowerCase()) : false
            }));

            communitiesWithStatus.sort((a: BrandCommunity, b: BrandCommunity) => {
                if (a.is_user_brand && !b.is_user_brand) return -1;
                if (!a.is_user_brand && b.is_user_brand) return 1;
                return b.member_count - a.member_count;
            });

            setCommunities(communitiesWithStatus);
        } catch (err) {
            console.error("Communities fetch error:", err);
            setCommunities([]);
        } finally {
            setLoading(false);
        }
    };

    const getBrandLogo = (slug: string) => {
        return brandLogoUrls[slug] || null;
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-transparent">
            <HeaderWhite />

            {/* Hero */}
            <div className="relative bg-zinc-900 text-white pb-24 pt-12 overflow-hidden">
                {/* Background Image Layer */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url("/images/brands-hero.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.7
                    }}
                />
                {/* Gradient Overlay for better contrast */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-zinc-900/40 to-zinc-900 z-0" />

                <div className="relative max-w-6xl mx-auto px-4 py-16 z-10">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/10">
                            <Car className="w-4 h-4" />
                            Premium Topluluklar
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Marka <span className="text-emerald-400">Toplulukları</span>
                        </h1>

                        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                            Aynı markayı kullanan EV sahipleriyle tanışın, deneyimlerinizi paylaşın
                            ve markanıza özel ipuçları öğrenin.
                        </p>

                        {/* Stats */}
                        <div className="flex items-center justify-center gap-8 mt-10">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white">{communities.length}</p>
                                <p className="text-sm text-zinc-400">Marka</p>
                            </div>
                            <div className="w-px h-12 bg-zinc-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white">
                                    {communities.reduce((acc, c) => acc + c.member_count, 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-zinc-400">Üye</p>
                            </div>
                            <div className="w-px h-12 bg-zinc-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white">
                                    {communities.reduce((acc, c) => acc + c.post_count, 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-zinc-400">Konu</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User's Brand Highlight */}
            {user?.vehicleBrand && (
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <div className="max-w-6xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <Star className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {user.vehicleBrand} sahibisin! Özel topluluğuna katıl.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Communities Grid */}
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Tüm Markalar</h2>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{communities.length} topluluk</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {communities.map((community) => {
                            const logoUrl = getBrandLogo(community.slug);
                            const isMember = userMemberships.has(community.id);

                            return (
                                <Link
                                    key={community.id}
                                    href={`/topluluk/markalar/${community.slug}`}
                                    className="group relative pt-6"
                                >
                                    {/* Premium Badges */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 transition-transform duration-500 group-hover:-translate-y-1">
                                        {community.is_user_brand ? (
                                            <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/40 border border-white/20 flex items-center gap-2 animate-pulse-slow">
                                                <Star className="w-3 h-3 fill-white" />
                                                SENİN MARKAN
                                            </div>
                                        ) : isMember ? (
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 border border-white/10 flex items-center gap-2">
                                                <Shield className="w-3 h-3" />
                                                ÜYESİN
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Card Container */}
                                    <div className={`relative bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 transition-all duration-700 hover:-translate-y-3 border ${community.is_user_brand
                                        ? 'border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
                                        : 'border-zinc-100 dark:border-zinc-800/50 shadow-xl shadow-zinc-200/50 dark:shadow-black/40 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/30'
                                        }`}>

                                        {/* Background Decorative Element */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-10 -mt-10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                        {/* Premium Logo Showcase */}
                                        <div className="relative w-36 h-36 mx-auto mb-6">
                                            {/* Advanced Glow & Shadow */}
                                            <div className={`absolute inset-0 rounded-3xl blur-2xl transition-all duration-700 opacity-0 group-hover:opacity-100 ${community.is_user_brand ? 'bg-emerald-400/40' : 'bg-emerald-400/20'
                                                }`} />

                                            {/* Logo Pod */}
                                            <div className="relative w-full h-full bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-white dark:to-zinc-100 rounded-3xl shadow-[inset_0_-2px_10px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.1)] border border-white dark:border-zinc-200/50 flex items-center justify-center p-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 ease-out">
                                                {logoUrl ? (
                                                    <img
                                                        src={logoUrl}
                                                        alt={community.brand}
                                                        className="w-full h-full object-contain filter drop-shadow-md"
                                                    />
                                                ) : (
                                                    <Car className="w-12 h-12 text-zinc-300" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Brand Details */}
                                        <div className="relative text-center">
                                            <div className="h-16 flex flex-col justify-center mb-4">
                                                <h3 className="font-black text-zinc-900 dark:text-white text-lg leading-tight group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2">
                                                    {community.brand}
                                                </h3>
                                            </div>

                                            {/* Modern Stats Display */}
                                            <div className="flex items-center justify-center gap-6">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight">{community.member_count}</span>
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">üye</span>
                                                </div>
                                                <div className="w-px h-6 bg-zinc-100 dark:bg-zinc-800" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight">{community.post_count}</span>
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">konu</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Interactive Hover Link Indicator */}
                                        <div className="mt-6 flex justify-center">
                                            <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-400 group-hover:text-white transition-all duration-500">
                                                <ChevronRight className="w-5 h-5 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>

                                        {/* Subtle Progress Bar Decoration */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-700 ease-out scale-x-0 group-hover:scale-x-100 origin-center ${community.is_user_brand ? 'bg-emerald-500' : 'bg-zinc-400'
                                                }`} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* No Brand Selected Info */}
                {!user?.vehicleBrand && !loading && (
                    <div className="mt-12 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8 text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold text-amber-900 mb-2">Aracınızı Ekleyin</h3>
                        <p className="text-amber-700 mb-6 max-w-md mx-auto">
                            Profilinize aracınızı ekleyerek marka topluluğunuza otomatik katılın ve
                            özel içeriklere erişin.
                        </p>
                        <Link
                            href="/profil"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/30"
                        >
                            <Car className="w-5 h-5" />
                            Profili Düzenle
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}