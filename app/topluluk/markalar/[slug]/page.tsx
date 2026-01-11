"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../../../components/HeaderWhite";
import {
    ArrowLeft,
    Users,
    MessageSquare,
    PenLine,
    Loader2,
    Star,
    Shield,
    Clock,
    TrendingUp,
    Eye,
    MessageCircle,
    Lock,
    AlertCircle,
    CheckCircle,
    Car,
    X
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
}

interface Post {
    id: string;
    user_id: string;
    title: string;
    content: string;
    category: string;
    comment_count: number;
    view_count: number;
    upvotes: number;
    downvotes: number;
    created_at: string;
    vehicle_model: string | null;
    vehicle_year: number | null;
    user: {
        id: string;
        full_name: string;
    };
}

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
async function supabaseFetch(endpoint: string, options?: RequestInit) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': options?.method === 'POST' ? 'return=representation' : 'return=minimal',
            ...options?.headers,
        }
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

export default function MarkaDetayPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const slug = params.slug as string;

    const [community, setCommunity] = useState<BrandCommunity | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'new' | 'popular'>('new');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    // Sabit yıl listesi
    const yearList = [2025, 2024, 2023, 2022, 2021, 2020];

    // Üyelik durumları
    const [isMember, setIsMember] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isUserBrand, setIsUserBrand] = useState(false);

    // Kullanıcının bu markanın sahibi olup olmadığını kontrol et
    const checkUserBrand = useCallback((communityBrand: string) => {
        if (!user?.vehicleBrand) return false;
        const userBrand = user.vehicleBrand.toLowerCase().trim();
        const brand = communityBrand.toLowerCase().trim();
        return userBrand.includes(brand) || brand.includes(userBrand) || userBrand === brand;
    }, [user]);

    // Topluluk bilgisini çek
    const fetchCommunity = useCallback(async () => {
        try {
            const data = await supabaseFetch(`brand_communities?slug=eq.${slug}&select=*`);

            if (!data || data.length === 0) {
                router.push('/topluluk/markalar');
                return;
            }

            setCommunity(data[0]);

            // Kullanıcının markası mı kontrol et
            const userOwns = checkUserBrand(data[0].brand);
            setIsUserBrand(userOwns);

            // Üyelik kontrolü
            if (user) {
                try {
                    const membership = await supabaseFetch(`brand_community_members?community_id=eq.${data[0].id}&user_id=eq.${user.id}&select=id,is_verified`);
                    if (membership && membership.length > 0) {
                        setIsMember(true);
                        setIsVerified(membership[0].is_verified);
                    }
                } catch (e) {
                    console.log("Membership check failed");
                }

                // Eğer kullanıcı bu markanın sahibiyse ve henüz üye değilse, otomatik üye yap
                if (userOwns && !isMember) {
                    try {
                        await supabaseFetch('brand_community_members', {
                            method: 'POST',
                            body: JSON.stringify({
                                community_id: data[0].id,
                                user_id: user.id,
                                is_verified: true,
                                role: 'member'
                            })
                        });
                        setIsMember(true);
                        setIsVerified(true);

                        // Member count güncelle
                        await supabaseFetch(`brand_communities?id=eq.${data[0].id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ member_count: data[0].member_count + 1 })
                        });
                        setCommunity({ ...data[0], member_count: data[0].member_count + 1 });
                    } catch (e) {
                        console.log("Auto join failed - maybe already member");
                    }
                }
            }
        } catch (err) {
            console.error("Community fetch error:", err);
            router.push('/topluluk/markalar');
        } finally {
            setLoading(false);
        }
    }, [slug, user, router, checkUserBrand, isMember]);

    // Postları çek
    const fetchPosts = useCallback(async () => {
        if (!community) return;

        setPostsLoading(true);
        try {
            let query = `posts?brand_community_id=eq.${community.id}&is_deleted=eq.false`;

            if (selectedYear) {
                query += `&vehicle_year=eq.${selectedYear}`;
            }

            const orderBy = sortBy === 'popular' ? 'comment_count.desc' : 'created_at.desc';
            query += `&order=${orderBy}&limit=50`;

            const data = await supabaseFetch(query);

            if (data && data.length > 0) {
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

                const postsWithUsers = data.map((post: any) => ({
                    ...post,
                    user: usersMap.get(post.user_id) || { id: post.user_id, full_name: 'Anonim' }
                }));

                setPosts(postsWithUsers);


            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error("Posts fetch error:", err);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, [community, sortBy, selectedYear]);

    useEffect(() => {
        fetchCommunity();
    }, [fetchCommunity]);

    useEffect(() => {
        if (community) {
            fetchPosts();
        }
    }, [community, fetchPosts]);

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

    const logoUrl = brandLogoUrls[slug] || null;

    // Yazma izni: Sadece doğrulanmış marka sahipleri
    const canWrite = isUserBrand && isMember && isVerified;

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-transparent">
                <HeaderWhite />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (!community) return null;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-transparent">
            <HeaderWhite />

            {/* Hero */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Back */}
                    <Link
                        href="/topluluk/markalar"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Tüm Markalar
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* Logo */}
                        <div className="relative">
                            <div className="w-28 h-28 bg-white rounded-3xl p-5 shadow-2xl">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={community.brand} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-100 rounded-xl flex items-center justify-center">
                                        <Car className="w-10 h-10 text-zinc-400" />
                                    </div>
                                )}
                            </div>
                            {/* Glow */}
                            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl -z-10" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{community.brand}</h1>

                                {isUserBrand && isVerified && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Doğrulanmış Sahip
                                    </span>
                                )}

                                {isUserBrand && !isVerified && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                                        <Clock className="w-3.5 h-3.5" />
                                        Onay Bekliyor
                                    </span>
                                )}

                                {!isUserBrand && isMember && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-600 text-white text-xs font-bold rounded-full">
                                        <Eye className="w-3.5 h-3.5" />
                                        Sadece Okuma
                                    </span>
                                )}
                            </div>

                            <p className="text-zinc-400 mb-4">{community.description}</p>

                            {/* Stats */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-zinc-500" />
                                    <span className="font-semibold">{community.member_count}</span>
                                    <span className="text-zinc-500 text-sm">üye</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-zinc-500" />
                                    <span className="font-semibold">{community.post_count}</span>
                                    <span className="text-zinc-500 text-sm">konu</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {canWrite && (
                                <Link
                                    href={`/topluluk/markalar/${slug}/yeni`}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30"
                                >
                                    <PenLine className="w-5 h-5" />
                                    Konu Aç
                                </Link>
                            )}

                            {!user && (
                                <Link
                                    href="/giris"
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors"
                                >
                                    Giriş Yap
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Info Banner */}
            {user && !isUserBrand && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Lock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-amber-900">Sadece Okuma Modu</h4>
                                <p className="text-sm text-amber-700">
                                    Bu toplulukta yorum yapmak için {community.brand} sahibi olmanız gerekiyor.
                                    Tüm konuları okuyabilirsiniz.
                                </p>
                            </div>
                            {user.vehicleBrand && (
                                <Link
                                    href={`/topluluk/markalar/${user.vehicleBrand.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
                                >
                                    Kendi Topluluğun →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Filters & Sort Bar */}
                <div className="flex items-center justify-between mb-6 gap-4">
                    <h2 className="text-lg font-bold text-zinc-900">Konular</h2>

                    <div className="flex items-center gap-3">
                        {/* Year Filter */}
                        <select
                            value={selectedYear || ''}
                            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
                        >
                            <option value="">Tüm Yıllar</option>
                            {yearList.map((year) => (
                                <option key={year} value={year}>{year} Model</option>
                            ))}
                        </select>

                        {/* Sort Buttons */}
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-zinc-200">
                            <button
                                onClick={() => setSortBy('new')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'new'
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-500 hover:text-zinc-700'
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Yeni
                            </button>
                            <button
                                onClick={() => setSortBy('popular')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'popular'
                                    ? 'bg-zinc-900 text-white'
                                    : 'text-zinc-500 hover:text-zinc-700'
                                    }`}
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Popüler
                            </button>
                        </div>
                    </div>
                </div>

                {/* Posts */}
                {postsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 mb-2">Henüz konu yok</h3>
                        <p className="text-zinc-500 mb-6">Bu toplulukta henüz konu açılmamış.</p>

                        {canWrite ? (
                            <Link
                                href={`/topluluk/markalar/${slug}/yeni`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                            >
                                <PenLine className="w-5 h-5" />
                                İlk Konuyu Aç
                            </Link>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-500 font-medium rounded-xl">
                                <Lock className="w-5 h-5" />
                                Sadece {community.brand} sahipleri konu açabilir
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-zinc-100">
                        {posts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/topluluk/${post.id}`}
                                className="block p-5 hover:bg-zinc-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                            >
                                <div className="flex gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-zinc-900 mb-1 line-clamp-2 hover:text-emerald-600 transition-colors">
                                            {post.title}
                                        </h3>
                                        {/* Vehicle Info */}
                                        {(post.vehicle_model || post.vehicle_year) && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                                                    <Car className="w-3 h-3" />
                                                    {post.vehicle_model}{post.vehicle_model && post.vehicle_year && ' • '}{post.vehicle_year}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                            <span className="font-medium text-zinc-700">{post.user.full_name}</span>
                                            <span>•</span>
                                            <span>{formatDate(post.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comment_count || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            {post.view_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}