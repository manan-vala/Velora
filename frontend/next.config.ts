import type { NextConfig } from "next";

// "app" builds the static export for Capacitor; anything else is the Vercel web build.
const isApp = process.env.BUILD_TARGET === "app";

const nextConfig: NextConfig = {
  ...(isApp && { output: "export" }),
  // API routes are named route.web.ts, so the static app export never includes them.
  pageExtensions: isApp
    ? ["tsx", "ts", "jsx", "js"]
    : ["web.ts", "tsx", "ts", "jsx", "js"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
