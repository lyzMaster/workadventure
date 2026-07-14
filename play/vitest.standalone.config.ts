import { defineConfig } from "vitest/config";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [svelte({ preprocess: vitePreprocess() }), tsconfigPaths()],
    test: {
        environment: "jsdom",
        globals: true,
        include: ["tests/front/Standalone/**/*.test.ts"],
        setupFiles: ["./tests/setup/vitest.setup.ts"],
    },
});
