import { pgEnum, customType } from "drizzle-orm/pg-core";

export type Formify<T> = {
  [K in keyof T]-?: T[K] extends string | null ? string : T[K];
};

export const statusEnum = pgEnum("page_status", ["draft", "published", "private"]);
export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "editor", "viewer"]);
export const lifecycleStatusEnum = pgEnum("lifecycle_status", ["active", "archived", "deleted"]);
export const revisionStatusEnum = pgEnum("revision_status", ["draft", "preview", "published", "superseded"]);
export const aiRunStatusEnum = pgEnum("ai_run_status", ["queued", "running", "succeeded", "failed", "cancelled"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "expired"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["new", "open", "qualified", "closed", "spam"]);

export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions?: number };
}>({
  dataType: (config) => config?.dimensions ? `vector(${config.dimensions})` : "vector",
  toDriver: (value) => `[${value.join(",")}]`,
  fromDriver: (value) => String(value).slice(1, -1).split(",").map(Number),
});
