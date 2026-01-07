"use client";

import dynamic from 'next/dynamic';
import HeaderWhite from '../components/HeaderWhite';

const TestMap = dynamic(() => import('./test'), { ssr: false });

export default function HaritaPage() {
    return (
        <>
            <HeaderWhite />
            <div className="h-[calc(100vh-80px)]">
                <TestMap />
            </div>
        </>
    );
}
