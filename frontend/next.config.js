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
};

module.exports = nextConfig;
