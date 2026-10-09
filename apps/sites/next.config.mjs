import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export default {
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: ["tailwindcss", "postcss"],
  transpilePackages: ["@velozy/db", "@velozy/site-chrome"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};
