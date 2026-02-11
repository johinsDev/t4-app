# T4 App

Monorepo built with Turborepo, Bun, and Next.js.

## Monorepo structure

- `apps/web` — Next.js web application (App Router)
- `packages/ui` — Shared React component library
- `packages/typescript-config` — Shared TypeScript configs

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

## Code style

Biome handles all formatting and linting. Do not manually format code.

- Indent: tabs
- Line width: 100
- Import organization: automatic (Biome assist)
- Linting is disabled for `apps/web/components/ui/**` (shadcn generated components)

## Commit convention

Conventional commits enforced by commitlint via lefthook pre-commit hook.

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

Examples:
- `feat(web): add user authentication`
- `fix(ui): resolve button hover state`
- `chore: update dependencies`

## Git worktree workflow

Use git worktrees for parallel feature development:

```bash
# Create a new worktree for a feature branch
git worktree add ../t4-app-<branch> -b <branch>

# List active worktrees
git worktree list

# Remove a finished worktree
git worktree remove ../t4-app-<branch>
```

Each worktree gets its own directory at `../t4-app-<branch>`. Run `bun install` after creating a new worktree.
