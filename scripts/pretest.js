const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const modules = ["utils/formatDuration.ts", "utils/url.ts"];

try {
  const outDir = path.join(process.cwd(), "compiled-tests");
  // Remove directory cross‑platform
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  execSync(
    `npx tsc ${modules.join(" ")} --module commonjs --target es2017 --skipLibCheck true --outDir compiled-tests`,
    { stdio: "inherit" }
  );
} catch (e) {
  console.error("Failed to compile test modules", e);
  process.exit(1);
}
