import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Hanya jalankan file di __tests__/, bukan scripts/ yang dijalankan via npx tsx
    include: ["__tests__/**/*.test.ts"],
    exclude: ["scripts/**", "node_modules/**", ".next/**", ".next-a/**", ".next-b/**"],

    // Node environment (bukan jsdom) — API route testing via direct handler calls
    environment: "node",

    // Tes integrasi berbagi satu DB (tabel themes, rate_limit_counters) dan direktori data/drafts.
    // File tes dijalankan berurutan agar mutasi satu tes tidak bocor ke tes lain.
    fileParallelism: false,

    // Global APIs: describe, it, expect, beforeAll, afterAll — tanpa import di setiap file
    globals: true,

    // next-auth mengimpor "next/server" tanpa ekstensi; harus diproses Vite agar tes sesi JWT nyata dapat berjalan.
    server: { deps: { inline: ["next-auth"] } },

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
      // Lantai di bawah angka terukur (2026-09-30: lines 21.8, functions 43.9, branches 50.1).
      // Naikkan bertahap seiring tes baru; CI menjalankan --coverage sehingga ambang ini ditegakkan.
      thresholds: {
        lines: 21,
        functions: 43,
        branches: 49,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
