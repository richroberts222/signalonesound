# Signal One Git Workflow Rules

## Purpose

This document defines how Claude Code must use Git and GitHub while developing Signal One.

The goal is to maintain a clean, understandable Git history and working tree while allowing Claude to develop features independently and prepare Pull Requests for human review.

---

# 1. Main Branch Protection

`main` is the protected integration branch.

Claude MUST NOT:

* Commit directly to `main`
* Push directly to `main`
* Merge Pull Requests into `main`
* Approve its own Pull Requests
* Bypass required GitHub checks or branch protections
* Modify branch protection settings to bypass this workflow

**The human developer owns the decision to merge changes into `main`.**

Claude may prepare everything necessary for a Pull Request, but the final merge into `main` is performed manually by the human developer on GitHub.

---

# 2. Branches

Significant development work must occur on a dedicated branch.

Branches should be created from the appropriate current base branch, normally `main` unless the task explicitly belongs to another development branch.

Branch names should clearly identify the work being performed.

When work originates from a GitHub Issue, prefer a branch name that references the Issue when practical.

For example:

```text
claude/issue-12-add-revival-search
```

or another clear project-appropriate naming convention.

Do not create unnecessary branches.

**One issue = one canonical feature branch and one PR.** Once a PR exists for an issue, its branch is canonical and all further work happens there; never create a second implementation branch for the same issue. Before modifying files in continued work, verify the current branch, the expected canonical branch, the issue/PR, and that history is available; if they disagree, stop and report. Blocked Git operations fail fast and are not retried. See `/docs/issues.md`.

---

# 3. One Work Item Per Branch

A branch should represent one logical piece of work.

Avoid combining unrelated features, fixes, documentation changes, or experiments into the same branch.

If unrelated changes are discovered while working:

1. Determine whether they are necessary for the current task.
2. If they are not necessary, do not casually include them.
3. Preserve or isolate unrelated work when practical.
4. Ask for clarification when necessary.

The goal is for each Pull Request to have a clear purpose.

---

# 4. Before Starting Work

Before modifying code, Claude should inspect the current Git state.

Claude should determine:

* Current branch
* Working-tree status
* Current commits
* Relevant existing branches
* Whether uncommitted changes already exist

Claude MUST NOT casually overwrite, discard, reset, or remove existing user changes.

If the working tree contains changes that Claude did not create, Claude should identify them before proceeding when they could be affected by the requested work.

---

# 5. Keep the Working Tree Clean

Claude should maintain a clean and understandable working tree.

After completing a logical unit of work:

* Intended changes should be committed.
* Temporary files should be removed.
* Debugging artifacts should not remain.
* Generated files should only remain when they belong in the project.
* Accidental changes should be reverted rather than committed.
* Secrets, credentials, and local environment files must never be committed.

Before creating a Pull Request, Claude should verify the working tree and ensure that all intended changes are accounted for.

---

# 6. Commits

Commits should represent logical completed changes.

Commit messages should be:

* Short
* Clear
* Specific
* Based on the actual changes

Do not create meaningless messages such as:

```text
updates
changes
stuff
fix
test
```

The `/commit` Claude command may be used to generate an appropriate commit message and commit the current intended changes.

Claude should not commit unrelated user changes.

---

# 7. Commit Frequency

Claude may create multiple commits when they represent meaningful logical stages of work.

Do not create unnecessary commits for every tiny change.

Do not deliberately accumulate a large number of meaningless commits simply to show development activity.

The final Pull Request should have a clear and understandable history.

If the project later establishes specific commit-history or squashing rules, those rules belong here.

---

# 8. Synchronizing With Main

Before creating a Pull Request, Claude should determine whether the working branch is sufficiently current with its base branch.

If the branch is significantly behind or conflicts are likely, Claude should update the branch when appropriate.

Claude may resolve merge conflicts on its own development branch when the correct resolution is clear.

Claude MUST NOT resolve conflicts by silently discarding existing work.

If a conflict cannot be resolved confidently, Claude should stop and explain the conflict.

---

# 9. Pushing Changes

Claude may push its development branch to GitHub.

Claude should push changes when:

* A logical development stage is complete
* A Pull Request needs to be created or updated
* The human developer needs to inspect the branch
* A Vercel Preview needs to be generated
* GitHub checks need to run

Claude should not repeatedly push meaningless intermediate changes.

---

# 10. Pull Requests

When the requested work is complete, Claude may create a Pull Request targeting the appropriate base branch.

For normal feature work, the target should be:

```text
main
```

Before creating the Pull Request, Claude should:

1. Verify the intended changes.
2. Verify the working tree.
3. Commit outstanding intended changes.
4. Push the branch.
5. Run appropriate available validation.
6. Confirm the branch is ready for review.
7. Create the Pull Request.
8. Provide a concise summary of what changed.
9. Report relevant validation results.

The Pull Request should clearly communicate:

* What was changed
* Why it was changed
* Important implementation details
* Validation performed
* Any known limitations or remaining issues

---

# 11. Claude Must Stop at the Pull Request

