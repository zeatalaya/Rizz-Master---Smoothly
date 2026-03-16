import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["puppeteer", "@phala/dstack-sdk"],
};

export default nextConfig;
