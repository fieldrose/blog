import eslintPluginAstro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    // Server-only Supabase modules may never be bundled into client islands.
    files: ["src/**/*.{ts,tsx,astro}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase/admin", "**/supabase/asUser"],
              message:
                "This module is server-only. Import it only from src/pages/api/** or other server code.",
            },
          ],
        },
      ],
    },
  },
  {
    // Server endpoints and server-only libs ARE allowed to use those modules.
    files: [
      "src/pages/api/**/*.ts",
      "src/lib/server/**/*.ts",
      "src/scripts/**/*.ts",
      "scripts/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  { rules: { "no-console": "error" } },
  {
    ignores: ["dist/**", ".astro/**", ".netlify/**", "public/pagefind/**"],
  },
];
