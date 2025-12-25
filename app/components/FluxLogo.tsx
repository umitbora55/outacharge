"use client";

import { useEffect, useState } from "react";

interface FluxLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export default function FluxLogo({ size = 60, animated = true, className = "" }: FluxLogoProps) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!animated) return;
    
    const interval = setInterval(() => {
      setPulse((prev) => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [animated]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow effect behind */}
      {animated && (
        <div 
          className="absolute inset-0 blur-xl opacity-60 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, rgba(52, 211, 153, ${0.3 + pulse * 0.15}) 0%, transparent 70%)`,
          }}
        />
      )}
      
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
        style={{ width: size, height: size }}
      >
        {/* Definitions for gradients and filters */}
        <defs>
          {/* Main gradient for the Y shape */}
          <linearGradient id="fluxGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Electric glow gradient */}
          <linearGradient id="electricGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong glow for electric effect */}
          <filter id="electricGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Y Shape - Three arms meeting at center */}
        <g filter="url(#glow)">
          {/* Left arm */}
          <path
            d="M 20 15 Q 35 35 50 55"
            stroke="url(#fluxGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Right arm */}
          <path
            d="M 80 15 Q 65 35 50 55"
            stroke="url(#fluxGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Bottom arm */}
          <path
            d="M 50 55 L 50 90"
            stroke="url(#fluxGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Center junction circle */}
        <circle
          cx="50"
          cy="55"
          r="6"
          fill="#1e3a5f"
          stroke="url(#fluxGradient)"
          strokeWidth="2"
        />

        {/* Electric flow particles - Left arm */}
        {animated && (
          <>
            <circle
              cx="0"
              cy="0"
              r="3"
              fill="#34d399"
              filter="url(#electricGlowFilter)"
              opacity={pulse === 0 ? 1 : 0.3}
            >
              <animateMotion
                dur="0.8s"
                repeatCount="indefinite"
                path="M 20 15 Q 35 35 50 55"
              />
            </circle>

            {/* Electric flow particles - Right arm */}
            <circle
              cx="0"
              cy="0"
              r="3"
              fill="#34d399"
              filter="url(#electricGlowFilter)"
              opacity={pulse === 1 ? 1 : 0.3}
            >
              <animateMotion
                dur="0.8s"
                repeatCount="indefinite"
                path="M 80 15 Q 65 35 50 55"
              />
            </circle>

            {/* Electric flow particles - Bottom arm */}
            <circle
              cx="0"
              cy="0"
              r="3"
              fill="#34d399"
              filter="url(#electricGlowFilter)"
              opacity={pulse === 2 ? 1 : 0.3}
            >
              <animateMotion
                dur="0.6s"
                repeatCount="indefinite"
                path="M 50 55 L 50 90"
              />
            </circle>

            {/* Center pulse effect */}
            <circle
              cx="50"
              cy="55"
              r="8"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                values="6;12;6"
                dur="1.2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.8;0.2;0.8"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Electric sparks at junction */}
            <g>
              <circle cx="50" cy="55" r="2" fill="#10b981">
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="0.3s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </>
        )}

        {/* Small energy dots on arms */}
        {animated && (
          <>
            <circle cx="28" cy="22" r="1.5" fill="#60a5fa" opacity="0.6">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="72" cy="22" r="1.5" fill="#60a5fa" opacity="0.6">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" begin="0.2s" />
            </circle>
            <circle cx="50" cy="75" r="1.5" fill="#60a5fa" opacity="0.6">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" begin="0.4s" />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}