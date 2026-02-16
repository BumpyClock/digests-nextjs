#!/usr/bin/env node

/**
 * CI Guardrail Script - Detect state.feedItems Usage
 *
 * This script fails the build if any code attempts to access state.feedItems
 * during the React Query migration. This enforces the architectural constraint
 * that all feed data must come from React Query, not Zustand store.
 */

const { execSync } = require("child_process");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const PROHIBITED_PATTERNS = [
  {
    pattern: "state\\.feedItems\\b",
    message: "Direct access to state.feedItems is prohibited",
    suggestion: "Use React Query useFeedsData() hook or component props instead",
  },
  {
    pattern: "store\\.feedItems\\b",
    message: "Direct access to store.feedItems is prohibited",
    suggestion: "Use React Query useFeedsData() hook or component props instead",
  },
  {
    pattern: "setFeedItems\\(",
    message: "Writing to feedItems in store is prohibited",
    suggestion: "React Query manages feed data automatically - remove this write",
  },
];

const LEGACY_ALLOWED_MATCHES = [
  {
    prohibitedPattern: "state\\.feedItems\\b",
    file: "store/useFeedStore.ts",
    linePattern: /^\s*delete state\.feedItems;\s*$/,
  },
];

const GREP_TARGET_PATHS = ["app/", "components/", "hooks/", "store/", "utils/", "types/"];

const normalizeFilePath = (filePath) => filePath.replace(/\\/g, "/").replace(/^\.\//, "");

const toLiteralPattern = (pattern) => pattern.replace(/\\b/g, "").replace(/\\/g, "");

const parseSearchOutput = (result) => {
  if (!result || !result.trim()) {
    return [];
  }

  return result
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) {
        return null;
      }
      return {
        file: normalizeFilePath(match[1]),
        line: Number.parseInt(match[2], 10),
        text: match[3],
        raw: line,
      };
    })
    .filter(Boolean);
};

const isAllowlistedMatch = (match, prohibitedPattern) => {
  for (const allowedRule of LEGACY_ALLOWED_MATCHES) {
    if (allowedRule.prohibitedPattern !== prohibitedPattern) {
      continue;
    }

    if (!match.file.endsWith(allowedRule.file)) {
      continue;
    }

    if (!allowedRule.linePattern.test(match.text)) {
      continue;
    }

    return true;
  }

  return false;
};

const filterAllowlistedMatches = (matches, prohibitedPattern) => {
  const allowed = [];
  const blocked = [];

  for (const match of matches) {
    if (isAllowlistedMatch(match, prohibitedPattern)) {
      allowed.push(match);
    } else {
      blocked.push(match);
    }
  }

  return { allowed, blocked };
};

const runPatternCheck = (pattern, useRipgrep) => {
  if (useRipgrep) {
    try {
      const output = execSync(
        `rg -n "${pattern}" . --type ts --type js -g "*.tsx" -g "*.jsx" --glob "!node_modules" --glob "!.next" --glob "!.git"`,
        {
          encoding: "utf8",
          cwd: process.cwd(),
          stdio: "pipe",
        }
      );

      return { output };
    } catch (error) {
      // ripgrep exits with status 1 when no matches found - expected
      if (error.status === 1) {
        return { output: "" };
      }
      return { output: "", error };
    }
  }

  try {
    const literalPattern = toLiteralPattern(pattern);
    const output = execSync(
      `grep -R -nF ${JSON.stringify(literalPattern)} ${GREP_TARGET_PATHS.join(" ")}`,
      {
        encoding: "utf8",
        cwd: process.cwd(),
        stdio: "pipe",
      }
    );

    return { output };
  } catch (error) {
    // grep exits with status 1 when no matches found
    if (error.status === 1) {
      return { output: "" };
    }
    return { output: "", error };
  }
};

const runChecks = ({ useRipgrep = true } = {}) => {
  let hasViolations = false;

  console.log(`${YELLOW}🔍 Running React Query migration guardrails...${RESET}\n`);

  for (const { pattern, message, suggestion } of PROHIBITED_PATTERNS) {
    const { output, error } = runPatternCheck(pattern, useRipgrep);

    if (error) {
      console.error(
        `${RED}❌ Error running pattern check for "${pattern}":${RESET}`,
        error.message
      );
      hasViolations = true;
      continue;
    }

    const parsed = parseSearchOutput(output);
    const { allowed, blocked } = filterAllowlistedMatches(parsed, pattern);

    if (blocked.length > 0) {
      hasViolations = true;
      console.error(`${RED}❌ MIGRATION VIOLATION: ${message}${RESET}`);
      console.error(`${YELLOW}💡 ${suggestion}${RESET}\n`);
      console.error(`Found violations:\n${blocked.map((entry) => entry.raw).join("\n")}`);
      if (allowed.length > 0) {
        console.error(`${YELLOW}ℹ️  Suppressed allowlisted matches: ${allowed.length}${RESET}`);
      }
      console.error("---\n");
      continue;
    }

    if (allowed.length > 0) {
      console.log(
        `${GREEN}✅${RESET} No violations found for: ${pattern} (${allowed.length} allowlisted)`
      );
    } else {
      console.log(`${GREEN}✅${RESET} No violations found for: ${pattern}`);
    }
  }

  return { hasViolations };
};

// Allow fallback to basic grep if ripgrep not available
function checkRipgrepAvailability() {
  try {
    execSync("rg --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const main = () => {
  const hasRipgrep = checkRipgrepAvailability();
  if (!hasRipgrep) {
    console.warn(`${YELLOW}⚠️  ripgrep not found, falling back to basic grep${RESET}`);
  }
  const { hasViolations } = runChecks({ useRipgrep: hasRipgrep });

  if (hasViolations) {
    console.error(`\n${RED}❌ BUILD FAILED - Migration violations detected!${RESET}`);
    console.error(
      `${YELLOW}📖 See .claude/docs/architecture_migration.md for migration guidance${RESET}`
    );
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All migration guardrails passed - build can proceed${RESET}`);
    process.exit(0);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  LEGACY_ALLOWED_MATCHES,
  PROHIBITED_PATTERNS,
  checkRipgrepAvailability,
  filterAllowlistedMatches,
  isAllowlistedMatch,
  parseSearchOutput,
  runChecks,
};
