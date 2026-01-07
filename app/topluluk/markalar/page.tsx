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
    Zap
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
        <div className="min-h-screen bg-zinc-50">
            <HeaderWhite />

            {/* Hero */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-zinc-300 mb-6">
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
                                <p className="text-sm text-zinc-500">Marka</p>
                            </div>
                            <div className="w-px h-12 bg-zinc-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white">
                                    {communities.reduce((acc, c) => acc + c.member_count, 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-zinc-500">Üye</p>
                            </div>
                            <div className="w-px h-12 bg-zinc-700" />
                            <div className="text-center">
                                <p className="text-3xl font-bold text-white">
                                    {communities.reduce((acc, c) => acc + c.post_count, 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-zinc-500">Konu</p>
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
                    <h2 className="text-xl font-bold text-zinc-900">Tüm Markalar</h2>
                    <span className="text-sm text-zinc-500">{communities.length} topluluk</span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {communities.map((community) => {
                            const logoUrl = getBrandLogo(community.slug);

                            return (
                                <Link
                                    key={community.id}
                                    href={`/topluluk/markalar/${community.slug}`}
                                    className="group relative pt-4"
                                >
                                    {/* Badge - Kartın Üstünde */}
                                    {community.is_user_brand && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 whitespace-nowrap">
                                                <Star className="w-3.5 h-3.5 fill-white" />
                                                Senin Markan
                                            </div>
                                        </div>
                                    )}

                                    {/* Member Badge */}
                                    {userMemberships.has(community.id) && !community.is_user_brand && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1.5 whitespace-nowrap">
                                                <Shield className="w-3.5 h-3.5" />
                                                Üye
                                            </div>
                                        </div>
                                    )}

                                    {/* Card */}
                                    <div className={`relative bg-white rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${community.is_user_brand
                                        ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10 mt-2'
                                        : 'shadow-md hover:shadow-xl'
                                        }`}>

                                        {/* Premium Logo Container */}
                                        <div className="relative w-24 h-24 mx-auto mb-5">
                                            {/* Glow Effect */}
                                            <div className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-500 ${community.is_user_brand
                                                ? 'bg-emerald-400/30 opacity-100'
                                                : 'bg-zinc-300/50 opacity-0 group-hover:opacity-100'
                                                }`} />

                                            {/* Logo Background */}
                                            <div className="relative w-full h-full bg-gradient-to-br from-white via-zinc-50 to-zinc-100 rounded-2xl shadow-inner border border-zinc-200/50 flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-500">
                                                {logoUrl ? (
                                                    <img
                                                        src={logoUrl}
                                                        alt={community.brand}
                                                        className="w-full h-full object-contain drop-shadow-md"
                                                    />
                                                ) : (
                                                    <Car className="w-12 h-12 text-zinc-300" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Brand Name */}
                                        <h3 className="text-center font-bold text-zinc-900 text-lg mb-3 group-hover:text-emerald-600 transition-colors duration-300">
                                            {community.brand}
                                        </h3>

                                        {/* Stats */}
                                        <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4" />
                                                {community.member_count}
                                            </span>
                                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                                            <span className="flex items-center gap-1.5">
                                                <MessageSquare className="w-4 h-4" />
                                                {community.post_count}
                                            </span>
                                        </div>

                                        {/* Bottom Gradient Line */}
                                        <div className="absolute bottom-0 left-4 right-4 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
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