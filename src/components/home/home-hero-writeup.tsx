"use client";

import { useEffect, useRef, useState } from "react";

type HomeHeroWriteupProps = {
  lede: string;
};

const ROTATING = [
  "makers who ship.",
  "operators at scale.",
  "shops that clear.",
  "vendors who grow.",
];

export function HomeHeroWriteup({ lede }: HomeHeroWriteupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % ROTATING.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduceMotion) {
      root?.style.setProperty("--hero-scroll", "0");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = root.closest(".home-hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(rect.height * 0.55, 160);
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      const progress = scrolled / travel;
      // Soft cubic ease — premium, not linear slap.
      const eased = 1 - Math.pow(1 - progress, 2.4);
      root.style.setProperty("--hero-scroll", eased.toFixed(4));
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
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="home-hero-writeup" data-ready="1">
      <p className="home-hero-writeup__eyebrow home-reveal home-reveal--2">
        Marketplace infrastructure
      </p>

      <h1 className="home-hero-writeup__headline">
        <span className="home-hero-writeup__mask home-reveal home-reveal--2">
          <span className="home-hero-writeup__line">Multi-vendor commerce,</span>
        </span>
        <span className="home-hero-writeup__mask home-reveal home-reveal--3">
          <span className="home-hero-writeup__line home-hero-writeup__line--row">
            <span className="home-hero-writeup__static">engineered for</span>
            <span className="home-hero-writeup__reel" aria-live="polite">
              {ROTATING.map((phrase, i) => (
                <span
                  key={phrase}
                  className="home-hero-writeup__reel-item"
                  data-active={i === index ? "1" : "0"}
                  aria-hidden={i === index ? undefined : true}
                >
                  {phrase}
                </span>
              ))}
            </span>
          </span>
        </span>
      </h1>

      <p className="home-hero-writeup__lede home-reveal home-reveal--3">{lede}</p>
    </div>
  );
}
