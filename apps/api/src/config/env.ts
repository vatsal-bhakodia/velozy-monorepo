import { z } from "zod";

const environment = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173"),
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_URL: z.string().url().optional(),
  SUPABASE_MEDIA_BUCKET: z.string().default("site-media"),
  DATABASE_URL: z.string().min(1),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  GROWTH_INTERNAL_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  AHREFS_API_KEY: z.string().optional(),
  GOOGLE_SEO_API_KEY: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
});

export type Environment = z.infer<typeof environment>;

export function getEnvironment(): Environment {
  const parsed = environment.safeParse(process.env);
  if (!parsed.success)
    throw new Error(`Invalid API environment: ${parsed.error.message}`);
  return parsed.data;
}
