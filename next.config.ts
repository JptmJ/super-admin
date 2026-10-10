import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // No floating Next.js badge in development: it sat on top of the sidebar's
  // Sign out. Build and runtime errors still open the error overlay.
  devIndicators: false,
  // The backend URL is read at request time on the server, never shipped to
  // the browser — the browser only ever talks to this app's own /api routes.
  env: {},
};

export default config;
