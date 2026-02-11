# /verify — Run all code checks

Run the full verification suite to ensure code quality.

## Steps

Run these checks in order and report results:

1. **Lint**: `bun run lint` — Biome linting via Turborepo
2. **Format check**: `bun run format:check` — Biome format + lint check (no write)
3. **Type check**: `bun run check-types` — TypeScript type checking via Turborepo
4. **Unused code**: `bun run knip` — Detect unused exports, dependencies, and files

## On failure

If any check fails, report the specific errors and suggest fixes. Do not proceed to the next check until the current one is addressed, unless the user asks to continue.
