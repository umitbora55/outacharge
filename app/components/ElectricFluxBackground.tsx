"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

export default function ElectricFluxBackground() {
    const [mounted, setMounted] = useState(false);
    const { scrollY } = useScroll();

    // Parallax effects
    const y1 = useTransform(scrollY, [0, 2000], [0, -200]);
    const y2 = useTransform(scrollY, [0, 2000], [0, -400]);
    const opacity = useTransform(scrollY, [0, 500], [1, 0.4]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-black">
            {/* Primary 4K Asset with Breathing Animation */}
            <motion.div
                style={{
                    y: y1,
                    opacity,
                    backgroundImage: 'url("/images/ultra-cinematic-hero.png")',
                    filter: 'brightness(0.8) contrast(1.2) saturate(1.1)',
                }}
                animate={{
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute inset-0 w-full h-full bg-cover bg-center mix-blend-screen opacity-80"
            />

            {/* Volumetric Pulse Overlay */}
            <motion.div
                animate={{
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-teal-500/10 mix-blend-overlay"
            />

            {/* Floating Particles Starfield (Parallax Layer) */}
            <motion.div style={{ y: y2 }} className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            scale: Math.random() * 0.5 + 0.5,
                            opacity: Math.random() * 0.3 + 0.1,
                        }}
                        animate={{
                            y: [null, Math.random() * -100 + "%"],
                            opacity: [0.1, 0.4, 0.1],
                        }}
                        transition={{
                            duration: Math.random() * 20 + 20,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 10,
                        }}
                        className="absolute w-0.5 h-0.5 bg-emerald-300 rounded-full blur-[1px]"
                    />
                ))}
            </motion.div>

            {/* Vignette for Cinematic Focus */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

            {/* Grid Pattern Overlay (Very Subtle) */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
                    backgroundSize: '80px 80px'
                }}
            />
        </div>
    );
}
