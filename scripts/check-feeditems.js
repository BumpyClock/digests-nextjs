#!/usr/bin/env node

/**
 * CI Guardrail Script - Detect state.feedItems Usage
 *
 * This script fails the build if any code attempts to access state.feedItems
 * during the React Query migration. This enforces the architectural constraint
 * that all feed data must come from React Query, not Zustand store.
 */

const { execSync } = require('child_process');
const _path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const PROHIBITED_PATTERNS = [
  {
    pattern: 'state\\.feedItems\\b',
    message: 'Direct access to state.feedItems is prohibited',
    suggestion: 'Use React Query useFeedsData() hook or component props instead'
  },
  {
    pattern: 'store\\.feedItems\\b',
    message: 'Direct access to store.feedItems is prohibited',
    suggestion: 'Use React Query useFeedsData() hook or component props instead'
  },
  {
    pattern: 'setFeedItems\\(',
    message: 'Writing to feedItems in store is prohibited',
    suggestion: 'React Query manages feed data automatically - remove this write'
  }
];

function runChecks() {
  let hasViolations = false;

  console.log(`${YELLOW}🔍 Running React Query migration guardrails...${RESET}\n`);

  for (const { pattern, message, suggestion } of PROHIBITED_PATTERNS) {
    try {
      // Use ripgrep for fast searching with line numbers
      const result = execSync(`rg -n "${pattern}" . --type ts --type js -g "*.tsx" -g "*.jsx" --glob "!node_modules" --glob "!.next" --glob "!.git"`, {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      if (result.trim()) {
        hasViolations = true;
        console.error(`${RED}❌ MIGRATION VIOLATION: ${message}${RESET}`);
        console.error(`${YELLOW}💡 ${suggestion}${RESET}\n`);
        console.error(`Found violations:\n${result}`);
        console.error('---\n');
      }
    } catch (error) {
      // ripgrep exits with status 1 when no matches found - this is good
      if (error.status === 1) {
        console.log(`${GREEN}✅${RESET} No violations found for: ${pattern}`);
      } else {
        console.error(`${RED}❌ Error running pattern check for "${pattern}":${RESET}`, error.message);
        hasViolations = true;
      }
    }
  }

  if (hasViolations) {
    console.error(`\n${RED}❌ BUILD FAILED - Migration violations detected!${RESET}`);
    console.error(`${YELLOW}📖 See .claude/docs/architecture_migration.md for migration guidance${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All migration guardrails passed - build can proceed${RESET}`);
    process.exit(0);
  }
}

// Allow fallback to basic grep if ripgrep not available
function checkRipgrepAvailability() {
  try {
    execSync('rg --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (!checkRipgrepAvailability()) {
  console.warn(`${YELLOW}⚠️  ripgrep not found, falling back to basic grep${RESET}`);

  // Fallback implementation with regular grep
  let hasViolations = false;

  for (const { pattern, message, suggestion } of PROHIBITED_PATTERNS) {
    try {
      const result = execSync(`grep -r -n "${pattern.replace(/\\\\b/g, '')}" app/ components/ hooks/ store/ utils/ types/ 2>/dev/null || true`, {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      if (result.trim()) {
        hasViolations = true;
        console.error(`${RED}❌ ${message}${RESET}`);
        console.error(`${YELLOW}💡 ${suggestion}${RESET}\n`);
        console.error(`Found violations:\n${result}\n`);
      }
    } catch (error) {
      if (error.status === 1) {
        console.log(`${GREEN}✅${RESET} No violations found for: ${pattern}`);
      } else {
        console.error(`${RED}❌ Error:${RESET}`, error.message);
        hasViolations = true;
      }
    }
  }

  if (hasViolations) {
    console.error(`\n${RED}❌ BUILD FAILED - Migration violations detected!${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All migration guardrails passed${RESET}`);
    process.exit(0);
  }
} else {
  runChecks();
}
