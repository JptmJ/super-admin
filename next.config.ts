import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The backend URL is read at request time on the server, never shipped to
  // the browser — the browser only ever talks to this app's own /api routes.
  env: {},
};

export default config;
