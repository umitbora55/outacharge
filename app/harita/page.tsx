"use client";

import dynamic from 'next/dynamic';
import HeaderWhite from '../components/HeaderWhite';

const TestMap = dynamic(() => import('./test'), { ssr: false });

export default function HaritaPage() {
    return (
        <main className="fixed inset-0 pt-0">
            <div className="absolute top-0 left-0 right-0 z-50">
                <HeaderWhite />
            </div>
            <div className="w-full h-full">
                <TestMap />
            </div>
        </main>
    );
}
