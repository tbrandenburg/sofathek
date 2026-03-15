# Frontend E2E Test Strategy

This test suite uses three tiers to balance speed and real-world coverage.

## 1) Mocked tests

- File: `youtube-download/full-workflow.spec.ts`
- Purpose: Fast UI workflow verification with mocked API responses
- Backend required: No
- Best for: UI states, rendering, and form interaction behavior

## 2) Integration tests

- File: `youtube-download/integration.spec.ts`
- Purpose: Frontend-backend integration against the live backend API
- Backend required: Yes (`http://localhost:3010`)
- External YouTube dependency: No (`YOUTUBE_DL_SKIP_DOWNLOAD=true`)
- Best for: API contract, queue behavior, and error propagation to UI

## 3) Real-world tests

- File: `youtube-download/real-world.spec.ts`
- Purpose: Full end-to-end verification with real YouTube downloads
- Backend required: Yes
- External YouTube dependency: Yes
- Best for: production-like workflow validation
