"use client";

import dynamic from 'next/dynamic';

const RotaPlanlaContent = dynamic(() => import('./RotaPlanlaContent'), {
    loading: () => (
        <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
            <div className="text-white text-xl">Rota planlayıcı yükleniyor...</div>
        </div>
    ),
    ssr: false
});

export default function RotaPlanlaPage() {
    return <RotaPlanlaContent />;
}
