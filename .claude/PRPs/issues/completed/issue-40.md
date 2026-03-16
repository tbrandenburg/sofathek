---
issue: 40
title: Optimize thumbnail discovery performance for large video libraries
source: https://github.com/tbrandenburg/sofathek/issues/40#issuecomment-2706893572
created_at: 2026-03-14T12:08:00Z
status: archived
---

# Issue #40 Investigation Artifact Snapshot

This artifact was reconstructed from the GitHub investigation comment because the referenced
artifact file (`.ghar/issues/issue-40.md`) was not present in the repository.

## Root cause

`VideoService.findThumbnail()` performed sequential per-video filesystem existence checks
(`.jpg`, `.jpeg`, `.png`, `.webp`) during scan, causing O(n*4) filesystem calls.

## Applied plan

1. Add directory-level thumbnail scan cache with TTL.
2. Batch thumbnail discovery by directory.
3. Refactor `scanVideoDirectory()` to process videos in three phases.
4. Update metadata extraction to accept precomputed thumbnails.
5. Add unit tests for batch matching, caching, and error handling.

## Validation commands

```bash
cd backend && npm run type-check
cd backend && npm test -- --testPathPattern=videoService
cd backend && npm run lint
```
