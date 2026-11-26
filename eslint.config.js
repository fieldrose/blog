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
    // 仅服务端的 Supabase 模块不得被打包进客户端 island。
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
    // 服务端端点与仅服务端库可以使用上述模块。
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
  // 构建产物与第三方索引目录不参与 lint。
  {
    ignores: ["dist/**", ".astro/**", ".netlify/**", "public/pagefind/**"],
  },
];
