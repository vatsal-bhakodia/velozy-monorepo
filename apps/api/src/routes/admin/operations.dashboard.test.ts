import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { HttpError } from "../../middleware/errors.js";
import type { Environment } from "../../config/env.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { adminOperationsRouter, netRevenueByCurrency } from "./operations.js";

const PROJECT_ID = "c1c1c1c1-1111-4111-8111-111111111111";
const FOREIGN_PROJECT_ID = "c2c2c2c2-2222-4222-8222-222222222222";
const USER_ID = "c4c4c4c4-4444-4444-8444-444444444444";

type RouteLayer = {
  method: string;
  handle: (request: Request, response: Response) => Promise<void> | void;
};
type RouterLayer = { route?: { path: string; stack: RouteLayer[] } };

function mockDependencies(results: unknown[][] = [], storeType = "ecommerce") {
  let selectIndex = 0;
  const scopes: Array<{ projectId: string; capability: string }> = [];
  const db = {
    select: () => {
      const result = results[selectIndex++] ?? [];
      const builder = {
        from: () => builder,
        innerJoin: () => builder,
        where: () => builder,
        groupBy: () => builder,
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(resolve, reject),
      };
      return builder;
    },
  };
  const dependencies = {
    db,
    user: async () => ({ id: USER_ID }),
    project: async (projectId: string, _userId: string, capability: string) => {
      scopes.push({ projectId, capability });
      if (projectId !== PROJECT_ID)
        throw new HttpError(404, "Project not found or access denied");
      return { id: PROJECT_ID, storeType };
    },
  } as unknown as ReturnType<typeof adminAccess>;
  return { dependencies, scopes };
}

function routeHandler(dependencies: ReturnType<typeof adminAccess>) {
  const router = adminOperationsRouter(
    { DATABASE_URL: "" } as Environment,
    dependencies,
  ) as unknown as { stack: RouterLayer[] };
  const route = router.stack.find(
    (layer) => layer.route?.path === "/commerce/revenue-summary",
  )?.route;
  const handler = route?.stack.find((layer) => layer.method === "get")?.handle;
  assert(handler, "GET /commerce/revenue-summary route should exist");
  return handler;
}

async function invoke(
  handler: ReturnType<typeof routeHandler>,
  query: Record<string, string>,
) {
  let status = 200;
  let body: unknown;
  const request = { query, method: "GET" } as unknown as Request;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;
  try {
    await handler(request, response);
  } catch (error) {
    status = error instanceof HttpError ? error.status : 500;
    body = error;
  }
  return { status, body };
}

describe("dashboard revenue summary", () => {
  it("subtracts refunds exactly by currency and never returns negative revenue", () => {
    assert.deepEqual(
      netRevenueByCurrency(
        [
          { currency: "USD", total: "125.125000", count: 3 },
          { currency: "JPY", total: "1200.000000", count: 1 },
        ],
        [
          { currency: "USD", total: "25.025000" },
          { currency: "JPY", total: "1300.000000" },
        ],
      ),
      [
        { currency: "USD", amount: "100.1", orders: 3 },
        { currency: "JPY", amount: "0", orders: 1 },
      ],
    );
  });

  it("requires a valid date range and commerce access to the requested project", async () => {
    const local = mockDependencies([
      [{ currency: "USD", total: "50.000000", count: 1 }],
      [{ currency: "USD", total: "10.000000" }],
    ]);
    const handler = routeHandler(local.dependencies);
    const validRange = {
      projectId: PROJECT_ID,
      from: "2026-05-01",
      to: "2026-05-31",
    };

    const invalidRange = await invoke(handler, {
      ...validRange,
      from: "2026-06-01",
    });
    assert.equal(invalidRange.status, 400);

    const foreignProject = await invoke(handler, {
      ...validRange,
      projectId: FOREIGN_PROJECT_ID,
    });
    assert.equal(foreignProject.status, 404);

    const response = await invoke(handler, validRange);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      from: "2026-05-01",
      to: "2026-05-31",
      revenue: [{ currency: "USD", amount: "40", orders: 1 }],
    });
    assert.deepEqual(local.scopes, [
      { projectId: FOREIGN_PROJECT_ID, capability: "commerce:read" },
      { projectId: PROJECT_ID, capability: "commerce:read" },
    ]);
  });

  it("does not expose revenue for non-ecommerce projects", async () => {
    const local = mockDependencies([], "blog");
    const handler = routeHandler(local.dependencies);
    const response = await invoke(handler, {
      projectId: PROJECT_ID,
      from: "2026-05-01",
      to: "2026-05-31",
    });
    assert.equal(response.status, 409);
    assert.deepEqual(local.scopes, [
      { projectId: PROJECT_ID, capability: "commerce:read" },
    ]);
  });
});
