/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add mock for Tauri in web environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },
  // Tauri-specific configuration
  output: "export",  // Required for static site generation with Tauri
  // Override react-strict-mode for Tauri compatibility
  reactStrictMode: false,
}

export default nextConfig; 