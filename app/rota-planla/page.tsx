"use client";

import dynamic from 'next/dynamic';

const RotaPlanlaContent = dynamic(() => import('./RotaPlanlaContent'), {
    loading: () => (
        <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
            <div className="text-zinc-900 text-xl">Rota planlayıcı yükleniyor...</div>
        </div>
    ),
    ssr: false
});

export default function RotaPlanlaPage() {
    return <RotaPlanlaContent />;
}
