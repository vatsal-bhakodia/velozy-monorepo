import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpError } from "../../middleware/errors.js";
import { detectAndNormalize, parseMigrationCsv } from "./migration.js";

describe("catalog migration CSV parsing", () => {
  it("preserves escaped quotes and multiline product descriptions", () => {
    const rows = parseMigrationCsv('\uFEFFHandle,Title,Body (HTML)\r\nshirt,Shirt,"Line one, with a comma\nLine two with ""quotes""."\r\n');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]["Body (HTML)"], 'Line one, with a comma\nLine two with "quotes".');
  });

  it("rejects malformed quotes, ragged rows, and duplicate headers", () => {
    const invalidInputs = [
      'Handle,Title\na,"unclosed',
      'Handle,Title\na,b,extra',
      'Handle,Handle\na,b',
      'Handle,Title\na,b"c',
    ];
    for (const input of invalidInputs) {
      assert.throws(() => parseMigrationCsv(input), HttpError);
    }
  });

  it("groups Shopify variant rows and retains option, image, and metadata fields", () => {
    const rows = parseMigrationCsv([
      "Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Inventory Qty,Image Src,Plugin field",
      'shirt,Shirt,Size,Small,SH-S,19.95,3,https://cdn.example/small.jpg,enabled',
      'shirt,Shirt,Size,Large,SH-L,21.95,4,https://cdn.example/large.jpg,enabled',
    ].join("\n"));
    const result = detectAndNormalize(rows);
    assert.equal(result.platform, "shopify");
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].variants.length, 2);
    assert.deepEqual(result.records[0].attributes[0].values, ["Small", "Large"]);
    assert.equal(result.records[0].media.length, 2);
    assert.equal(result.records[0].product.inventoryQuantity, 7);
    assert.equal(result.records[0].metadata["Plugin field"], "enabled");
  });

  it("joins WooCommerce variation rows to their parent and reports invalid variant values", () => {
    const rows = parseMigrationCsv([
      "ID,Type,SKU,Name,Parent,Regular price,Sale price,Stock,Attribute 1 name,Attribute 1 value(s),Categories,Images",
      "42,variable,BASE,Cap,,20,,0,,,Accessories > Hats,https://cdn.example/cap.jpg",
      "43,variation,CAP-BLUE,,id:42,18,16,2,Color,Blue,,",
      "44,variation,CAP-RED,,id:42,invalid,15,-1,Color,Red,,",
    ].join("\n"));
    const result = detectAndNormalize(rows);
    assert.equal(result.platform, "woocommerce");
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].variants.length, 2);
    assert.equal(result.records[0].product.inventoryQuantity, 1);
    assert.equal(result.records[0].product.price, 18);
    assert.equal(result.records[0].product.discountedPrice, 15);
    assert.ok(result.records[0].warnings.some((warning: string) => warning.includes("price")));
    assert.ok(result.records[0].warnings.some((warning: string) => warning.includes("inventory quantity")));
  });

  it("rejects exports with unsupported headers and non-web media URLs are omitted", () => {
    assert.throws(() => detectAndNormalize([{ Name: "Item" }]), HttpError);
    const result = detectAndNormalize(parseMigrationCsv("Handle,Title,Image Src\nitem,Item,javascript:alert(1)"));
    assert.deepEqual(result.records[0].media, []);
    assert.ok(result.records[0].warnings.some((warning: string) => warning.includes("media URL")));
  });
});
