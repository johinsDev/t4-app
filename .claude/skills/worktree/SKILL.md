# /worktree — Manage git worktrees

Create, list, and remove git worktrees for parallel feature development.

## Commands

### Create a new worktree

```bash
git worktree add ../t4-app-<branch> -b <branch>
```

After creating, run `bun install` in the new worktree directory to install dependencies.

### List worktrees

```bash
git worktree list
```

### Remove a worktree

```bash
git worktree remove ../t4-app-<branch>
```

## When to use worktrees

- **Parallel features**: Work on multiple features simultaneously without stashing
- **Code review**: Check out a PR branch without disrupting your current work
- **Hotfixes**: Quickly create a fix branch while keeping your feature work intact
- **Testing**: Run different branches side-by-side

## Workflow

1. Ask the user what they want to do (create, list, or remove)
2. For creation, ask for the branch name if not provided
3. Create the worktree at `../t4-app-<branch>`
4. Run `bun install` in the new worktree
5. Inform the user they can open the new worktree directory in their editor
