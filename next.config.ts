import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  eslint: {
    // Disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds for deployment
    ignoreBuildErrors: true,
  },
  // Configure images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Configure redirects
  async redirects() {
    return [];
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Fix React Native async storage issue in MetaMask SDK
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    return config;
  },
};

export default nextConfig;
