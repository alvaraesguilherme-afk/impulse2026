import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  devIndicators: false,
  cacheComponents: true,
  experimental: {
    // Fotos do Feed passam pela server action (já comprimidas no aparelho)
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    remotePatterns: [
      // Fotos de perfil vêm do Storage do ic-coordenacao
      {
        protocol: "https",
        hostname: "lcdtdoxxyrxebrxmhokj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "wdzyqmzetsvkedjjsjwi.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
