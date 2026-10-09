import type { NextConfig } from "next";

// Baseline response headers (docs/secure-coding.md). Anti-framing blocks clickjacking (cross-frame
// attacks); nosniff, referrer and permissions policies limit leakage and browser features. A full
// script policy (CSP script-src and friends) is staged separately: the identity provider's scripts
// need an allow-list and a nonce setup, so it is introduced in report-only mode first.
// geolocation and payment stay allowed for this origin because location search and checkout are planned.
export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  transpilePackages: ["@signalone/shared", "@signalone/validation"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
