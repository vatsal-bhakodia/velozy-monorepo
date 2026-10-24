import { projectAccess } from "./project-access.js";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { createDb, schema } from "@velozy/db";
import { HttpError } from "../middleware/errors.js";

export function adminAccess(
  databaseUrl: string,
  database?: ReturnType<typeof createDb>,
) {
  const db = database ?? createDb(databaseUrl);
  const user = async (request: Request) => {
    if (!request.auth?.userId) throw new HttpError(401, "Unauthorized");
    const found = await db.query.users.findFirst({
      where: eq(schema.users.id, request.auth.userId),
    });
    if (!found) throw new HttpError(404, "User not found");
    return found;
  };
  const project = projectAccess(db);
  return { db, user, project };
}
