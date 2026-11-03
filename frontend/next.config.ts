import type { NextConfig } from "next";

// Evita alterar o deploy atual da Vercel. Na Discloud geramos um pacote
// standalone que pode ser movido para dist/ sem node_modules ou .next da origem.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(process.env.DISCLOUD_BUNDLE === "true" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
