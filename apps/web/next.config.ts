import path from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(__dirname || process.cwd(), "../.."));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  poweredByHeader: false,
};
export default nextConfig;
