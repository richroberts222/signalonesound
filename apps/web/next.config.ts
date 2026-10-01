import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  transpilePackages: ["@signalone/shared"],
};

export default nextConfig;
