import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.intercom.com" },
    ],
  },
  serverExternalPackages: ["plivo"],
};

export default nextConfig;
