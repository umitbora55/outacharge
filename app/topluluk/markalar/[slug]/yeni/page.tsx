"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../../../../components/HeaderWhite";
import {
    ArrowLeft,
    Send,
    Loader2,
    Car,
    AlertCircle,
    Lock,
    Zap,
    MessageSquare,
    AlertTriangle,
    Lightbulb,
    HelpCircle,
    Wrench,
    Star,
    Battery,
    Route,
    Settings,
    ThumbsUp,
    Check,
    Calendar,
    FileCheck,
    Upload,
    Shield
} from "lucide-react";

interface BrandCommunity {
    id: string;
    brand: string;
    slug: string;
    description: string;
    post_count: number;
}

interface UserVehicle {
    id: string;
    brand: string;
    model: string;
    year: number;
    is_current: boolean;
    is_verified: boolean;
    verification_status: string;
}

// Konu kategorileri
const topicCategories = [
    {
        id: 'deneyim',
        label: 'Deneyim',
        description: 'Genel kullanım deneyimleriniz',
        icon: Car,
        color: 'emerald',
        gradient: 'from-emerald-500 to-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        ring: 'ring-emerald-500'
    },
    {
        id: 'sarj_deneyimi',
        label: 'Şarj Deneyimi',
        description: 'Şarj istasyonları ve şarj süreçleri',
        icon: Zap,
        color: 'amber',
        gradient: 'from-amber-500 to-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        iconBg: 'bg-amber-100',
        ring: 'ring-amber-500'
    },
    {
        id: 'menzil_testi',
        label: 'Menzil Testi',
        description: 'Menzil testleri ve sonuçları',
        icon: Route,
        color: 'blue',
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        iconBg: 'bg-blue-100',
        ring: 'ring-blue-500'
    },
    {
        id: 'sorun',
        label: 'Sorun & Çözüm',
        description: 'Karşılaştığınız sorunlar ve çözümler',
        icon: Wrench,
        color: 'orange',
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        iconBg: 'bg-orange-100',
        ring: 'ring-orange-500'
    },
    {
        id: 'sikayet',
        label: 'Şikayet',
        description: 'Şikayetler ve olumsuz deneyimler',
        icon: AlertTriangle,
        color: 'red',
        gradient: 'from-red-500 to-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        iconBg: 'bg-red-100',
        ring: 'ring-red-500'
    },
    {
        id: 'ipucu',
        label: 'İpucu & Öneri',
        description: 'Faydalı ipuçları ve öneriler',
        icon: Lightbulb,
        color: 'yellow',
        gradient: 'from-yellow-500 to-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        iconBg: 'bg-yellow-100',
        ring: 'ring-yellow-500'
    },
    {
        id: 'gizli_ozellik',
        label: 'Bilinmeyen Özellikler',
        description: 'Az bilinen özellikler ve keşifler',
        icon: Star,
        color: 'purple',
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        iconBg: 'bg-purple-100',
        ring: 'ring-purple-500'
    },
    {
        id: 'soru',
        label: 'Soru',
        description: 'Diğer sahiplere sorularınız',
        icon: HelpCircle,
        color: 'cyan',
        gradient: 'from-cyan-500 to-cyan-600',
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-700',
        iconBg: 'bg-cyan-100',
        ring: 'ring-cyan-500'
    },
    {
        id: 'batarya',
        label: 'Batarya Sağlığı',
        description: 'Batarya durumu ve uzun vadeli performans',
        icon: Battery,
        color: 'green',
        gradient: 'from-green-500 to-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        iconBg: 'bg-green-100',
        ring: 'ring-green-500'
    },
    {
        id: 'yazilim',
        label: 'Yazılım Güncellemesi',
        description: 'Yazılım güncellemeleri ve değişiklikler',
        icon: Settings,
        color: 'indigo',
        gradient: 'from-indigo-500 to-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-700',
        iconBg: 'bg-indigo-100',
        ring: 'ring-indigo-500'
    },
    {
        id: 'tavsiye',
        label: 'Satın Alma Tavsiyesi',
        description: 'Alacaklara tavsiyeler',
        icon: ThumbsUp,
        color: 'pink',
        gradient: 'from-pink-500 to-pink-600',
        bg: 'bg-pink-50',
        border: 'border-pink-200',
        text: 'text-pink-700',
        iconBg: 'bg-pink-100',
        ring: 'ring-pink-500'
    }
];

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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

