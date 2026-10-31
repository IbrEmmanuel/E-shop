import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-shop Marketplace",
    short_name: "E-shop",
    description:
      "Shop phones, inverters, batteries, fashion, audio gear and more. Multi-vendor marketplace with secure checkout.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1c1c",
    theme_color: "#ff7600",
    orientation: "portrait-primary",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
