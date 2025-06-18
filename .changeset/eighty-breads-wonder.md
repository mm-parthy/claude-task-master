---
"task-master-ai": patch
---

Added comprehensive tag-aware expand tests to the E2E suite:

- Introduce a new `feature-expand` tag for testing.
- Add tasks under `feature-expand` and capture their IDs dynamically.
- Verify tag counts before and after:
  - `expand --tag`
  - `expand --tag --force`
  - `expand --tag --all`
- Ensure no existing tags are corrupted and subtasks are created as expected.
- Reordered the new tests to run before any task-removal steps.
- Fixed file-path checks for `.taskmaster/config.json` and
  `.taskmaster/tasks/tasks.json`.