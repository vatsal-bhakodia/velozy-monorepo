import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  experimentAssignmentSchema,
  experimentInputSchema,
  publicGrowthEventsSchema,
} from "@velozy/contracts";
import { HttpError } from "../middleware/errors.js";
import type { Environment } from "../config/env.js";
import {
  flushGrowthUsage,
  growthUtcDay,
  verifyGrowthInternalRequest,
} from "./growth.js";

const environment = {
  GROWTH_INTERNAL_SECRET: "growth-test-secret-that-is-long-enough-32-bytes",
} as Environment;
const projectId = "c1c1c1c1-1111-4111-8111-111111111111";

describe("Growth internal request authentication", () => {
  it("fails closed when the internal secret is not configured", () => {
    assert.throws(
      () => verifyGrowthInternalRequest({} as Environment, "secret"),
      (error) => error instanceof HttpError && error.status === 503,
    );
    assert.equal(
      verifyGrowthInternalRequest(environment, "wrong-secret"),
      false,
    );
    assert.equal(
      verifyGrowthInternalRequest(
        environment,
        environment.GROWTH_INTERNAL_SECRET,
      ),
      true,
    );
  });
});

describe("Growth collection contracts", () => {
  const event = {
    id: "d1d1d1d1-1111-4111-8111-111111111111",
    name: "page_view",
    path: "/products/lamp",
    properties: {},
  };

  it("accepts bounded, local events and rejects contact details and URL query strings", () => {
    assert.equal(
      publicGrowthEventsSchema.safeParse({ events: [event] }).success,
      true,
    );
    assert.equal(
      publicGrowthEventsSchema.safeParse({
        events: [{ ...event, path: "/search?email=test@example.com" }],
      }).success,
      false,
    );
    assert.equal(
      publicGrowthEventsSchema.safeParse({
        events: [{ ...event, path: "/contact/test@example.com" }],
      }).success,
      false,
    );
    assert.equal(
      publicGrowthEventsSchema.safeParse({
        events: [{ ...event, properties: { email: "test@example.com" } }],
      }).success,
      false,
    );
    assert.equal(
      publicGrowthEventsSchema.safeParse({
        events: [
          {
            ...event,
            properties: Object.fromEntries(
              Array.from({ length: 26 }, (_, index) => [
                `metric_${index}`,
                index,
              ]),
            ),
          },
        ],
      }).success,
      false,
    );
  });

  it("only accepts safe experiment copy overrides and valid allocations", () => {
    const experiment = {
      projectId,
      name: "Headline test",
      targetType: "page",
      targetId: "d2d2d2d2-2222-4222-8222-222222222222",
      primaryEvent: "page_view",
      baselineRate: 0.02,
      minimumDetectableEffect: 0.2,
      variants: [
        {
          key: "control",
          name: "Control",
          isControl: true,
          allocation: 50,
          experience: {},
        },
        {
          key: "variant_b",
          name: "Variant B",
          isControl: false,
          allocation: 50,
          experience: { headline: "A clearer promise", buttonText: "Explore" },
        },
      ],
    };
    assert.equal(experimentInputSchema.safeParse(experiment).success, true);
    assert.equal(
      experimentInputSchema.safeParse({
        ...experiment,
        variants: [
          { ...experiment.variants[0], allocation: 49 },
          experiment.variants[1],
        ],
      }).success,
      false,
    );
    assert.equal(
      experimentInputSchema.safeParse({
        ...experiment,
        variants: [
          experiment.variants[0],
          { ...experiment.variants[1], experience: { price: 1 } },
        ],
      }).success,
      false,
    );
  });

  it("validates experiment assignment against supported surfaces", () => {
    assert.equal(
      experimentAssignmentSchema.safeParse({
        targetType: "checkout",
        targetId: null,
      }).success,
      true,
    );
    assert.equal(
      experimentAssignmentSchema.safeParse({
        targetType: "page",
        targetId: "d2d2d2d2-2222-4222-8222-222222222222",
      }).success,
      true,
    );
    assert.equal(
      experimentAssignmentSchema.safeParse({
        targetType: "product",
        targetId: "unknown",
      }).success,
      false,
    );
    assert.equal(
      experimentAssignmentSchema.safeParse({
        targetType: "checkout",
        targetId: "d2d2d2d2-2222-4222-8222-222222222222",
      }).success,
      false,
    );
  });
});

describe("Growth UTC rollup day", () => {
  it("uses the UTC calendar day across local timezones", () => {
    assert.equal(
      growthUtcDay(new Date("2026-10-05T23:59:59.000Z")),
      "2026-10-05",
    );
    assert.equal(
      growthUtcDay(new Date("2026-10-06T00:00:00.000Z")),
      "2026-10-06",
    );
  });
});

describe("Growth usage flush", () => {
  const projectId = "c1c1c1c1-1111-4111-8111-111111111111";

  it("upserts valid counters and only removes a closed day after persistence", async () => {
    const today = growthUtcDay();
    const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = growthUtcDay(yesterdayDate);
    const inserted: Array<Record<string, unknown>> = [];
    const removedDays: string[] = [];
    const redis = {
      smembers: async () => [yesterday, today],
      hgetall: async (key: string) =>
        key.endsWith(yesterday)
          ? {
              [projectId]: "12",
              invalid_project: "9",
              "c2c2c2c2-2222-4222-8222-222222222222": "not-a-count",
            }
          : { [projectId]: "4" },
      srem: async (_key: string, day: string) => removedDays.push(day),
    };
    const db = {
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          inserted.push(value);
          return { onConflictDoUpdate: async () => undefined };
        },
      }),
    } as unknown as ReturnType<typeof import("@velozy/db").createDb>;

    await flushGrowthUsage(redis, db);

    assert.deepEqual(
      inserted.map((row) => [row.projectId, row.pageViews]),
      [
        [projectId, "12"],
        [projectId, "4"],
      ],
    );
    assert.deepEqual(removedDays, [yesterday]);
    assert.ok(inserted.every((row) => row.periodStart instanceof Date));
  });

  it("keeps a closed-day counter queued when database persistence fails", async () => {
    const today = growthUtcDay();
    const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = growthUtcDay(yesterdayDate);
    const removedDays: string[] = [];
    const redis = {
      smembers: async () => [yesterday],
      hgetall: async () => ({ [projectId]: "12" }),
      srem: async (_key: string, day: string) => removedDays.push(day),
    };
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: async () => {
            throw new Error("database unavailable");
          },
        }),
      }),
    } as unknown as ReturnType<typeof import("@velozy/db").createDb>;

    await assert.rejects(flushGrowthUsage(redis, db), /database unavailable/);
    assert.deepEqual(removedDays, []);
  });
});
