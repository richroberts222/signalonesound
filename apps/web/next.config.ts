import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@signalone/shared"],
};

export default nextConfig;
