# Development Setup

## Initial setup

```bash
npm ci
npm run typecheck:standalone
cd play
npm run dev:standalone
```

The default local entry is `http://localhost:5173/standalone.html`. If port `5173` is occupied, Vite will print the
actual port it selected.
