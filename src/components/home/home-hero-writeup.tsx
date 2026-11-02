"use client";

import { useEffect, useRef } from "react";

type HomeHeroWriteupProps = {
  lede: string;
};

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
      const travel = Math.max(rect.height * 0.55, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), travel);
      const progress = scrolled / travel;
      root.style.setProperty("--hero-scroll", progress.toFixed(4));

      root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const speed = Number(el.dataset.parallax || 0.18);
        el.style.transform = `translate3d(0, ${progress * speed * -72}px, 0)`;
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

  return (
    <div ref={rootRef} className="home-hero-writeup">
      <p className="home-hero-writeup__eyebrow home-reveal home-reveal--2" data-parallax="0.08">
        <span className="home-hero-writeup__pulse" aria-hidden />
        Live marketplace OS
      </p>
      <h1 className="home-hero-writeup__headline">
        <span
          className="home-hero-writeup__line home-reveal home-reveal--2"
          data-parallax="0.14"
        >
          Multi-vendor commerce,
        </span>
        <span
          className="home-hero-writeup__line home-hero-writeup__line--accent home-reveal home-reveal--3"
          data-parallax="0.26"
        >
          engineered for makers.
        </span>
      </h1>
      <p
        className="home-hero-writeup__lede home-reveal home-reveal--3"
        data-parallax="0.34"
      >
        {lede}
      </p>
    </div>
  );
}
