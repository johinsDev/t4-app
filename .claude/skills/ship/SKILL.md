---
name: ship
description: Commit and push changes with a conventional commit message
disable-model-invocation: true
---

# /ship — Commit and push changes

Ship the current changes: stage, commit with a conventional commit message, and push.

## Steps

1. **Check status**: Run `git status` to see what's changed.
2. **Stash unstaged changes** (if needed): If there are both staged and unstaged changes, stash the unstaged ones with `git stash --keep-index`.
3. **Sync with upstream**: Run `git fetch origin && git rebase origin/main` (or the current branch's upstream) to stay up to date. If in a worktree, detect the correct branch automatically.
4. **Stage all changes**: Run `git add -A` to stage everything (unless the user specified particular files).
5. **Create a conventional commit**: Analyze the staged diff (`git diff --cached`) and write a commit message following the conventional commits format: `type(scope): description`. Choose the appropriate type (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`). Add a body if the change is non-trivial.
6. **Push**: Run `git push` (or `git push -u origin <branch>` if no upstream is set).
7. **Restore stash**: If changes were stashed in step 2, run `git stash pop`.

## Worktree awareness

If working inside a git worktree (not the main working tree), detect the current branch with `git branch --show-current` and push to that branch. Do not assume `main`.

## Important

- Always use conventional commit format — lefthook will reject non-conforming messages.
- Never force push unless explicitly asked.
- If rebase has conflicts, stop and ask the user for help.
