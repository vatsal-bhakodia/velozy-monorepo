import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeCursor,
  parseInventoryPageQuery,
  parseMovementPageQuery,
} from "./inventory-pagination.js";

const productId = "c1c1c1c1-1111-4111-8111-111111111111";

describe("inventory pagination query", () => {
  it("uses a bounded default page size and trims search", () => {
    assert.deepEqual(parseInventoryPageQuery({ search: "  lamp  " }), {
      limit: 50,
      search: "lamp",
      cursor: undefined,
    });
  });

  it("accepts the maximum page size and a valid product cursor", () => {
    const cursor = encodeCursor({ name: "Lamp", id: productId });
    assert.deepEqual(parseInventoryPageQuery({ limit: "100", cursor }), {
      limit: 100,
      search: "",
      cursor: { name: "Lamp", id: productId },
    });
  });

  it("rejects oversized pages, long searches, and malformed cursors", () => {
    assert.throws(() => parseInventoryPageQuery({ limit: "101" }));
    assert.throws(() => parseInventoryPageQuery({ search: "x".repeat(121) }));
    assert.throws(() => parseInventoryPageQuery({ cursor: "not-a-cursor" }));
  });
});

describe("movement pagination query", () => {
  it("accepts stable timestamp and id cursors", () => {
    const cursor = encodeCursor({
      createdAt: "2026-10-06T12:30:00.000Z",
      id: productId,
    });
    assert.deepEqual(parseMovementPageQuery({ limit: "25", cursor }), {
      limit: 25,
      search: "",
      cursor: {
        createdAt: "2026-10-06T12:30:00.000Z",
        id: productId,
      },
    });
  });

  it("rejects non-date movement cursors", () => {
    const cursor = encodeCursor({ createdAt: "yesterday", id: productId });
    assert.throws(() => parseMovementPageQuery({ cursor }));
  });
});
