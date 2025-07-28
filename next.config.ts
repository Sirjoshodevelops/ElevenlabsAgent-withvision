import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Add rule for raw shader files
    config.module.rules.push({
      test: /\.(frag|vert)$/,
      type: 'asset/source',
    });
    
    return config;
  },
};

export default nextConfig;
