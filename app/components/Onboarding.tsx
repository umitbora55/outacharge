"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const Player = dynamic(
    () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
    { ssr: false }
);
import {
    X,
    ChevronRight,
    ChevronLeft,
    Zap,
    MapPin,
    Users,
    Activity,
    CreditCard
} from "lucide-react";

interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    lottieUrl: string;
    bgGradient: string;
    icon: any;
    color: string;
}

const onboardingSteps: OnboardingStep[] = [
    {
        id: 1,
        title: "Tüm İstasyonlar",
        description: "Türkiye'nin en geniş şarj ağını keşfedin. Fiyat, hız ve doluluk bilgisini anlık görün.",
        lottieUrl: "https://assets9.lottiefiles.com/packages/lf20_svy4ivvy.json",
        bgGradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
        icon: MapPin,
        color: "emerald"
    },
    {
        id: 2,
        title: "EV Topluluğu",
        description: "Deneyimlerinizi paylaşın, diğer sürücülerle etkileşime geçin ve en iyi rotaları keşfedin.",
        lottieUrl: "/onboarding/community.json",
        bgGradient: "from-blue-500/20 via-blue-500/5 to-transparent",
        icon: Users,
        color: "blue"
    },
    {
        id: 3,
        title: "Marka Hubları",
        description: "Aracınıza özel topluluklara katılın. Sadece sizin modeliniz için ipuçları ve çözümler.",
        lottieUrl: "/onboarding/brands.json",
        bgGradient: "from-purple-500/20 via-purple-500/5 to-transparent",
        icon: Zap,
        color: "purple"
    },
    {
        id: 4,
        title: "Maliyet Analizi",
        description: "Yolculuk maliyetinizi önceden görün. Sürprizlerle karşılaşmadan rotanızı çizin.",
        lottieUrl: "https://assets1.lottiefiles.com/packages/lf20_yzoqyyqf.json",
        bgGradient: "from-amber-500/20 via-amber-500/5 to-transparent",
        icon: CreditCard,
        color: "amber"
    }
];

export default function Onboarding() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem("outacharge_onboarding_seen");
        if (!hasSeenOnboarding) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem("outacharge_onboarding_seen", "true");
        }, 500);
    };

    const handleNext = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isVisible) return null;

    const step = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;

    return (
        <AnimatePresence>
            {!isExiting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Dark Cinematic Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md dark:backdrop-blur-xl"
                        onClick={handleClose}
                    />

                    {/* Premium Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-xl bg-white/90 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-3xl transition-colors duration-500"
                    >
                        {/* Progress Indicators - Top Focal Point */}
                        <div className="absolute top-8 left-0 right-0 z-20 flex justify-center gap-1.5">
                            {onboardingSteps.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-1 rounded-full transition-all duration-500 ${index === currentStep
                                            ? "w-8 bg-emerald-500"
                                            : index < currentStep ? "w-4 bg-emerald-500/40" : "w-4 bg-zinc-200 dark:bg-white/10"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-8 z-30 p-2 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col">
                            {/* Visual Content Block */}
                            <div className={`relative h-[22rem] bg-gradient-to-b ${step.bgGradient} flex items-center justify-center pt-8 overflow-hidden`}>
                                {/* Abstract Background Grid */}
                                <div className="absolute inset-0 opacity-[0.05] dark:opacity-10 [mask-image:radial-gradient(circle_at_center,white,transparent)]">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                                        backgroundSize: "32px 32px"
                                    }} />
                                </div>

                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    className="relative z-10 w-full max-w-[280px]"
                                >
                                    <Player
                                        autoplay
                                        loop
                                        src={step.lottieUrl}
                                        style={{ width: "100%", height: "100%", filter: "brightness(1.1)" }}
                                    />
                                </motion.div>
                            </div>

                            {/* Text Content Block */}
                            <div className="p-8 md:p-12 pt-4 text-center">
                                <motion.div
                                    key={`text-${currentStep}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <step.icon className={`w-5 h-5 text-${step.color}-600 dark:text-${step.color}-400`} />
                                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                                            Özellik {currentStep + 1} / {onboardingSteps.length}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-extralight tracking-tight text-black dark:text-white leading-tight">
                                        {step.title}
                                    </h2>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base font-light max-w-sm mx-auto leading-relaxed">
                                        {step.description}
                                    </p>
                                </motion.div>

                                {/* Bottom Controls */}
                                <div className="mt-12 flex items-center justify-center gap-4">
                                    {currentStep > 0 && (
                                        <button
                                            onClick={handlePrev}
                                            className="px-6 py-3 text-zinc-500 dark:text-zinc-500 hover:text-black dark:hover:text-white font-medium transition-colors"
                                        >
                                            Geri
                                        </button>
                                    )}

                                    <button
                                        onClick={handleNext}
                                        className={`group relative flex items-center gap-2 px-10 py-4 rounded-2xl font-semibold transition-all active:scale-95 ${isLastStep
                                                ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                                : "bg-black dark:bg-white text-white dark:text-black shadow-lg dark:shadow-none"
                                            }`}
                                    >
                                        <span>{isLastStep ? "Keşfetmeye Başla" : "Devam Et"}</span>
                                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}