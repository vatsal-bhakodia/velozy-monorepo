import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { createDb } from "@velozy/db";
import { processSeoCampaignJob } from "./seo-campaign-jobs.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required for the worker");

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
new Worker(
  "publishing",
  async () => {
    throw new Error(
      "Publish processor has not been migrated from the legacy application",
    );
  },
  { connection },
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for SEO campaign jobs");
const db = createDb(databaseUrl);

const seoCampaignWorker = new Worker(
  "seo-campaigns",
  async (job) => processSeoCampaignJob(db, String(job.data.campaignJobId)),
  { connection: new Redis(redisUrl, { maxRetriesPerRequest: null }), concurrency: 2 },
);
seoCampaignWorker.on("failed", (job, error) => {
  console.error(`SEO campaign job ${job?.id || "unknown"} failed:`, error);
});
