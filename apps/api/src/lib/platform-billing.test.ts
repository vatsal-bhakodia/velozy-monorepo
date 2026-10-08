import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { schema } from "@velozy/db";
import {
  addSubscriptionCredits,
  currentCreditCycle,
  requireProjectPlanLimit,
  subscriptionIsActive,
  verifyPlatformDodoSignature,
} from "./platform-billing.js";

test("Dodo webhook signatures verify the raw body and reject tampered or stale requests", () => {
  const body = Buffer.from('{"type":"payment.succeeded"}');
  const id = "evt_test_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`;
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest("base64");
  assert.equal(verifyPlatformDodoSignature(body, { id, timestamp, signature: `v1,${signature}` }, secret), true);
  assert.equal(verifyPlatformDodoSignature(Buffer.from("tampered"), { id, timestamp, signature }, secret), false);
  assert.equal(verifyPlatformDodoSignature(body, { id, timestamp: "1", signature }, secret), false);
});

test("annual subscriptions refill credits on monthly calendar cycles", () => {
  const periodStart = new Date("2026-01-31T00:00:00.000Z");
  const periodEnd = new Date("2027-01-31T00:00:00.000Z");
  const cycle = currentCreditCycle(periodStart, periodEnd, new Date("2026-03-15T12:00:00.000Z"));
  assert.equal(cycle.start.toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(cycle.end.toISOString(), "2026-03-28T00:00:00.000Z");
});

test("plan access honors cancellation end dates and published page limits", async () => {
  const now = new Date("2026-05-01T00:00:00.000Z");
  assert.equal(subscriptionIsActive({ status: "cancelled", currentPeriodEnd: new Date("2026-05-02T00:00:00.000Z") } as any, now), true);
  assert.equal(subscriptionIsActive({ status: "cancelled", currentPeriodEnd: new Date("2026-04-30T00:00:00.000Z") } as any, now), false);

  const db = (subscription: unknown) => ({ query: { projectSubscriptions: { findFirst: async () => subscription } } });
  const launch = { provider: "dodo", status: "active", plan: "launch", currentPeriodEnd: new Date("2027-06-01T00:00:00.000Z") };
  assert.equal((await requireProjectPlanLimit(db(launch), "project-id", "published_pages")).allowance, 20);
  await assert.rejects(() => requireProjectPlanLimit(db({ ...launch, plan: "free", provider: "free" }), "project-id", "published_pages"), { code: "plan_limit_reached" });
  await assert.rejects(() => requireProjectPlanLimit(db(undefined), "project-id", "published_pages"), { code: "subscription_required" });
});

test("subscription credit events refill only once per monthly cycle", async () => {
  let wallet = {
    projectId: "project-id",
    subscriptionBalance: 75,
    subscriptionCycleStart: new Date("2026-01-01T00:00:00.000Z"),
    subscriptionCycleEnd: new Date("2026-02-01T00:00:00.000Z"),
  };
  const events: Array<Record<string, any>> = [];
  const tx: any = {
    insert(table: unknown) {
      return {
        values(value: Record<string, any>) {
          if (table === schema.projectCreditWallets) return { onConflictDoNothing: async () => undefined };
          events.push(value);
        },
      };
    },
    select() {
      return { from: () => ({ where: () => ({ for: async () => [wallet] }) }) };
    },
    update() {
      return { set: (values: Partial<typeof wallet>) => ({ where: async () => { wallet = { ...wallet, ...values }; } }) };
    },
    query: { projectCreditEvents: { findFirst: async () => undefined } },
  };

  const start = new Date("2026-02-01T00:00:00.000Z");
  const end = new Date("2026-03-01T00:00:00.000Z");
  await addSubscriptionCredits(tx, "project-id", 200, "owner-id", start, end, "sub-id");
  await addSubscriptionCredits(tx, "project-id", 200, "owner-id", start, end, "sub-id");
  assert.equal(wallet.subscriptionBalance, 200);
  assert.equal(wallet.subscriptionCycleStart?.toISOString(), start.toISOString());
  assert.equal(events.length, 1);
  assert.equal(events[0].subscriptionDelta, 125);
});
