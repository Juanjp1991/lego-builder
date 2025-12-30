import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in dev for faster builds
});

const nextConfig: NextConfig = {
  // Set root directory to silence lockfile warning
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
};

export default withPWA(nextConfig);
