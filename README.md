# T4 App

Monorepo built with [Turborepo](https://turborepo.dev/), [Bun](https://bun.sh/), and [Next.js](https://nextjs.org/).

## Getting started

```bash
bun install
bun run dev
```

The web app runs at [http://localhost:3001](http://localhost:3001).

## Monorepo structure

```
apps/
  web/                  → Next.js web application (App Router)
    components/ui/      → shadcn UI components
packages/
  typescript-config/    → Shared TypeScript configs
```

## Commands

```bash
bun run dev            # Start all apps in dev mode
bun run build          # Build all apps/packages
bun run lint           # Biome lint (via Turborepo)
bun run format         # Biome format (write)
bun run format:check   # Biome check (lint + format, no write)
bun run check-types    # TypeScript type checking (via Turborepo)
bun run knip           # Detect unused code/exports/dependencies
```

## Code quality

- **Formatting & linting** — [Biome](https://biomejs.dev/) (tabs, 100 line width, auto import organization)
- **Type checking** — TypeScript strict mode via Turborepo
- **Unused code detection** — [Knip](https://knip.dev/)
- **Commit convention** — [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint
- **Git hooks** — [Lefthook](https://github.com/evilmartians/lefthook) runs biome, type-check, and knip on pre-commit

### Commit format

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

## Tech stack

- **Runtime** — Bun
- **Framework** — Next.js 16 (App Router)
- **Styling** — Tailwind CSS v4
- **UI components** — shadcn/ui
- **API** — tRPC + TanStack Query

## AI tooling

This project includes configuration for AI-assisted development:

- **Claude Code** — `CLAUDE.md` with project conventions and commands
- **Cursor** — `.cursor/rules/` with project rules applied automatically
