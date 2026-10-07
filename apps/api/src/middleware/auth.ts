import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Environment } from "../config/env.js";
import { HttpError } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; email?: string };
    }
  }
}

export function requireSupabaseAuth(environment: Environment): RequestHandler {
  const jwks = createRemoteJWKSet(
    new URL(
      environment.SUPABASE_JWKS_URL ??
        `${environment.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    ),
  );
  return async (request, _response, next) => {
    try {
      const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) throw new HttpError(401, "Unauthorized", "missing_token");
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${environment.SUPABASE_URL}/auth/v1`,
        audience: "authenticated",
      });
      if (typeof payload.sub !== "string")
        throw new HttpError(401, "Unauthorized", "invalid_token");
      request.auth = {
        userId: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
      next();
    } catch (error) {
      next(
        error instanceof HttpError
          ? error
          : new HttpError(401, "Unauthorized", "invalid_token"),
      );
    }
  };
}
