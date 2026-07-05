/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:8080/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8080/api/:path*',
      },

      {
        source: '/ws/:path*',
        destination: 'http://127.0.0.1:8080/ws/:path*',
      }
    ];
  },
};

export default nextConfig;
