import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.spec.ts", "test/**/*.spec.tsx"],
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  esbuild: {
    target: "es2022",
  },
  resolve: {
    alias: {
      "@": new URL("./src/", import.meta.url).pathname,
    },
  },
  // Ensure tsconfig paths work with vitest
  // You can also pass tsconfig explicitly
  // but Vitest will pick up tsconfig.vitest.json automatically via env var
});
