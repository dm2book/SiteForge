import type { NextConfig } from 'next';

const config: NextConfig = {
  // De gerenderde klantsites bevatten alleen onze eigen componenten; er is geen
  // externe code en geen inline script, dus deze headers kunnen streng staan.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default config;
