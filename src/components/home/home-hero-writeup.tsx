"use client";

import { useEffect, useRef } from "react";

type HomeHeroWriteupProps = {
  lede: string;
};

/** Concrete product lines — no slogan carousel. */
const BOARD = [
  "Live stock from active shops",
  "Bank transfer at checkout",
  "Delivery tracking after approval",
  "Monthly rental for sellers",
  "Private vendor desk for each store",
];

export function HomeHeroWriteup({ lede }: HomeHeroWriteupProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      root.style.setProperty("--hero-scroll", "0");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = root.closest(".home-hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(rect.height * 0.5, 140);
      const progress = Math.min(Math.max(-rect.top, 0), travel) / travel;
      root.style.setProperty("--hero-scroll", progress.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Duplicate once for a seamless vertical loop.
  const rows = [...BOARD, ...BOARD];

  return (
    <div ref={rootRef} className="home-hero-writeup">
      <h1 className="home-hero-writeup__headline">
        <span className="home-hero-writeup__rise">Independent shops.</span>
        <span className="home-hero-writeup__rise home-hero-writeup__rise--delay">
          One checkout.
        </span>
      </h1>

      <div className="home-hero-writeup__board" aria-label="Marketplace highlights">
        <div className="home-hero-writeup__board-track">
          {rows.map((line, i) => (
            <p key={`${line}-${i}`} className="home-hero-writeup__board-line">
              {line}
            </p>
          ))}
        </div>
      </div>

      <p className="home-hero-writeup__lede home-hero-writeup__rise home-hero-writeup__rise--late">
        {lede}
      </p>
    </div>
  );
}
