import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fieldSchema, fieldValues, fieldsAreUnique, formSchema, formSchemaHash, pageFormNode } from "./enquiries.js";
import { HttpError } from "../../middleware/errors.js";

const requiredText = {
  id: "11111111-1111-4111-8111-111111111111",
  formId: "22222222-2222-4222-8222-222222222222",
  key: "name",
  label: "Full name",
  fieldType: "text",
  required: true,
  sortOrder: 0,
  options: null,
  placeholder: null,
  layout: "col-span-full",
};
const email = { ...requiredText, key: "email", label: "Email address", fieldType: "email", sortOrder: 1 };
const choice = { ...requiredText, key: "interest", label: "Interest", fieldType: "select", sortOrder: 2, options: ["Retail", "Wholesale"] };

describe("enquiry form definitions", () => {
  it("requires choices for select and radio fields and rejects duplicate keys", () => {
    assert.equal(fieldSchema.safeParse({ key: "choice", label: "Choice", fieldType: "select" }).success, false);
    const parsed = formSchema.safeParse({ projectId: "11111111-1111-4111-8111-111111111111", name: "Contact", fields: [{ key: "name", label: "Name", fieldType: "text" }, { key: "name", label: "Other", fieldType: "text" }] });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(fieldsAreUnique(parsed.data.fields), false);
  });

  it("normalizes accepted values and enforces required, type, email, and option constraints", () => {
    assert.deepEqual(fieldValues([requiredText, email, choice] as any, { name: "  Sana Mehta ", email: "sana@example.com", interest: "Wholesale" }), { name: "Sana Mehta", email: "sana@example.com", interest: "Wholesale" });
    for (const [fields, values] of [
      [[requiredText], {}],
      [[email], { email: "not-an-email" }],
      [[choice], { interest: "Unlisted" }],
      [[requiredText], { name: "x", unexpected: "value" }],
      [[requiredText], { name: "x".repeat(10001) }],
    ] as any[]) {
      assert.throws(() => fieldValues(fields, values), (error: unknown) => error instanceof HttpError && error.status === 400);
    }
  });

  it("uses form purpose and ordered field details for stable reuse identity", () => {
    const definition = formSchema.parse({ projectId: "11111111-1111-4111-8111-111111111111", name: "Contact", purpose: "general", fields: [{ key: "name", label: "Name", fieldType: "text" }] });
    const renamed = { ...definition, name: "Another form" };
    assert.equal(formSchemaHash(definition), formSchemaHash(renamed));
    assert.notEqual(formSchemaHash(definition), formSchemaHash({ ...definition, purpose: "quote" }));
    assert.notEqual(formSchemaHash(definition), formSchemaHash({ ...definition, fields: [{ ...definition.fields[0], required: true }] }));
  });
});

describe("published page form attribution", () => {
  it("resolves Craft forms by node key and checks the linked form id", () => {
    const node = { type: { resolvedName: "Form" }, props: { formId: "form-123" } };
    const page = { craftState: { ROOT: { nodes: ["form-node"] }, "form-node": node } };
    assert.equal(pageFormNode(page, "form-node")?.props?.formId, "form-123");
    assert.equal(pageFormNode(page, "missing-node"), undefined);
  });

  it("resolves legacy forms in sections with generated section-index node ids", () => {
    const node = { id: "legacy-form", type: "form", props: { fields: [{ name: "email" }] } };
    const page = { sections: [{ components: [node] }] };
    assert.equal(pageFormNode(page, "0:0"), node);
    assert.equal(pageFormNode(page, "1:0"), undefined);
  });
});
