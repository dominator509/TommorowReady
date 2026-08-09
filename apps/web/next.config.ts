import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const contentSecurityPolicy = (development: boolean) =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

export default function config(phase: string): NextConfig {
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    allowedDevOrigins: ['127.0.0.1'],
    distDir: development ? '.next-dev' : '.next',
    output: 'standalone',
    poweredByHeader: false,
    reactStrictMode: true,
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Content-Security-Policy', value: contentSecurityPolicy(development) },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
            {
              key: 'Permissions-Policy',
              value:
                'camera=(), geolocation=(), microphone=(), payment=(), publickey-credentials-create=(self), publickey-credentials-get=(self)',
            },
            { key: 'Referrer-Policy', value: 'no-referrer' },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
          ],
        },
      ];
    },
  };
}
