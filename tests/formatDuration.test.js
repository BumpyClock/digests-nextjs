import assert from "node:assert";
import test from "node:test";
import { formatDuration } from "../compiled-tests/formatDuration.js";

test("handles invalid input", () => {
  assert.strictEqual(formatDuration(-1), "Unknown duration");
});

test("formats seconds", () => {
  assert.strictEqual(formatDuration(59), "59s");
});

test("formats minutes", () => {
  assert.strictEqual(formatDuration(60), "1m");
  assert.strictEqual(formatDuration(61), "1m 1s");
});

test("formats hours", () => {
  assert.strictEqual(formatDuration(3600), "1h");
  assert.strictEqual(formatDuration(3661), "1h 1m 1s");
});
