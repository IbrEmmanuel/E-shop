import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Shop Marketplace",
    short_name: "E-Shop",
    description:
      "Shop phones, inverters, batteries, fashion, audio gear and more. Multi-vendor marketplace with secure checkout.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#1a1a1a",
    orientation: "portrait-primary",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
