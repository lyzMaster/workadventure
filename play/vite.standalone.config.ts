import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
    server: {
        host: "0.0.0.0",
        port: 5173,
        hmr: false,
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
    },
    publicDir: "public",
    build: {
        outDir: "dist/standalone",
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(process.cwd(), "standalone.html"),
        },
    },
    plugins: [
        disableViteClientWebSocket(),
        removeViteClient(),
        tailwindcss(),
        mediapipeWorkaround(),
        nodePolyfills({
            include: ["events", "buffer"],
            globals: { Buffer: true },
        }),
        svelte({ preprocess: vitePreprocess() }),
        Icons({ compiler: "svelte" }),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            events: "events",
            "@wa-icons": fileURLToPath(new URL("./src/front/Components/Icons.ts", import.meta.url)),
            "@wa-modals": fileURLToPath(new URL("./src/front/Components/Modal/modalManager.ts", import.meta.url)),
        },
    },
    optimizeDeps: {
        exclude: ["svelte-modals", "@mediapipe/selfie_segmentation"],
        esbuildOptions: { define: { global: "globalThis" } },
    },
});

function disableViteClientWebSocket(): Plugin {
    return {
        name: "standalone-disable-vite-client-websocket",
        configureServer(server) {
            server.middlewares.use("/@vite/client", (_request, response) => {
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/javascript");
                response.end(`
                    export const createHotContext = () => ({
                        accept() {}, prune() {}, dispose() {}, decline() {}, invalidate() {}, on() {}, off() {}, send() {}
                    });
                    const styles = new Map();
                    export const updateStyle = (id, content) => {
                        let style = styles.get(id);
                        if (!style) {
                            style = document.createElement("style");
                            style.setAttribute("data-vite-dev-id", id);
                            document.head.appendChild(style);
                            styles.set(id, style);
                        }
                        style.textContent = content;
                    };
                    export const removeStyle = (id) => {
                        styles.get(id)?.remove();
                        styles.delete(id);
                    };
                    export const injectQuery = (url) => url;
                    export class ErrorOverlay {}
                `);
            });
        },
    };
}

function removeViteClient() {
    return {
        name: "standalone-remove-vite-client",
        transformIndexHtml: {
            order: "post" as const,
            handler(html: string) {
                return html.replace(/<script type="module" src="\/@vite\/client"><\/script>/, "");
            },
        },
    };
}

function mediapipeWorkaround() {
    return {
        name: "standalone-mediapipe-workaround",
        load(id: string) {
            const filePath = id.split("?")[0];
            if (path.basename(filePath) !== "selfie_segmentation.js" || !fs.existsSync(filePath)) {
                return null;
            }
            return {
                code: `${fs.readFileSync(filePath, "utf-8")}\nexport const SelfieSegmentation = globalThis.SelfieSegmentation;\n`,
            };
        },
    };
}
