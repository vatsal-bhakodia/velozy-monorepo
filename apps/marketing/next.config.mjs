import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export default {
  outputFileTracingRoot: workspaceRoot,
  experimental: { externalDir: true },
  async redirects() {
    const admin = (
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173"
    ).replace(/\/$/, "");
    return [
      {
        source: "/auth/signin",
        destination: `${admin}/signin`,
        permanent: false,
      },
      {
        source: "/auth/signup",
        destination: `${admin}/signup`,
        permanent: false,
      },
      {
        source: "/auth/callback",
        destination: `${admin}/auth/callback`,
        permanent: false,
      },
      { source: "/onboard", destination: `${admin}/onboard`, permanent: false },
    ];
  },
};
