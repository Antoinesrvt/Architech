import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  distDir: "dist",
  //Maybe not usefull: 
  // This enables static path generation for modules
  trailingSlash: true, 
  // Disable type checking in production build to speed up the build process
  typescript: {
    // Don't run type checking during production build
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
