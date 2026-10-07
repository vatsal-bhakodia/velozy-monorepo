import { createDb } from "@velozy/db";

type Database = ReturnType<typeof createDb>;
let database: Database | undefined;

function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  database ??= createDb(databaseUrl);
  return database;
}

export const db = new Proxy({} as Database, {
  get: (_target, property) => {
    const instance = getDatabase();
    const value = instance[property as keyof Database];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
