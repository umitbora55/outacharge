"use client";

import dynamic from 'next/dynamic';

const HaritaContent = dynamic(() => import('./HaritaContent'), {
  loading: () => (
    <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Harita yükleniyor...</div>
    </div>
  ),
  ssr: false
});

export default function HaritaPage() {
  return <HaritaContent />;
}