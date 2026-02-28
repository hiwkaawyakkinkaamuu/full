/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // เมื่อ Frontend เรียกเข้ามาที่ /api/...
        source: '/api/:path*',
        // destination: 'http://localhost:8080/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8080/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;