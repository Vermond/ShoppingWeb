import type { NextConfig } from "next";

const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    if (!backendApiBaseUrl) {
      return [];
    }

    return [
      {
        source: "/api/products",
        destination: `${backendApiBaseUrl}/api/products`,
      },
      {
        source: "/api/products/:path*",
        destination: `${backendApiBaseUrl}/api/products/:path*`,
      },
      {
        source: "/api/cart",
        destination: `${backendApiBaseUrl}/api/cart`,
      },
      {
        source: "/api/cart/:path*",
        destination: `${backendApiBaseUrl}/api/cart/:path*`,
      },
      {
        source: "/api/wishlist",
        destination: `${backendApiBaseUrl}/api/wishlist`,
      },
      {
        source: "/api/wishlist/:path*",
        destination: `${backendApiBaseUrl}/api/wishlist/:path*`,
      },
      {
        source: "/api/categories",
        destination: `${backendApiBaseUrl}/api/categories`,
      },
      {
        source: "/api/orders",
        destination: `${backendApiBaseUrl}/api/orders`,
      },
      {
        source: "/api/orders/:path*",
        destination: `${backendApiBaseUrl}/api/orders/:path*`,
      },
      {
        source: "/api/users",
        destination: `${backendApiBaseUrl}/api/users`,
      },
      {
        source: "/api/users/:path*",
        destination: `${backendApiBaseUrl}/api/users/:path*`,
      },
    ];
  },
};

export default nextConfig;
