import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.STANDALONE_E2E_PORT ?? 4174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: "./tests/e2e/standalone",
    timeout: 120_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [["html"], ["github"], ["list"]] : [["list"]],
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: {
        command: `cross-env VITE_ENABLE_TEST_BRIDGE=true vite --config vite.standalone.config.ts --host 127.0.0.1 --port ${port}`,
        url: `${baseURL}/standalone.html`,
        reuseExistingServer: !process.env.CI,
        cwd: process.cwd(),
        timeout: 120_000,
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
});
