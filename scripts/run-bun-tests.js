#!/usr/bin/env node

const { execSync } = require("node:child_process");

const TEST_COMMAND = "bun test ./tests";

try {
  execSync("bun --version", { stdio: "ignore" });
} catch (_error) {
  console.error(
    [
      "❌ Bun is not available in this environment.",
      "Run tests using Node fallback: npm run test:node",
      "Install Bun: https://bun.sh",
    ].join("\n")
  );
  process.exit(1);
}

try {
  execSync(TEST_COMMAND, {
    stdio: "inherit",
  });
} catch (_error) {
  process.exit(_error?.status || 1);
}
