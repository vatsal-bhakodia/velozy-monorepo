import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A command is required");

const child = spawn(command, args, {
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
