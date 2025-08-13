import test from 'node:test';
import assert from 'node:assert';
import { normalizeFeedUrl } from '../compiled-tests/url-helpers.js';

test('removes protocol and trailing slash', () => {
  assert.strictEqual(normalizeFeedUrl('https://example.com/'), 'example.com');
});

test('removes protocol regardless of case', () => {
  assert.strictEqual(normalizeFeedUrl('HTTP://Example.com'), 'Example.com');
});

test('normalizes multiple slashes', () => {
  assert.strictEqual(normalizeFeedUrl('https://example.com//a//b'), 'example.com/a/b');
});

test('handles null input', () => {
  assert.strictEqual(normalizeFeedUrl(null), '');
});
