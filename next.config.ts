import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds (e.g., Vercel)
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
