import type { NextConfig } from "next";
import { APP_BASE_PATH } from "./src/lib/config/basePath";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  basePath: process.env.NODE_ENV === 'production' ? APP_BASE_PATH : undefined,
  images: { unoptimized: true },
  allowedDevOrigins: ['10.1.206.169', 'localhost'],
};

export default nextConfig;
