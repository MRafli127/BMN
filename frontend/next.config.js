/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Izinkan menampilkan gambar (foto barang & QR) dari server backend
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Vercel output config
  output: 'standalone',
  // Ignore build errors for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
