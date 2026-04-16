import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@flowchart/core"],
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
