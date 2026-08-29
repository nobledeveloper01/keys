import type { NextConfig } from 'next';

const config: NextConfig = {
  // The registry pages are the entire point of having a web surface: a person
  // who was sent a listing on WhatsApp can check the number without installing
  // anything, and a search for that number should find the page. Both need
  // real server rendering rather than a shell that fills in later.
  reactStrictMode: true,
  transpilePackages: ['@keys/api', '@keys/domain'],
};

export default config;
