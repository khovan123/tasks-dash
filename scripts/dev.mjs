import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "dev", "-w", "@tasks-dash/web"], { stdio: "inherit", shell: true }),
  spawn("npm", ["run", "start:dev", "-w", "@tasks-dash/api"], { stdio: "inherit", shell: true }),
];

const shutdown = () => children.forEach((child) => child.kill("SIGTERM"));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
for (const child of children) child.on("exit", (code) => { if (code && code !== 0) process.exitCode = code; });
