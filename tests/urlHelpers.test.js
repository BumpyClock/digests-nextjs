import assert from "node:assert";
import test from "node:test";
import { normalizeUrl } from "../compiled-tests/url.js";

test("removes protocol and trailing slash", () => {
  assert.strictEqual(normalizeUrl("https://example.com/"), "example.com");
});

test("normalizes multiple slashes", () => {
  assert.strictEqual(normalizeUrl("https://example.com//a//b"), "example.com/a/b");
});

test("handles null input", () => {
  assert.strictEqual(normalizeUrl(null), "");
});

test("handles empty string", () => {
  assert.strictEqual(normalizeUrl(""), "");
});

test("handles undefined", () => {
  assert.strictEqual(normalizeUrl(undefined), "");
});

test("lowercases URLs", () => {
  assert.strictEqual(normalizeUrl("https://Example.COM/Path"), "example.com/path");
});
