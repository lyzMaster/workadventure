import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
        svelte({ preprocess: vitePreprocess() }),
        tsconfigPaths(),
    ],
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
