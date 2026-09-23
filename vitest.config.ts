import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Hanya jalankan file di __tests__/, bukan scripts/ yang dijalankan via npx tsx
    include: ["__tests__/**/*.test.ts"],
    exclude: ["scripts/**", "node_modules/**", ".next/**"],

    // Node environment (bukan jsdom) — API route testing via direct handler calls
    environment: "node",

    // Global APIs: describe, it, expect, beforeAll, afterAll — tanpa import di setiap file
    globals: true,

    // Setup file: dijalankan sekali sebelum seluruh test suite
    globalSetup: "./__tests__/setup.ts",

    // Timeout per test 30 detik (DB calls bisa lambat)
    testTimeout: 30000,
    hookTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/prisma.ts",
        "**/*.d.ts",
        "**/__mocks__/**",
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
