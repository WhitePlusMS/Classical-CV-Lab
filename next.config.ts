import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'dist',
  allowedDevOrigins: ['10.1.206.169', 'localhost'],
};

export default nextConfig;