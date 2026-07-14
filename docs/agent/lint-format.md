# Linting & Formatting

```bash
npm run typecheck:standalone
npm test -- --run
npm run build:standalone
```

Notes:
- These are the authoritative standalone gates for this repo.
- There is no root Husky flow or legacy multi-service lint pipeline anymore.
- If you need targeted formatting, run package-local tooling directly, for example:

```bash
cd play
npx prettier --check .
```
