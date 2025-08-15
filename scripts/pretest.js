const { execSync } = require("child_process");
const modules = ["utils/formatDuration.ts", "utils/url-helpers.ts"];
try {
  execSync(`rm -rf compiled-tests && mkdir compiled-tests`);
  execSync(
    `npx tsc ${modules.join(" ")} --module commonjs --target es2017 --outDir compiled-tests`,
    { stdio: "inherit" },
  );
} catch (e) {
  console.error("Failed to compile test modules", e);
  process.exit(1);
}
