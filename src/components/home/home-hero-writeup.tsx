"use client";

import { useEffect, useRef } from "react";

type HomeHeroWriteupProps = {
  lede: string;
};

const TICKER = [
  "Live inventory",
  "Bank-transfer checkout",
  "Monthly shop rental",
  "Tracked delivery",
  "Vendor desks",
  "Multi-vendor catalog",
];

export function HomeHeroWriteup({ lede }: HomeHeroWriteupProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      root.dataset.ready = "1";
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const hero = root.closest(".home-hero");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const travel = Math.max(rect.height * 0.7, 180);
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      const progress = scrolled / travel;
      root.style.setProperty("--hero-scroll", progress.toFixed(4));

      root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const speed = Number(el.dataset.parallax || 0.2);
        // Drive via CSS var so it never fights entrance animations.
        el.style.setProperty(
          "--parallax-y",
          `${(progress * speed * -140).toFixed(2)}`,
        );
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    root.dataset.ready = "1";
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const ticker = [...TICKER, ...TICKER];

  return (
    <div ref={rootRef} className="home-hero-writeup">
      <div className="home-reveal home-reveal--2">
        <p className="home-hero-writeup__eyebrow" data-parallax="0.12">
          <span className="home-hero-writeup__pulse" aria-hidden />
          Live marketplace OS
        </p>
      </div>

      <h1 className="home-hero-writeup__headline">
        <span className="home-reveal home-reveal--2">
          <span className="home-hero-writeup__line" data-parallax="0.22">
            Multi-vendor commerce,
          </span>
        </span>
        <span className="home-reveal home-reveal--3">
          <span
            className="home-hero-writeup__line home-hero-writeup__line--accent"
            data-parallax="0.4"
          >
            engineered for makers.
          </span>
        </span>
      </h1>

      <div className="home-reveal home-reveal--3">
        <div className="home-hero-writeup__ticker" data-parallax="0.28" aria-hidden>
          <div className="home-hero-writeup__ticker-track">
            {ticker.map((item, i) => (
              <span key={`${item}-${i}`} className="home-hero-writeup__ticker-item">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="home-reveal home-reveal--3">
        <p className="home-hero-writeup__lede" data-parallax="0.48">
          {lede}
        </p>
      </div>
    </div>
  );
}
