import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { qeLlmPlugin } from "./server/qeLlm";

function localOcrAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const tesseractRequire = createRequire(require.resolve("tesseract.js"));
  const files = new Map([
    ["worker.min.js", require.resolve("tesseract.js/dist/worker.min.js")],
    ["core.wasm.js", tesseractRequire.resolve("tesseract.js-core/tesseract-core-lstm.wasm.js")],
    ["chi_sim.traineddata.gz", require.resolve("@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz")],
    ["eng.traineddata.gz", require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz")],
  ]);
  return {
    name: "qe-local-ocr-assets",
    configureServer(server) {
      server.middlewares.use("/qe-ocr", (request, response, next) => {
        const name = request.url?.split("?")[0].slice(1) ?? "";
        const path = files.get(name);
        if (!path) { next(); return; }
        response.setHeader("Content-Type", name.endsWith(".js") ? "text/javascript" : "application/octet-stream");
        response.end(readFileSync(path));
      });
    },
    generateBundle() {
      for (const [name, path] of files) {
        this.emitFile({ type: "asset", fileName: `qe-ocr/${name}`, source: readFileSync(path) });
      }
    },
  };
}

const appDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react(), localOcrAssets(), qeLlmPlugin(mode === "test" ? {} : loadEnv(mode, appDirectory, "QE_LLM_"))],
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
}));
