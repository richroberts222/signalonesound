import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  transpilePackages: ["@signalone/shared", "@signalone/validation"],
};

export default nextConfig;
