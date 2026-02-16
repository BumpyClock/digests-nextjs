import assert from "node:assert";
import test from "node:test";
import { getValidReaderViewOrThrow } from "../compiled-tests/hooks/queries/reader-view-validation.js";

const okResult = {
  success: true,
  data: [
    {
      url: "https://example.com/article",
      status: "ok",
      content: "ok",
      title: "ok",
      siteName: "Example",
      image: "",
      favicon: "",
      textContent: "ok",
      markdown: "ok",
    },
  ],
};

test("returns reader view when response is successful", () => {
  const result = getValidReaderViewOrThrow(okResult, "https://example.com/article");
  assert.equal(result.status, "ok");
});

test("throws when result is unsuccessful", () => {
  assert.throws(() =>
    getValidReaderViewOrThrow(
      {
        success: false,
        message: "bad status",
        data: [],
      },
      "https://example.com/article"
    )
  );
});

test("throws when payload is empty", () => {
  assert.throws(() =>
    getValidReaderViewOrThrow(
      {
        success: true,
        data: [],
      },
      "https://example.com/article"
    )
  );
});

test("throws when status is not ok", () => {
  assert.throws(() =>
    getValidReaderViewOrThrow(
      {
        success: true,
        data: [
          {
            ...okResult.data[0],
            status: "error",
            error: "parser failed",
          },
        ],
      },
      "https://example.com/article"
    )
  );
});
