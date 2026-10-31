"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
};

export function AuthParticleOrb({
  label,
  className,
  variant = "auth",
}: {
  label: string;
  className?: string;
  /** `hero` = backdrop-only (no brand monogram; page owns the name). */
  variant?: "auth" | "hero";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    const host = wrapRef.current;
    if (!el || !host) return;

    const context = el.getContext("2d");
    if (!context) return;

    const canvas = el;
    const wrap = host;
    const ctx = context;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let rotation = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetPX = 0;
    let targetPY = 0;

    function fibonacciSphere(count: number, radius: number): Particle[] {
      const pts: Particle[] = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = golden * i;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        pts.push({
          x: x * radius,
          y: y * radius,
          z: z * radius,
          ox: x * radius,
          oy: y * radius,
          oz: z * radius,
        });
      }
      return pts;
    }

    function resize() {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const radius = Math.min(width, height) * 0.38;
      const count = width < 420 ? 520 : width < 720 ? 780 : 1100;
      particles = fibonacciSphere(count, radius);
    }

    function onPointer(e: PointerEvent) {
      const rect = wrap.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetPX = nx * 0.35;
      targetPY = ny * 0.25;
    }

    function draw() {
      pointerX += (targetPX - pointerX) * 0.06;
      pointerY += (targetPY - pointerY) * 0.06;
      if (!reduceMotion) rotation += 0.0042;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const cosY = Math.cos(rotation + pointerX);
      const sinY = Math.sin(rotation + pointerX);
      const cosX = Math.cos(pointerY * 0.8);
      const sinX = Math.sin(pointerY * 0.8);

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const isHero = wrap.classList.contains("auth-orb--hero");
      const bloom = ctx.createRadialGradient(
        cx,
        cy,
        8,
        cx,
        cy,
        Math.min(width, height) * 0.48,
      );
      if (isDark) {
        bloom.addColorStop(0, "rgba(255, 118, 0, 0.22)");
        bloom.addColorStop(0.45, "rgba(255, 151, 61, 0.08)");
        bloom.addColorStop(1, "rgba(255, 118, 0, 0)");
      } else if (isHero) {
        bloom.addColorStop(0, "rgba(255, 118, 0, 0.42)");
        bloom.addColorStop(0.38, "rgba(255, 151, 61, 0.2)");
        bloom.addColorStop(0.72, "rgba(232, 105, 0, 0.08)");
        bloom.addColorStop(1, "rgba(255, 118, 0, 0)");
      } else {
        bloom.addColorStop(0, "rgba(255, 118, 0, 0.34)");
        bloom.addColorStop(0.4, "rgba(255, 151, 61, 0.16)");
        bloom.addColorStop(0.75, "rgba(232, 105, 0, 0.06)");
        bloom.addColorStop(1, "rgba(255, 118, 0, 0)");
      }
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(width, height) * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // Soft ground contact shadow (reads better on light cream)
      if (!isDark) {
        const ground = ctx.createRadialGradient(
          cx,
          height * 0.86,
          4,
          cx,
          height * 0.86,
          width * 0.38,
        );
        ground.addColorStop(0, "rgba(47, 40, 30, 0.18)");
        ground.addColorStop(0.45, "rgba(232, 105, 0, 0.1)");
        ground.addColorStop(1, "rgba(47, 40, 30, 0)");
        ctx.fillStyle = ground;
        ctx.beginPath();
        ctx.ellipse(cx, height * 0.88, width * 0.34, height * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const projected: { x: number; y: number; z: number; s: number }[] = [];
      const sizeBoost = isHero ? 1.22 : 1;
      for (const p of particles) {
        const x = p.ox * cosY - p.oz * sinY;
        let z = p.ox * sinY + p.oz * cosY;
        let y = p.oy;
        const y2 = y * cosX - z * sinX;
        z = y * sinX + z * cosX;
        y = y2;

        const depth =
          (z + Math.min(width, height) * 0.38) /
          (Math.min(width, height) * 0.76);
        const scale = 0.55 + depth * 0.9;
        projected.push({
          x: cx + x,
          y: cy + y,
          z,
          s: Math.max(0.4, 1.15 * scale * sizeBoost * (width < 420 ? 0.85 : 1)),
        });
      }

      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const t =
          (p.z + Math.min(width, height) * 0.4) /
          (Math.min(width, height) * 0.8);
        const alpha =
          (isHero ? 0.28 : 0.18) + Math.max(0, Math.min(1, t)) * (isHero ? 0.78 : 0.72);
        if (isHero && !isDark) {
          // Terracotta/cream dots read on light hero wash (pure white vanishes)
          if (t > 0.62) {
            ctx.fillStyle = `rgba(255, 236, 214, ${alpha})`;
          } else if (t > 0.35) {
            ctx.fillStyle = `rgba(255, 140, 48, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(214, 90, 0, ${alpha * 0.9})`;
          }
        } else if (t > 0.62) {
          ctx.fillStyle = `rgba(255, 253, 250, ${alpha})`;
        } else if (t > 0.35) {
          ctx.fillStyle = `rgba(255, 151, 61, ${alpha * 0.95})`;
        } else {
          ctx.fillStyle = `rgba(255, 118, 0, ${alpha * 0.75})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    wrap.addEventListener("pointermove", onPointer);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const monogram = label.trim().charAt(0).toUpperCase() || "E";

  return (
    <div
      ref={wrapRef}
      className={cn(
        "auth-orb",
        variant === "hero" && "auth-orb--hero",
        className,
      )}
      aria-hidden
    >
      <canvas ref={canvasRef} className="auth-orb__canvas" />
      {variant === "auth" ? (
        <div className="auth-orb__core">
          <span className="auth-orb__mark">{monogram}</span>
          <span className="auth-orb__name">{label}</span>
        </div>
      ) : null}
      <div className="auth-orb__shadow" />
    </div>
  );
}
