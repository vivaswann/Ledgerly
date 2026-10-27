import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";
const config: NextConfig = {
  distDir: process.env.LEDGERLY_TEST_DIST || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default config;
