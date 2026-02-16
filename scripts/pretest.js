const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const modules = ["utils/formatDuration.ts", "utils/url.ts"];
const additionalModules = [
  "hooks/queries/reader-view-validation.ts",
  "hooks/queries/feed-cache-utils.ts",
];

const pretestTsconfigPath = path.join(process.cwd(), "tsconfig.pretest.tmp.json");

try {
  const outDir = path.join(process.cwd(), "compiled-tests");
  // Remove directory cross‑platform
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Keep legacy output paths for utility tests (compiled-tests/formatDuration.js, compiled-tests/url.js).
  execSync(
    `npx tsc ${modules.join(" ")} --module commonjs --target es2017 --skipLibCheck true --outDir compiled-tests --rootDir utils`,
    { stdio: "inherit" }
  );

  fs.writeFileSync(
    pretestTsconfigPath,
    JSON.stringify(
      {
        extends: "./tsconfig.json",
        compilerOptions: {
          module: "commonjs",
          moduleResolution: "node",
          target: "es2017",
          skipLibCheck: true,
          noEmit: false,
          outDir: "compiled-tests",
          incremental: false,
        },
        include: [],
        files: additionalModules,
      },
      null,
      2
    )
  );

  execSync(`npx tsc -p ${pretestTsconfigPath}`, { stdio: "inherit" });
} catch (e) {
  console.error("Failed to compile test modules", e);
  process.exit(1);
} finally {
  fs.rmSync(pretestTsconfigPath, { force: true });
}
