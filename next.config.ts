import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/**": ["./src/proto/**/*"],
  },
};

export default nextConfig;
