import assert from "node:assert";
import test from "node:test";
import { filterAllowlistedMatches, parseSearchOutput } from "../scripts/check-feeditems.js";

test("allowlists legacy feedItems cleanup in useFeedStore migration", () => {
  const matches = parseSearchOutput(
    "./store/useFeedStore.ts:87:            delete state.feedItems;"
  );
  const { allowed, blocked } = filterAllowlistedMatches(matches, "state\\.feedItems\\b");

  assert.equal(allowed.length, 1);
  assert.equal(blocked.length, 0);
});

test("blocks state.feedItems usage outside allowlist", () => {
  const matches = parseSearchOutput(
    "components/Feed/FeedList/FeedList.tsx:10:const items = state.feedItems;"
  );
  const { allowed, blocked } = filterAllowlistedMatches(matches, "state\\.feedItems\\b");

  assert.equal(allowed.length, 0);
  assert.equal(blocked.length, 1);
});

test("does not allowlist setFeedItems writes", () => {
  const matches = parseSearchOutput("hooks/queries/use-feeds-data.ts:99:setFeedItems(items);");
  const { allowed, blocked } = filterAllowlistedMatches(matches, "setFeedItems\\(");

  assert.equal(allowed.length, 0);
  assert.equal(blocked.length, 1);
});

test("mixed output keeps only non-allowlisted violations", () => {
  const matches = parseSearchOutput(
    [
      "store/useFeedStore.ts:87:            delete state.feedItems;",
      "app/web/(no-header)/page.tsx:42:const feedItems = state.feedItems;",
    ].join("\n")
  );
  const { allowed, blocked } = filterAllowlistedMatches(matches, "state\\.feedItems\\b");

  assert.equal(allowed.length, 1);
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].file, "app/web/(no-header)/page.tsx");
});
