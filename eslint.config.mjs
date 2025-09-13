import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // React Query Migration Guardrails
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='state'][property.name='feedItems']",
          message: "🚫 Migration Violation: Direct access to state.feedItems is prohibited. Use React Query useFeedsData() hook or component props instead."
        },
        {
          selector: "MemberExpression[object.name='store'][property.name='feedItems']",
          message: "🚫 Migration Violation: Direct access to store.feedItems is prohibited. Use React Query useFeedsData() hook or component props instead."
        },
        {
          selector: "CallExpression[callee.name='setFeedItems']",
          message: "🚫 Migration Violation: Writing to feedItems in store is prohibited. React Query manages feed data automatically - remove this write."
        }
      ]
    }
  }
];

export default eslintConfig;
