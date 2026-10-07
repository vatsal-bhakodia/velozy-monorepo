import { Worker } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required for the worker");

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
new Worker(
  "publishing",
  async () => {
    throw new Error(
      "Publish processor has not been migrated from the legacy application",
    );
  },
  { connection },
);
