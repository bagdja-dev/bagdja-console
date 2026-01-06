import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Ensure all imports are used
      "no-unused-vars": "off", // Turn off base rule as it conflicts with TypeScript version
      "@typescript-eslint/no-explicit-any": "warn",
      // Ensure proper type usage
      "@typescript-eslint/explicit-module-boundary-types": "off", // Can be too strict
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
]);

export default eslintConfig;
