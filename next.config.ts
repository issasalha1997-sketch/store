import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // SuperValu product images
      { protocol: "https", hostname: "**.supervalu.ie" },
      // Dunnes product images
      { protocol: "https", hostname: "**.dunnesstoresgrocery.com" },
      // Aldi product images (CDN)
      { protocol: "https", hostname: "dm.emea.cms.aldi.cx" },
      // Tesco product images
      { protocol: "https", hostname: "digitalcontent.api.tesco.com" },
      // Catch-all for other CDNs used by stores
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.akamaized.net" },
    ],
  },
};

export default nextConfig;
