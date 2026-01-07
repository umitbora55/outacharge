"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../../components/HeaderWhite";
import {
    ArrowLeft,
    Car,
    Plus,
    Loader2,
    Shield,
    Clock,
    XCircle,
    Upload,
    Calendar,
    CheckCircle,
    AlertCircle,
    Trash2,
    Star,
    FileText,
    Camera
} from "lucide-react";

interface UserVehicle {
    id: string;
    user_id: string;
    brand: string;
    model: string;
    year: number;
    is_current: boolean;
    is_verified: boolean;
    verification_document_url: string | null;
    verification_status: string;
    verification_note: string | null;
    created_at: string;
}

// Marka listesi
const brandList = [
    'Tesla', 'TOGG', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Volvo',
    'Hyundai', 'Kia', 'Volkswagen', 'Ford', 'Renault', 'Peugeot', 'Fiat',
    'MG', 'BYD', 'NIO', 'Cupra', 'MINI', 'Lexus', 'Diğer'
];

// Yıl listesi
const currentYear = new Date().getFullYear();
const yearList = Array.from({ length: 15 }, (_, i) => currentYear - i);

// Marka logo URL'leri
const brandLogoUrls: { [key: string]: string } = {
    'tesla': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png',
    'togg': 'https://raw.githubusercontent.com/nicholasadamou/car-logos/refs/heads/master/logos/togg/togg.png',
    'bmw': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png',
    'mercedes-benz': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png',
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

// Supabase Storage upload helper
async function uploadToStorage(file: File, path: string): Promise<string> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${supabaseUrl}/storage/v1/object/vehicle-documents/${path}`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Dosya yüklenemedi');
    }

    return `${supabaseUrl}/storage/v1/object/public/vehicle-documents/${path}`;
}

export default function AraclarimPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState<string | null>(null);

    // Add form state
    const [newBrand, setNewBrand] = useState("");
    const [newModel, setNewModel] = useState("");
    const [newYear, setNewYear] = useState(currentYear);
    const [isCurrent, setIsCurrent] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchVehicles = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const data = await supabaseFetch(`user_vehicles?user_id=eq.${user.id}&order=is_current.desc,created_at.desc`);
            setVehicles(data || []);
        } catch (err) {
            console.error("Vehicles fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchVehicles();
        } else {
            setLoading(false);
        }
    }, [user, fetchVehicles]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newBrand || !newModel) return;

        setSubmitting(true);
        setError("");

        try {
            // Eğer bu araç "mevcut" olarak işaretlendiyse, diğerlerini güncelle
            if (isCurrent) {
                await supabaseFetch(`user_vehicles?user_id=eq.${user.id}&is_current=eq.true`, {
                    method: 'PATCH',
                    body: JSON.stringify({ is_current: false })
                });
            }

            await supabaseFetch('user_vehicles', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    brand: newBrand,
                    model: newModel,
                    year: newYear,
                    is_current: isCurrent,
                    is_verified: false,
                    verification_status: 'pending'
                })
            });

            // Reset form
            setNewBrand("");
            setNewModel("");
            setNewYear(currentYear);
            setIsCurrent(true);
            setShowAddModal(false);
            fetchVehicles();
        } catch (err: any) {
            setError(err.message || "Araç eklenirken bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadDocument = async (vehicleId: string) => {
        if (!selectedFile || !user) return;

        setUploading(true);
        try {
            const fileName = `${user.id}/${vehicleId}/${Date.now()}_${selectedFile.name}`;
            const url = await uploadToStorage(selectedFile, fileName);

            await supabaseFetch(`user_vehicles?id=eq.${vehicleId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    verification_document_url: url,
                    verification_status: 'pending'
                })
            });

            setSelectedFile(null);
            setShowUploadModal(null);
            fetchVehicles();
        } catch (err: any) {
            setError(err.message || "Belge yüklenirken bir hata oluştu.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteVehicle = async (vehicleId: string) => {
        if (!confirm("Bu aracı silmek istediğinize emin misiniz?")) return;

        try {
            await supabaseFetch(`user_vehicles?id=eq.${vehicleId}`, {
                method: 'DELETE'
            });
            fetchVehicles();
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const handleSetCurrent = async (vehicleId: string) => {
        if (!user) return;

        try {
            // Önce tümünü false yap
            await supabaseFetch(`user_vehicles?user_id=eq.${user.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_current: false })
            });

            // Seçileni true yap
            await supabaseFetch(`user_vehicles?id=eq.${vehicleId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_current: true })
            });

            fetchVehicles();
        } catch (err) {
            console.error("Set current error:", err);
        }
    };

    const getBrandLogo = (brand: string) => {
        const key = brand.toLowerCase().replace(/\s+/g, '-');
        return brandLogoUrls[key] || null;
    };

    const getStatusBadge = (status: string, isVerified: boolean) => {
        if (isVerified) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Doğrulanmış
                </span>
            );
        }

        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Onay Bekliyor
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        Reddedildi
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-full">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Belge Gerekli
                    </span>
                );
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <HeaderWhite />
                <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                    <Car className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">Giriş Yapın</h2>
                    <p className="text-zinc-500 mb-6">Araçlarınızı görmek için giriş yapmanız gerekiyor.</p>
                    <Link href="/giris" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl">
                        Giriş Yap
                    </Link>
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
                    href="/profil"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Profil
                </Link>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Araçlarım</h1>
                        <p className="text-zinc-500">Elektrikli araçlarınızı yönetin</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        Araç Ekle
                    </button>
                </div>



                {/* Vehicles List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                ) : vehicles.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <Car className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 mb-2">Henüz araç eklemediniz</h3>
                        <p className="text-zinc-500 mb-6">Elektrikli aracınızı ekleyerek marka topluluklarına katılın.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            İlk Aracı Ekle
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {vehicles.map((vehicle) => {
                            const logoUrl = getBrandLogo(vehicle.brand);

                            return (
                                <div
                                    key={vehicle.id}
                                    className={`bg-white rounded-2xl shadow-sm p-5 border-2 transition-all ${vehicle.is_current ? 'border-emerald-500' : 'border-transparent'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Logo */}
                                        <div className="w-16 h-16 bg-zinc-100 rounded-xl p-3 flex items-center justify-center flex-shrink-0">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt={vehicle.brand} className="w-full h-full object-contain" />
                                            ) : (
                                                <Car className="w-8 h-8 text-zinc-400" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-zinc-900 text-lg">
                                                    {vehicle.brand} {vehicle.model}
                                                </h3>
                                                {vehicle.is_current && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        Mevcut
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-zinc-500 mb-3">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    {vehicle.year} Model
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(vehicle.verification_status, vehicle.is_verified)}

                                                {vehicle.verification_status === 'rejected' && vehicle.verification_note && (
                                                    <span className="text-xs text-red-600">
                                                        {vehicle.verification_note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">


                                            {!vehicle.is_current && (
                                                <button
                                                    onClick={() => handleSetCurrent(vehicle.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    <Star className="w-4 h-4" />
                                                    Mevcut Yap
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Sil
                                            </button>
                                        </div>
                                    </div>

                                    {/* Document Preview */}
                                    {vehicle.verification_document_url && (
                                        <div className="mt-4 pt-4 border-t border-zinc-100">
                                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                <FileText className="w-4 h-4" />
                                                <span>Belge yüklendi</span>

                                                <a
                                                    href={vehicle.verification_document_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Görüntüle
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Vehicle Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                        <div className="bg-white rounded-3xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-zinc-900 mb-6">Yeni Araç Ekle</h2>

                            <form onSubmit={handleAddVehicle}>
                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                {/* Brand */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Marka</label>
                                    <select
                                        value={newBrand}
                                        onChange={(e) => setNewBrand(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        required
                                    >
                                        <option value="">Marka seçin</option>
                                        {brandList.map((brand) => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Model */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Model</label>
                                    <input
                                        type="text"
                                        value={newModel}
                                        onChange={(e) => setNewModel(e.target.value)}
                                        placeholder="Örn: Model 3, ZS EV, iX3..."
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        required
                                    />
                                </div>

                                {/* Year */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Model Yılı</label>
                                    <select
                                        value={newYear}
                                        onChange={(e) => setNewYear(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    >
                                        {yearList.map((year) => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Is Current */}
                                <div className="mb-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isCurrent}
                                            onChange={(e) => setIsCurrent(e.target.checked)}
                                            className="w-5 h-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm text-zinc-700">Bu benim mevcut aracım</span>
                                    </label>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !newBrand || !newModel}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 text-white font-medium rounded-xl transition-colors"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5" />
                                                Ekle
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

        </div>
    );
}