/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  generateEtags: true,
};

module.exports = nextConfig;
