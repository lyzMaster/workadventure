import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        include: ["tests/front/Standalone/CharacterRuntime.test.ts"],
        setupFiles: ["./tests/setup/vitest.setup.ts"],
    },
});
