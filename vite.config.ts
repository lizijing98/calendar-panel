import vue from "@vitejs/plugin-vue";
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { defineConfig, type PluginOption } from "vite";

const rootDir = process.cwd();
const externalModules = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
];

function obsidianAssets(mode: string): PluginOption {
  const assetFiles = ["manifest.json"];

  return {
    name: "obsidian-assets",
    apply: "build",

    buildStart() {
      for (const fileName of assetFiles) {
        this.addWatchFile(resolve(rootDir, fileName));
      }
    },

    generateBundle() {
      for (const fileName of assetFiles) {
        this.emitFile({
          type: "asset",
          fileName,
          source: readFileSync(resolve(rootDir, fileName)),
        });
      }

      if (mode === "development") {
        this.emitFile({
          type: "asset",
          fileName: ".hotreload",
          source: "",
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: rootDir,
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      mode === "development" ? "development" : "production",
    ),
  },
  plugins: [vue(), obsidianAssets(mode)],
  publicDir: false,
  build: {
    outDir: resolve(rootDir, "dist"),
    emptyOutDir: true,
    target: "es2021",
    sourcemap: mode === "development" ? "inline" : false,
    minify: mode === "development" ? false : "oxc",
    lib: {
      entry: resolve(rootDir, "src/main.ts"),
      formats: ["cjs"],
      cssFileName: "styles",
    },
    rollupOptions: {
      external: externalModules,
      output: {
        entryFileNames: "main.js",
        exports: "default",
      },
    },
  },
}));
