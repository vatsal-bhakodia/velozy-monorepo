/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/page-builder",
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  },
  experimental: { externalDir: true },
  transpilePackages: ["@velozy/site-chrome"],
};

export default nextConfig;
