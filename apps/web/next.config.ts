import type { NextConfig } from 'next';

const config: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
