// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\donth\\Documents\\toji_electron";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@opencode-ai/sdk", "electron-store"] })],
    build: {
      watch: {}
    },
    resolve: {
      conditions: ["import", "module", "node", "default"],
      alias: {
        "@opencode-ai/sdk": resolve(__electron_vite_injected_dirname, "node_modules/@opencode-ai/sdk/dist/index.js")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      watch: {}
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