export default function YeniMarkaKonusuPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const slug = params.slug as string;

    const [community, setCommunity] = useState<BrandCommunity | null>(null);
    const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedVehicle, setSelectedVehicle] = useState<UserVehicle | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const [canWrite, setCanWrite] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Araç seç, 2: Kategori seç, 3: İçerik yaz

    // Topluluk ve yetki kontrolü
    const fetchData = useCallback(async () => {
        try {
            // Topluluk bilgisi
            const communityData = await supabaseFetch(`brand_communities?slug=eq.${slug}&select=*`);

            if (!communityData || communityData.length === 0) {
                router.push('/topluluk/markalar');
                return;
            }

            setCommunity(communityData[0]);
            const communityBrand = communityData[0].brand.toLowerCase().trim();

            if (user) {
                // Kullanıcının araçlarını çek
                const vehicles = await supabaseFetch(`user_vehicles?user_id=eq.${user.id}&order=is_current.desc,created_at.desc`);

                if (vehicles && vehicles.length > 0) {
                    setUserVehicles(vehicles);

                    // Bu markaya ait doğrulanmış araç var mı?
                    const verifiedVehicle = vehicles.find((v: UserVehicle) =>
                        v.brand.toLowerCase().trim() === communityBrand &&
                        v.is_verified &&
                        v.verification_status === 'approved'
                    );

                    if (verifiedVehicle) {
                        setCanWrite(true);
                        setSelectedVehicle(verifiedVehicle);
                    } else {
                        // Bu markaya ait onay bekleyen araç var mı?
                        const pendingVehicle = vehicles.find((v: UserVehicle) =>
                            v.brand.toLowerCase().trim() === communityBrand &&
                            v.verification_status === 'pending'
                        );

                        if (pendingVehicle) {
                            setNeedsVerification(true);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            router.push('/topluluk/markalar');
        } finally {
            setLoading(false);
        }
    }, [slug, user, router]);

    useEffect(() => {
        if (user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user, fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !community || !canWrite || !selectedVehicle) return;
        if (!selectedCategory || !title.trim() || !content.trim()) {
            setError("Tüm alanları doldurun.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await supabaseFetch('posts', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    title: title.trim(),
                    content: content.trim(),
                    category: selectedCategory,
                    brand_community_id: community.id,
                    operator_name: community.brand,
                    vehicle_model: selectedVehicle.model,
                    vehicle_year: selectedVehicle.year,
                    is_deleted: false,
                    upvotes: 0,
                    downvotes: 0,
                    comment_count: 0,
                    view_count: 0
                })
            });

            await supabaseFetch(`brand_communities?id=eq.${community.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ post_count: community.post_count + 1 })
            });

            router.push(`/topluluk/markalar/${slug}`);
        } catch (err: any) {
            console.error("Submit error:", err);
            setError(err.message || "Konu oluşturulurken bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedCategoryData = topicCategories.find(c => c.id === selectedCategory);
    const logoUrl = brandLogoUrls[slug] || null;

    // Bu markaya ait araçları filtrele
    const brandVehicles = userVehicles.filter(v =>
        v.brand.toLowerCase().trim() === community?.brand.toLowerCase().trim()
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <HeaderWhite />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <HeaderWhite />
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
                        <Lock className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-zinc-900 mb-2">Giriş Yapın</h2>
                        <p className="text-zinc-500 mb-6">Konu açmak için giriş yapmanız gerekiyor.</p>
                        <Link
                            href="/giris"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                        >
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Doğrulanmış aracı yok - belge yüklemesi gerekiyor
    if (!canWrite && !needsVerification) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <HeaderWhite />
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <Link
                        href={`/topluluk/markalar/${slug}`}
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {community?.brand} Topluluğu
                    </Link>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                                <FileCheck className="w-8 h-8 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-amber-900">Araç Doğrulaması Gerekli</h2>
                                <p className="text-amber-700">Bu toplulukta yorum yapabilmek için {community?.brand} aracınızı doğrulamanız gerekiyor.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 mb-6">
                            <h3 className="font-semibold text-zinc-900 mb-4">Nasıl doğrularım?</h3>
                            <ol className="space-y-3 text-sm text-zinc-600">
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                    <span>Profilinize gidin ve "Araçlarım" bölümünden {community?.brand} aracınızı ekleyin</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                    <span>Araç ruhsatınızın fotoğrafını yükleyin (kişisel bilgiler kapatılabilir)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                    <span>Doğrulama ekibimiz 24 saat içinde inceleyecek</span>
                                </li>
                            </ol>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href="/profil/araclarim"
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                            >
                                <Car className="w-5 h-5" />
                                Araç Ekle
                            </Link>
                            <Link
                                href={`/topluluk/markalar/${slug}`}
                                className="px-6 py-3 bg-white border border-amber-200 text-amber-700 font-medium rounded-xl hover:bg-amber-50 transition-colors"
                            >
                                Geri Dön
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Onay bekliyor
    if (needsVerification) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <HeaderWhite />
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <Link
                        href={`/topluluk/markalar/${slug}`}
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {community?.brand} Topluluğu
                    </Link>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-8 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold text-blue-900 mb-2">Doğrulama Bekleniyor</h2>
                        <p className="text-blue-700 mb-6">
                            {community?.brand} aracınız için doğrulama talebiniz inceleniyor.
                            Genellikle 24 saat içinde sonuçlanır.
                        </p>
                        <Link
                            href={`/topluluk/markalar/${slug}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Geri Dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <HeaderWhite />

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Back */}
                <Link
                    href={`/topluluk/markalar/${slug}`}
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {community?.brand} Topluluğu
                </Link>

                {/* Header */}
                <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-2xl p-3 flex items-center justify-center shadow-inner">
                            {logoUrl ? (
                                <img src={logoUrl} alt={community?.brand} className="w-full h-full object-contain" />
                            ) : (
                                <Car className="w-8 h-8 text-zinc-400" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900">Yeni Konu Aç</h1>
                            <p className="text-zinc-500">{community?.brand} Topluluğu</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mt-6">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > 1 ? 'bg-emerald-500 text-white' : step === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                                }`}>
                                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                            </div>
                            <span className="font-medium text-sm hidden sm:inline">Araç</span>
                        </div>
                        <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > 2 ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                                }`}>
                                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
                            </div>
                            <span className="font-medium text-sm hidden sm:inline">Kategori</span>
                        </div>
                        <div className={`flex-1 h-1 rounded ${step >= 3 ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 3 ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                                }`}>
                                3
                            </div>
                            <span className="font-medium text-sm hidden sm:inline">İçerik</span>
                        </div>
                    </div>
                </div>

                {/* Step 1: Vehicle Selection */}
                {step === 1 && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Aracınızı Seçin</h2>
                        <p className="text-zinc-500 text-sm mb-6">Hangi aracınızla ilgili paylaşım yapacaksınız?</p>

                        <div className="space-y-3">
                            {brandVehicles.filter(v => v.is_verified).map((vehicle) => (
                                <button
                                    key={vehicle.id}
                                    type="button"
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedVehicle?.id === vehicle.id
                                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                                            : 'border-zinc-200 hover:border-zinc-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedVehicle?.id === vehicle.id ? 'bg-emerald-100' : 'bg-zinc-100'
                                                }`}>
                                                <Car className={`w-6 h-6 ${selectedVehicle?.id === vehicle.id ? 'text-emerald-600' : 'text-zinc-400'
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-zinc-900">{vehicle.brand} {vehicle.model}</h3>
                                                    {vehicle.is_current && (
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                            Mevcut
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{vehicle.year} Model</span>
                                                    <Shield className="w-4 h-4 text-emerald-500 ml-2" />
                                                    <span className="text-emerald-600">Doğrulanmış</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedVehicle?.id === vehicle.id && (
                                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {brandVehicles.filter(v => v.is_verified).length === 0 && (
                            <div className="text-center py-8">
                                <Car className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                <p className="text-zinc-500">Doğrulanmış {community?.brand} aracınız bulunamadı.</p>
                            </div>
                        )}

                        {/* Next Button */}
                        <button
                            type="button"
                            onClick={() => selectedVehicle && setStep(2)}
                            disabled={!selectedVehicle}
                            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:shadow-none"
                        >
                            Devam Et
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                )}

                {/* Step 2: Category Selection */}
                {step === 2 && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        {/* Selected Vehicle */}
                        {selectedVehicle && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
                                <Car className="w-5 h-5 text-emerald-600" />
                                <span className="font-medium text-emerald-700">
                                    {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="ml-auto text-emerald-600 hover:text-emerald-700 text-sm"
                                >
                                    Değiştir
                                </button>
                            </div>
                        )}

                        <h2 className="text-lg font-bold text-zinc-900 mb-2">Konu Türünü Seçin</h2>
                        <p className="text-zinc-500 text-sm mb-6">Paylaşımınızın türünü seçerek diğer kullanıcıların kolayca bulmasını sağlayın.</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {topicCategories.map((category) => {
                                const Icon = category.icon;
                                const isSelected = selectedCategory === category.id;

                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${isSelected
                                                ? `${category.border} ${category.bg} ring-2 ${category.ring} shadow-md`
                                                : 'border-zinc-200 hover:border-zinc-300 bg-white'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className={`absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r ${category.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}

                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${isSelected ? category.iconBg : 'bg-zinc-100 group-hover:bg-zinc-200'
                                            }`}>
                                            <Icon className={`w-5 h-5 ${isSelected ? category.text : 'text-zinc-500'}`} />
                                        </div>

                                        <h3 className={`font-semibold text-sm mb-1 ${isSelected ? category.text : 'text-zinc-900'}`}>
                                            {category.label}
                                        </h3>
                                        <p className="text-xs text-zinc-500 line-clamp-2">
                                            {category.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-6 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => selectedCategory && setStep(3)}
                                disabled={!selectedCategory}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:shadow-none"
                            >
                                Devam Et
                                <ArrowLeft className="w-5 h-5 rotate-180" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Content */}
                {step === 3 && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-6">
                        {/* Selected Info */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {selectedVehicle && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-full">
                                    <Car className="w-4 h-4 text-zinc-600" />
                                    <span className="text-sm font-medium text-zinc-700">
                                        {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                                    </span>
                                    <button type="button" onClick={() => setStep(1)} className="text-zinc-400 hover:text-zinc-600">
                                        <ArrowLeft className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            {selectedCategoryData && (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${selectedCategoryData.bg} ${selectedCategoryData.border} border`}>
                                    <selectedCategoryData.icon className={`w-4 h-4 ${selectedCategoryData.text}`} />
                                    <span className={`font-medium text-sm ${selectedCategoryData.text}`}>
                                        {selectedCategoryData.label}
                                    </span>
                                    <button type="button" onClick={() => setStep(2)} className="text-zinc-400 hover:text-zinc-600">
                                        <ArrowLeft className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Title */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-zinc-700 mb-2">
                                Başlık
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Dikkat çekici bir başlık yazın..."
                                className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg"
                                maxLength={200}
                            />
                            <p className="text-xs text-zinc-400 mt-2 text-right">{title.length}/200</p>
                        </div>

                        {/* Content */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-zinc-700 mb-2">
                                İçerik
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={`${selectedVehicle?.brand} ${selectedVehicle?.model} ile ilgili ${selectedCategoryData?.label.toLowerCase()} paylaşımınızı detaylı bir şekilde yazın...`}
                                rows={10}
                                className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                                maxLength={5000}
                            />
                            <p className="text-xs text-zinc-400 mt-2 text-right">{content.length}/5000</p>
                        </div>

                        {/* Info Box */}
                        <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-800">Nerede Görünecek?</p>
                                    <p className="text-xs text-emerald-600 mt-1">
                                        Bu konu hem <strong>{community?.brand}</strong> topluluğunda hem de
                                        genel toplulukta görünecek. Araç modeliniz ve yılınız da gösterilecek.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="px-6 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !title.trim() || !content.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/30 disabled:shadow-none"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Konuyu Paylaş
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}