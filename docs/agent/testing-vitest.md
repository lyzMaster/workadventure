# Testing (Vitest)

The authoritative unit test suite for this repo is the standalone Vitest config in `play/`.

## Run a single test once

```bash
cd play
npm test -- --run tests/front/Standalone/WorldCommand/WorldCommandGateway.test.ts
```

The current standalone config includes `tests/front/Standalone/**/*.test.ts` only.

## Watch mode

```bash
cd play
npm test tests/front/Standalone/WorldCommand/WorldCommandGateway.test.ts
```

## Conventions

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ClassName", () => {
  const createMockUser = (id: string): User => {
    /* ... */
  };

  describe("methodName", () => {
    it("should do X when Y", async () => {
      const result = await runtime.process(command);

      expect(result).toBe(true);
    });
  });
});
```

- Prefer behavior-focused assertions over implementation details.
- Use `vi.fn()` for mocks and `vi.useFakeTimers()` for deterministic time control.
- Restore mocks, timers, environment variables, and global state in `afterEach`.
- For bug fixes, add a regression test that fails for the original behavior.
- Do not weaken global timeouts to hide an unresolved race or missing readiness condition.
