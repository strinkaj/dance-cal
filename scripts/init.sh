#!/usr/bin/env bash
# Run once after cloning. Tells git to stop tracking local changes to
# attendance.json so your real data never gets accidentally committed.
git update-index --skip-worktree attendance.json
echo "✓ attendance.json is now skip-worktree'd — your local data stays private."
