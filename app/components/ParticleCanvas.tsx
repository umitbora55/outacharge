"use client";
import { useEffect, useRef } from "react";

interface ParticleCanvasProps {
  titleRef?: React.RefObject<HTMLElement | null>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  isBlue: boolean;
  hue: number;
  life: number;
  maxLife: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  hue: number;
  speed: number;
}

export default function ParticleCanvas({ titleRef }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1;
    let animationId: number;
    let frameCount = 0;
    let titleRect: { x: number; y: number; w: number; h: number } | null = null;

    const hlCanvas = document.createElement("canvas");
    const hlCtx = hlCanvas.getContext("2d", { alpha: true });

    let windX = 0;
    let windTargetX = 0;

    const pts: Particle[] = [];
    const sparks: Spark[] = [];
    const N = 280;

    const noiseTable: number[] = [];
    for (let i = 0; i < 1000; i++) {
      noiseTable.push((Math.random() - 0.5) * 2);
    }
    let noiseIndex = 0;
    function noise() {
      noiseIndex = (noiseIndex + 37) % noiseTable.length;
      return noiseTable[noiseIndex];
    }

    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = canvas!.width = Math.floor(window.innerWidth * DPR);
      H = canvas!.height = Math.floor(window.innerHeight * DPR);
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      hlCanvas.width = W;
      hlCanvas.height = H;
      updateTitleRect();
    }

    function updateTitleRect() {
      const el = titleRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      titleRect = {
        x: r.left * DPR,
        y: r.top * DPR,
        w: r.width * DPR,
        h: r.height * DPR,
      };
    }

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function reset(p: Particle) {
      p.x = rand(-0.05, 1.05) * W;
      p.y = rand(-0.25, -0.02) * H;
      const fall = rand(2.2, 5.6) * DPR;
      const drift = rand(-0.35, 0.55) * DPR;
      p.vx = drift;
      p.vy = fall;
      p.size = rand(0.7, 1.35) * DPR;
      p.alpha = rand(0.05, 0.12);
      const isBlue = Math.random() < 0.72;
      p.isBlue = isBlue;
      p.hue = isBlue ? rand(198, 210) : rand(210, 220);
      p.life = rand(140, 260);
      p.maxLife = p.life;
    }

    function spawnSparks(x: number, y: number, speed: number) {
      const count = Math.min(14, Math.max(0, Math.floor(speed / 8)));
      for (let i = 0; i < count; i++) {
        const lifeVal = rand(14, 28);
        sparks.push({
          x, y,
          vx: rand(-1.4, 1.4) + (mouseRef.current.vx * 0.025),
          vy: rand(-1.4, 1.4) + (mouseRef.current.vy * 0.025),
          life: lifeVal,
          maxLife: lifeVal,
          size: rand(1.0, 1.8),
          alpha: rand(0.35, 0.8),
          hue: rand(195, 210),
          speed: Math.hypot(mouseRef.current.vx, mouseRef.current.vy) / DPR
        });
      }
      if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
    }

    function handlePointerMove(e: PointerEvent) {
      const x = e.clientX * DPR;
      const y = e.clientY * DPR;
      mouseRef.current.vx = x - mouseRef.current.x;
      mouseRef.current.vy = y - mouseRef.current.y;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;
      spawnSparks(x, y, Math.hypot(mouseRef.current.vx, mouseRef.current.vy));
      const nx = (x / W) - 0.5;
      windTargetX = nx * (0.9 * DPR);
    }

    function handlePointerLeave() {
      mouseRef.current.active = false;
    }

    for (let i = 0; i < N; i++) {
      const p = {} as Particle;
      reset(p);
      p.life = rand(30, p.life);
      pts.push(p);
    }

    function step() {
      frameCount++;
      windX += (windTargetX - windX) * 0.06;
      ctx!.clearRect(0, 0, W, H);

      hlCtx!.save();
      hlCtx!.globalCompositeOperation = "destination-out";
      hlCtx!.fillStyle = "rgba(0,0,0,0.085)";
      hlCtx!.fillRect(0, 0, W, H);
      hlCtx!.restore();

      for (const p of pts) {
        p.life -= 1;
        if (p.life <= 0 || p.y > H + 60 * DPR) {
          reset(p);
          continue;
        }
        if (frameCount % 4 === 0) p.vx += noise() * 0.012;
        p.vx += windX * 0.012;
        p.vx *= 0.995;

        if (mouseRef.current.active) {
          const mx = p.x - mouseRef.current.x;
          const my = p.y - mouseRef.current.y;
          const md = Math.hypot(mx, my) + 0.0001;
          if (md < 120 * DPR) {
            const rep = (1 - md / (120 * DPR));
            p.vx += (mx / md) * rep * 0.3;
            p.vy += (my / md) * rep * 0.15;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        const lifeFade = Math.min(1, p.life / (p.maxLife * 0.15));
        let overTextFade = 1;
        if (p.y > H * 0.12 && p.y < H * 0.55) overTextFade = 0.75;
        const finalAlpha = p.alpha * lifeFade * overTextFade;
        if (finalAlpha < 0.01) continue;

        const speed = Math.hypot(p.vx, p.vy);
        const len = Math.min(22 * DPR, 6 * DPR + speed * 3.2);
        const ang = Math.atan2(p.vy, p.vx);

        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        ctx!.beginPath();
        ctx!.moveTo(p.x - Math.cos(ang) * len * 0.5, p.y - Math.sin(ang) * len * 0.5);
        ctx!.lineTo(p.x + Math.cos(ang) * len * 0.5, p.y + Math.sin(ang) * len * 0.5);
        ctx!.strokeStyle = p.isBlue
          ? `hsla(${p.hue}, 78%, 62%, ${finalAlpha})`
          : `hsla(215, 18%, 58%, ${finalAlpha * 0.9})`;
        ctx!.lineWidth = p.size;
        ctx!.lineCap = "round";
        ctx!.stroke();
        ctx!.restore();

        if (titleRect) {
          const pad = 18 * DPR;
          const inside = p.x >= titleRect.x - pad && p.x <= titleRect.x + titleRect.w + pad &&
            p.y >= titleRect.y - pad && p.y <= titleRect.y + titleRect.h + pad;
          if (inside && (frameCount + (p.x | 0)) % 3 === 0) {
            const len2 = Math.min(26 * DPR, 10 * DPR + speed * 3.0);
            const a = Math.min(0.22, p.alpha * 2.2);
            hlCtx!.save();
            hlCtx!.globalCompositeOperation = "lighter";
            hlCtx!.lineCap = "round";
            hlCtx!.lineWidth = Math.max(1.2 * DPR, p.size * 1.55);
            hlCtx!.shadowBlur = 10 * DPR;
            hlCtx!.shadowColor = "rgba(255,255,255,0.45)";
            hlCtx!.strokeStyle = `rgba(255,255,255,${a})`;
            hlCtx!.beginPath();
            hlCtx!.moveTo(p.x - Math.cos(ang) * len2 * 0.5, p.y - Math.sin(ang) * len2 * 0.5);
            hlCtx!.lineTo(p.x + Math.cos(ang) * len2 * 0.5, p.y + Math.sin(ang) * len2 * 0.5);
            hlCtx!.stroke();
            hlCtx!.restore();
          }
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= 1;
        s.vx *= 0.91;
        s.vy *= 0.91;
        s.x += s.vx;
        s.y += s.vy;
        const lifeFade = s.life / s.maxLife;
        const alpha = Math.max(0, s.alpha * lifeFade);
        const ang = Math.atan2(s.vy, s.vx);
        const sp = Math.hypot(s.vx, s.vy);
        const L = (3 + Math.min(10, s.speed * 0.8 + sp * 2)) * DPR;
        ctx!.strokeStyle = `hsla(${s.hue}, 86%, 58%, ${alpha * 0.85})`;
        ctx!.lineWidth = Math.max(0.6 * DPR, s.size * lifeFade * 0.9);
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(s.x - Math.cos(ang) * L * 0.5, s.y - Math.sin(ang) * L * 0.5);
        ctx!.lineTo(s.x + Math.cos(ang) * L * 0.5, s.y + Math.sin(ang) * L * 0.5);
        ctx!.stroke();
        if (s.life <= 0) sparks.splice(i, 1);
      }

      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      ctx!.globalAlpha = 0.95;
      ctx!.drawImage(hlCanvas, 0, 0);
      ctx!.restore();

      animationId = requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!animationId) {
            animationId = requestAnimationFrame(step);
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerleave', handlePointerLeave);
            window.addEventListener('scroll', updateTitleRect, { passive: true });
          }
        } else {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = 0;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerleave', handlePointerLeave);
            window.removeEventListener('scroll', updateTitleRect);
          }
        }
      },
      { threshold: 0 }
    );

    observer.observe(canvas);
    resize();
    window.addEventListener('resize', resize);
    if (document?.fonts?.ready) {
      document.fonts.ready.then(updateTitleRect).catch(() => { });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', updateTitleRect);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [titleRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30, background: "transparent" }}
    />
  );
}
