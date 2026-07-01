import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, "src");

function getHtmlInputs() {
  const inputs = {
    main: path.resolve(projectRoot, "index.html"),
  };

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const htmlPath = path.resolve(srcDir, entry.name, "index.html");
    if (fs.existsSync(htmlPath)) {
      inputs[entry.name] = htmlPath;
    }
  }

  return inputs;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: getHtmlInputs(),
    },
  },
});
