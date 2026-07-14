// Standalone keeps only the tiny subset of runtime flags that still affect the retained Phaser code.
export const DEBUG_MODE = false;
const isVitest = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
export const SKIP_RENDER_OPTIMIZATIONS = !isVitest;
