import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost:3000" },
    },
    setupFiles: ["./src/test/setup.ts"],
    server: {
      deps: {
        // next-intl's ESM build imports "next/server" without an extension; Node's
        // resolver rejects that because `next` has no exports map, so let Vite resolve it.
        inline: ["next-intl"],
      },
    },
  },
});
