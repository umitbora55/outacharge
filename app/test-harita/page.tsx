"use client";
import dynamic from 'next/dynamic';

const TestMap = dynamic(() => import('../harita/test'), { ssr: false });

export default function Page() {
  return <TestMap />;
}
