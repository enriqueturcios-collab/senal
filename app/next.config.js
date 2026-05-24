/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true, serverActions: { allowedOrigins: ['localhost:3002'] } },
}
module.exports = nextConfig
