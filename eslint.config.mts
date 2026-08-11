import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores, defineConfig } from "eslint/config";

export default defineConfig(
  globalIgnores([
    "node_modules",
    "dist",
    "vite.config.ts",
    "version-bump.mjs",
    "versions.json",
    "main.js",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.mts",
            "manifest.json",
            "scripts/*.mjs",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"],
      },
    },
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
    },
  },
  {
    files: ["src/moment.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
);
