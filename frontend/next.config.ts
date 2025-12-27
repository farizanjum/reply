import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // @ts-ignore - Turbopack root is a valid option but might not be in types yet
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
