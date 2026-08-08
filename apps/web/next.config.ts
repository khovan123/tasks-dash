import path from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(__dirname || process.cwd(), "../.."));

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "flanked-shredding-theatrics.ngrok-free.dev",
    "tasks-dash.fogewise.io.vn",
  ],
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  poweredByHeader: false,
};
export default nextConfig;
