import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionFieldsSchema,
  compatibleFields,
  validateCollectionValues,
} from "./custom-collections.js";

test("collection schemas reject duplicate keys and invalid select definitions", () => {
  assert.equal(
    collectionFieldsSchema.safeParse([
      { key: "name", label: "Name", type: "text" },
      { key: "name", label: "Other", type: "text" },
    ]).success,
    false,
  );
  assert.equal(
    collectionFieldsSchema.safeParse([
      { key: "kind", label: "Kind", type: "select", options: [] },
    ]).success,
    false,
  );
});

test("record validation enforces required, typed, option, URL, and unknown-field rules", () => {
  const fields = collectionFieldsSchema.parse([
    { key: "name", label: "Name", type: "text", required: true },
    { key: "rating", label: "Rating", type: "number" },
    { key: "approved", label: "Approved", type: "boolean" },
    { key: "website", label: "Website", type: "url" },
    { key: "tier", label: "Tier", type: "select", options: ["gold", "silver"] },
  ]);
  assert.equal(
    validateCollectionValues(fields, {
      name: "A",
      rating: 5,
      approved: true,
      website: "javascript:alert(1)",
      tier: "gold",
    }).success,
    false,
  );
  assert.equal(
    validateCollectionValues(fields, { name: "A", tier: "bronze" }).success,
    false,
  );
  assert.equal(validateCollectionValues(fields, { rating: 5 }).success, false);
  assert.equal(
    validateCollectionValues(fields, { name: "A", extra: "no" }).success,
    false,
  );
  assert.deepEqual(
    validateCollectionValues(fields, {
      name: "A",
      rating: 5,
      approved: true,
      website: "https://example.com",
      tier: "gold",
    }),
    {
      success: true,
      value: {
        name: "A",
        rating: 5,
        approved: true,
        website: "https://example.com",
        tier: "gold",
      },
    },
  );
});

test("compatible schema edits preserve existing field keys and types while allowing new fields", () => {
  const current = [{ key: "quote", type: "textarea" }];
  assert.equal(
    compatibleFields(current, [
      { key: "quote", label: "Quote", type: "textarea", required: false },
      { key: "name", label: "Name", type: "text", required: false },
    ]),
    true,
  );
  assert.equal(
    compatibleFields(current, [
      { key: "quote", label: "Quote", type: "text", required: false },
    ]),
    false,
  );
  assert.equal(
    compatibleFields(current, [
      { key: "message", label: "Message", type: "textarea", required: false },
    ]),
    false,
  );
});
