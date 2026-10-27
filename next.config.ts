import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.LEDGERLY_TEST_DIST || ".next",
  poweredByHeader: false,
};
export default config;
