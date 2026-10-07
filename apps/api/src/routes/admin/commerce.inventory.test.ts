import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { HttpError } from "../../middleware/errors.js";
import type { Environment } from "../../config/env.js";
import { adminAccess } from "../../lib/admin-auth.js";
import { adminCommerceRouter } from "./commerce.js";

const PROJECT_ID = "c1c1c1c1-1111-4111-8111-111111111111";
const OTHER_PROJECT_ID = "c2c2c2c2-2222-4222-8222-222222222222";
const LOCATION_ID = "c3c3c3c3-3333-4333-8333-333333333333";
const USER_ID = "c4c4c4c4-4444-4444-8444-444444444444";

type RouteLayer = {
  method: string;
  handle: (request: Request, response: Response) => Promise<void> | void;
};
type RouterLayer = {
  route?: { path: string; stack: RouteLayer[] };
};

function mockDependencies({
  locations = [],
  location = null,
  selectResults = [],
}: {
  locations?: unknown[];
  location?: unknown;
  selectResults?: unknown[][];
} = {}) {
  let selectIndex = 0;
  const scopes: Array<{ projectId: string; capability: string }> = [];
  const db = {
    query: {
      inventoryLocations: {
        findMany: async () => locations,
        findFirst: async () => location,
      },
    },
    select: () => {
      const result = selectResults[selectIndex++] ?? [];
      const builder = {
        from: () => builder,
        leftJoin: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
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
      return { id: PROJECT_ID };
    },
  } as unknown as ReturnType<typeof adminAccess>;
  return { dependencies, scopes };
}

function routeHandler(
  dependencies: ReturnType<typeof adminAccess>,
  path: string,
) {
  const router = adminCommerceRouter(
    { DATABASE_URL: "" } as Environment,
    dependencies,
  ) as unknown as { stack: RouterLayer[] };
  const route = router.stack.find((layer) => layer.route?.path === path)?.route;
  const handler = route?.stack.find((layer) => layer.method === "get")?.handle;
  assert(handler, `GET ${path} route should exist`);
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

describe("inventory admin routes", () => {
  it("returns an empty, project-scoped location list without creating data", async () => {
    const { dependencies, scopes } = mockDependencies();
    const handler = routeHandler(dependencies, "/inventory-locations");
    const response = await invoke(handler, { projectId: PROJECT_ID });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { locations: [] });
    assert.deepEqual(scopes, [
      { projectId: PROJECT_ID, capability: "commerce:read" },
    ]);

    const foreignProject = await invoke(handler, {
      projectId: OTHER_PROJECT_ID,
    });
    assert.equal(foreignProject.status, 404);
  });

  it("rejects foreign locations and invalid balance page inputs", async () => {
    const foreign = mockDependencies();
    const handler = routeHandler(foreign.dependencies, "/inventory-balances");
    const foreignLocation = await invoke(handler, {
      projectId: PROJECT_ID,
      locationId: LOCATION_ID,
    });
    assert.equal(foreignLocation.status, 404);

    const local = mockDependencies({
      location: { id: LOCATION_ID, projectId: PROJECT_ID },
    });
    const localHandler = routeHandler(
      local.dependencies,
      "/inventory-balances",
    );
    const invalidLimit = await invoke(localHandler, {
      projectId: PROJECT_ID,
      locationId: LOCATION_ID,
      limit: "101",
    });
    assert.equal(invalidLimit.status, 400);

    const invalidCursor = await invoke(localHandler, {
      projectId: PROJECT_ID,
      locationId: LOCATION_ID,
      cursor: "invalid",
    });
    assert.equal(invalidCursor.status, 400);
  });

  it("pages movement history and preserves deleted product/location references", async () => {
    const createdAt = new Date("2026-10-06T12:30:00.000Z");
    const { dependencies } = mockDependencies({
      selectResults: [
        [
          {
            id: "c5c5c5c5-5555-4555-8555-555555555555",
            productId: null,
            locationId: null,
            productName: null,
            productSku: null,
            locationName: null,
            quantityChange: -2,
            reason: "Correction",
            createdAt,
          },
          {
            id: "c6c6c6c6-6666-4666-8666-666666666666",
            productId: null,
            locationId: null,
            productName: null,
            productSku: null,
            locationName: null,
            quantityChange: 1,
            reason: "Receipt",
            createdAt: new Date("2026-10-05T12:30:00.000Z"),
          },
        ],
        [{ value: 2 }],
      ],
    });
    const handler = routeHandler(dependencies, "/inventory-movements");
    const response = await invoke(handler, {
      projectId: PROJECT_ID,
      limit: "1",
    });
    const body = response.body as {
      items: Array<Record<string, unknown>>;
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    };

    assert.equal(response.status, 200);
    assert.equal(body.total, 2);
    assert.equal(body.hasMore, true);
    assert.ok(body.nextCursor);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0]?.productName, null);
    assert.equal(body.items[0]?.locationName, null);
  });
});
