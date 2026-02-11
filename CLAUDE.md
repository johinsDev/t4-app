# T4 App

Monorepo built with Turborepo, Bun, and Next.js.

## Monorepo structure

- `apps/web` — Next.js web application (App Router)
  - `components/ui/` — shadcn UI components
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

## Database (Drizzle + Turso)

All database code lives in `apps/web/db/`.

- **ORM**: Drizzle ORM with `@libsql/client` (supports both Turso remote and local SQLite)
- **Schema**: Define tables in `db/schema/<table>.ts`, re-export from `db/schema/index.ts`
- **Repositories**: Create repository files in `db/repositories/<table>.ts`, re-export from `db/repositories/index.ts`
- **Naming**: Use plural snake_case for table names (`posts`, `user_sessions`), camelCase for columns

### DB commands (run from `apps/web/`)

```bash
bun run db:generate    # Generate migrations from schema changes
bun run db:migrate     # Run pending migrations
bun run db:push        # Push schema directly (dev only, no migration files)
bun run db:studio      # Open Drizzle Studio GUI
```

### Environment variables

Set in `apps/web/.env.local` (gitignored):
- `DATABASE_URL` — `file:local.db` for local dev, `libsql://...` for Turso
- `DATABASE_AUTH_TOKEN` — only needed for Turso remote

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