Creating the Pull Request is the end of Claude's normal Git development workflow.

After creating the Pull Request, Claude MUST NOT automatically merge it.

The expected workflow is:

```text
Claude develops
      ↓
Claude validates
      ↓
Claude commits
      ↓
Claude pushes branch
      ↓
Claude creates Pull Request
      ↓
Human reviews
      ↓
Human reviews Vercel Preview
      ↓
Human decides whether to merge
      ↓
Human merges Pull Request
```

Claude may continue working on the Pull Request if the human requests changes or if review feedback is provided. Further `@claude` implementation requests should be made from the PR, not the original issue.

---

# 12. Pull Request Review Changes

If the human requests changes to an existing Pull Request, Claude should:

1. Continue working on the existing branch.
2. Read the review/request carefully.
3. Make the requested changes.
4. Run appropriate validation.
5. Commit the changes.
6. Push the updated branch.
7. Report the changes.

Claude should not create an unnecessary second Pull Request for changes to the same work item.

---

# 13. Vercel Preview

When a Pull Request is connected to Vercel, the resulting Preview deployment may be used for human review.

Claude should consider the Preview deployment part of the review workflow.

Claude may inspect or report relevant build/deployment results when available.

A successful Vercel deployment does not mean the Pull Request is automatically approved or ready to merge.

The human developer retains final approval.

---

# 14. Local Branch Inspection

The human developer may check out Claude's branch locally to inspect the actual code.

Claude should not assume that creating a Pull Request means the human will only review the GitHub interface.

The branch should therefore remain usable and reproducible locally.

Claude should avoid leaving the repository in a confusing state that makes branch inspection difficult.

---

# 15. Failed Validation

Before creating or updating a Pull Request, Claude should run the appropriate validation available for the project.

This may include:

* Type checking
* Linting
* Build verification
* Relevant existing tests

At this stage, this rule concerns **Claude's development-time validation**, not the establishment of Signal One's complete automated testing architecture.

If validation fails:

1. Determine whether the failure was caused by the current changes.
2. Fix failures caused by the current work when practical.
3. Re-run the relevant validation.
4. Do not modify or disable validation merely to make it pass.
5. Report unresolved failures honestly.

---

# 16. Existing User Changes

User-created changes are protected.

Claude MUST NOT use destructive Git operations merely to obtain a clean working tree.

Do not use commands such as:

```text
git reset --hard
git clean -fd
git checkout -- .
```

or equivalent destructive operations unless the human explicitly requests the destructive operation.

If existing changes interfere with the requested work, explain the situation and determine a safe approach.

---

# 17. Branch Cleanup

Claude may clean up branches that it created when appropriate, but should not delete branches that may contain important user work without confirmation.

The normal lifecycle is:

```text
Issue
  ↓
Development branch
  ↓
Commits
  ↓
Pull Request
  ↓
Human review
  ↓
Human merge
  ↓
Branch cleanup when appropriate
```

The human developer remains responsible for deciding when merged branches should be retained or deleted if there is any uncertainty.

---

# 18. Git History Integrity

Do not rewrite shared branch history unnecessarily.

Avoid force-pushing unless specifically required and safe.

Never force-push `main`.

If history rewriting becomes necessary on a development branch, Claude should understand the consequences before doing so.

---

# 19. GitHub Issues

When development begins from a GitHub Issue, Claude should use the Issue as the work-item reference.

Where practical:

* Reference the Issue from the branch
* Reference the Issue from commits or Pull Requests when appropriate
* Keep the Pull Request focused on the Issue's requested work

Do not close or alter Issues unnecessarily.

If GitHub automatically associates the Pull Request with the Issue, allow the normal GitHub behavior to handle that relationship.

---

# 20. Merge Authority

Claude has **no merge authority**.

This rule is explicit even if GitHub or Claude Code technically provides a mechanism capable of merging Pull Requests.

Claude must stop after preparing the Pull Request for human review.

Only the human developer decides:

* Whether the Pull Request is acceptable
* Whether it should be merged
* When it should be merged
* Whether it should be closed instead

---

# 21. `/commit` Command

The `/commit` command should follow these rules.

It should:

1. Inspect the current changes.
2. Determine which changes are intended for the current work.
3. Generate a short, accurate commit message.
4. Commit the intended changes.
5. Leave unrelated user changes untouched.

It must not push to `main` or merge branches.

---

# 22. Branch Completion

When a development task is complete, Claude should leave the branch in a state suitable for Pull Request review.

The final state should have:

* Intended changes committed
* Working tree clean, except for explicitly preserved user changes
* Appropriate validation completed
* Branch pushed to GitHub
* Pull Request created or ready to create
* No automatic merge performed

---

# 23. Guiding Principle

Git should make the development process **safer and easier to understand**, not more complicated.

The preferred workflow is:

> **Issue → Branch → Develop → Validate → Commit → Push → Pull Request → Human Review → Human Merge**

Claude is responsible for maintaining the branch and preparing the Pull Request.

**The human developer owns `main`.**
