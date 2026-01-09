"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Player = dynamic(
    () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
    { ssr: false }
);
import {
    X,
    ChevronRight,
    ChevronLeft,
    Zap
} from "lucide-react";

interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    lottieUrl: string;
    bgGradient: string;
    iconColor: string;
}

const onboardingSteps: OnboardingStep[] = [
    {
        id: 1,
        title: "Türkiye'nin Tüm Şarj İstasyonları",
        description: "Harita üzerinde tüm elektrikli araç şarj istasyonlarını görün. Fiyatları karşılaştırın, en uygununu seçin.",
        lottieUrl: "https://assets9.lottiefiles.com/packages/lf20_svy4ivvy.json", // Map pin location
        bgGradient: "from-emerald-500/10 via-emerald-500/5 to-cyan-500/10",
        iconColor: "emerald"
    },
    {
        id: 2,
        title: "EV Topluluğuna Katılın",
        description: "Diğer elektrikli araç sahipleriyle deneyimlerinizi paylaşın. Sorular sorun, cevaplar alın.",
        lottieUrl: "/onboarding/community.json",
        bgGradient: "from-blue-500/10 via-blue-500/5 to-indigo-500/10",
        iconColor: "blue"
    },
    {
        id: 3,
        title: "Marka Toplulukları",
        description: "Tesla, TOGG, BMW ve daha fazlası. Kendi aracınızın topluluğuna katılın, model bazlı deneyimleri keşfedin.",
        lottieUrl: "/onboarding/brands.json",
        bgGradient: "from-purple-500/10 via-purple-500/5 to-pink-500/10",
        iconColor: "purple"
    },
    {
        id: 4,
        title: "Şarj Maliyeti Hesaplayın",
        description: "Yolculuğunuzun şarj maliyetini önceden hesaplayın. En uygun rotayı ve istasyonları bulun.",
        lottieUrl: "https://assets1.lottiefiles.com/packages/lf20_yzoqyyqf.json", // Calculator
        bgGradient: "from-amber-500/10 via-amber-500/5 to-orange-500/10",
        iconColor: "amber"
    },
    {
        id: 5,
        title: "Hemen Başlayın!",
        description: "Ücretsiz hesap oluşturun ve Türkiye'nin en kapsamlı EV platformunun keyfini çıkarın.",
        lottieUrl: "/onboarding/start.json",
        bgGradient: "from-emerald-500/10 via-emerald-500/5 to-emerald-600/10",
        iconColor: "emerald"
    }
];

export default function Onboarding() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem("outacharge_onboarding_seen");
        if (!hasSeenOnboarding) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem("outacharge_onboarding_seen", "true");
        }, 300);
    };

    const handleNext = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setDirection('next');
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setDirection('prev');
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        handleClose();
    };

    const handleDotClick = (index: number) => {
        setDirection(index > currentStep ? 'next' : 'prev');
        setCurrentStep(index);
    };

    if (!isVisible) return null;

    const step = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={handleSkip}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300">
                {/* Close Button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 z-10 p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Skip Button */}
                {!isLastStep && (
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 left-4 z-10 px-4 py-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 font-medium transition-colors"
                    >
                        Geç
                    </button>
                )}

                {/* Content */}
                <div className="flex flex-col">
                    {/* Lottie Animation Area */}
                    <div className={`relative h-80 sm:h-96 bg-gradient-to-br ${step.bgGradient} flex items-center justify-center overflow-hidden pt-8`}>
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-30">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                                backgroundSize: '24px 24px',
                                color: step.iconColor === 'emerald' ? '#10b981' :
                                    step.iconColor === 'blue' ? '#3b82f6' :
                                        step.iconColor === 'purple' ? '#8b5cf6' :
                                            step.iconColor === 'amber' ? '#f59e0b' : '#10b981'
                            }} />
                        </div>

                        {/* Lottie Player */}
                        <div
                            key={currentStep}
                            className={`relative z-10 w-72 h-72 sm:w-96 sm:h-96 mt-4 transition-all duration-500 ${direction === 'next' ? 'animate-in slide-in-from-right-8' : 'animate-in slide-in-from-left-8'
                                }`}
                        >
                            <Player
                                autoplay
                                loop
                                src={step.lottieUrl}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>

                        {/* Decorative circles */}
                        <div className={`absolute -bottom-20 -left-20 w-40 h-40 bg-${step.iconColor}-500/10 rounded-full blur-3xl`} />
                        <div className={`absolute -top-20 -right-20 w-40 h-40 bg-${step.iconColor}-500/10 rounded-full blur-3xl`} />
                    </div>

                    {/* Dots Navigation */}
                    <div className="flex items-center justify-center gap-2 pt-6">
                        {onboardingSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handleDotClick(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                                    ? `w-8 bg-${step.iconColor}-500`
                                    : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                                    }`}
                                style={{
                                    backgroundColor: index === currentStep
                                        ? step.iconColor === 'emerald' ? '#10b981' :
                                            step.iconColor === 'blue' ? '#3b82f6' :
                                                step.iconColor === 'purple' ? '#8b5cf6' :
                                                    step.iconColor === 'amber' ? '#f59e0b' : '#10b981'
                                        : undefined
                                }}
                            />
                        ))}
                    </div>

                    {/* Text Content */}
                    <div className="p-6 sm:p-8 text-center">
                        <h2
                            key={`title-${currentStep}`}
                            className={`text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 transition-all duration-500 ${direction === 'next' ? 'animate-in slide-in-from-right-4' : 'animate-in slide-in-from-left-4'
                                }`}
                        >
                            {step.title}
                        </h2>
                        <p
                            key={`desc-${currentStep}`}
                            className={`text-zinc-500 dark:text-zinc-400 text-sm sm:text-base mb-8 max-w-sm mx-auto transition-all duration-500 delay-75 ${direction === 'next' ? 'animate-in slide-in-from-right-4' : 'animate-in slide-in-from-left-4'
                                }`}
                        >
                            {step.description}
                        </p>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-center gap-3">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="flex items-center gap-1 px-5 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Geri
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${isLastStep
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25'
                                    : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-black shadow-zinc-900/25 dark:shadow-white/10'
                                    }`}
                            >
                                {isLastStep ? (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Keşfet
                                    </>
                                ) : (
                                    <>
                                        Devam
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800 transition-colors">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}