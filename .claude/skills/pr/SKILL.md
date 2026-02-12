---
name: pr
description: Create a pull request with a well-structured description
argument-hint: [base-branch]
disable-model-invocation: true
---

# /pr — Create a pull request

Create a PR from the current branch to the base branch (default: `main`). Ensures all changes are committed and pushed, then opens a well-described PR via `gh`.

## Arguments

- `$0` — Base branch to target (default: `main`)

## Steps

1. **Verify branch**: Run `git branch --show-current`. Abort if on `main` — PRs should come from feature branches.
2. **Check for uncommitted changes**: Run `git status`. If there are uncommitted changes, run `/ship` first to commit and push them.
3. **Ensure remote is up to date**: Check if the local branch is ahead of the remote with `git status -sb`. If ahead, run `git push -u origin <current-branch>`.
4. **Gather context**: Run these in parallel:
   - `git log --oneline $(git merge-base HEAD origin/${base})..HEAD` — all commits in this branch
   - `git diff origin/${base}...HEAD --stat` — files changed summary
   - `git diff origin/${base}...HEAD` — full diff for analysis
5. **Create the PR**: Analyze ALL commits and the full diff (not just the latest commit) and create the PR:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary

<2-5 bullet points describing what changed and why>

## Changes

<Markdown table or list of key files changed with brief purpose>

## Test plan

<Bulleted checklist of verification steps — include checks already run>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## PR title guidelines

- Use conventional commit format: `type(scope): description`
- Keep under 70 characters
- Use imperative mood: "add", "fix", "update" — not "added", "fixes"

## PR body guidelines

- **Summary**: Focus on the "why", not just the "what". Each bullet should be a meaningful change, not a file listing.
- **Changes**: Group related file changes together. Use a table for many files, a list for few.
- **Test plan**: Include checks that were already run (type-check, lint, knip) as checked items. Add manual verification steps as unchecked items.

## Important

- Never create a PR if there are no commits ahead of the base branch.
- Always use `gh pr create`, never open URLs manually.
- If a PR already exists for this branch, inform the user and show the URL with `gh pr view --web`.
