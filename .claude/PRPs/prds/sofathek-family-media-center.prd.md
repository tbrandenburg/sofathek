# Sofathek - Family-Safe Media Center

## Problem Statement

Families seeking to provide safe media consumption for their children face the problem of uncontrolled access to inappropriate content on platforms like YouTube, where algorithmic recommendations can expose children to harmful material. The cost of not solving this is continued exposure to unsuitable content, loss of parental control, and the inability to create a safe, governed media environment for children.

## Evidence

- User statement: "Children have full Youtube available with non-children videos. We would like to have a governed video platform"
- User concern: "Big players do not care about children's health"
- Market observation: "Internet gets more and more full with unwanted rubbish content"
- User goal: "When we as a family only consume video by this platform" (complete replacement of YouTube)

## Proposed Solution

We're building Sofathek, a self-hosted family media center that allows parents to curate and download specific YouTube content into a private, Netflix-like interface. Rather than fighting YouTube's algorithms, we create a completely controlled environment where only parent-approved content exists, eliminating exposure to inappropriate material while maintaining access to quality educational and entertainment content.

## Key Hypothesis

We believe **a curated, parent-controlled media server with YouTube download capabilities** will **solve parental control concerns around inappropriate content exposure** for **families with children at home**.
We'll know we're right when **the family completely blocks YouTube access and exclusively uses Sofathek for video consumption**.

## What We're NOT Building

- **A second YouTube** - We're not creating a content platform or recommendation engine
- **Multi-family/cloud service** - This is exclusively for single-family, home network use
- **External user access** - No support for users outside the family/home network
- **Complex authentication** - Simple single-family profile system only
- **Content discovery** - Parents manually curate all content through YouTube URL downloads

---

## Users & Context

**Primary User**
- **Who**: Tech-savvy parent in a family household with children
- **Current behavior**: Blocks YouTube entirely or struggles with inadequate parental controls
- **Trigger**: Need to provide safe, entertaining/educational video content to children
- **Success state**: Children have access to curated, appropriate video content in a Netflix-like interface

**Job to Be Done**
When we want to provide video entertainment to our children, I want to curate and control exactly what content they can access, so I can feel safe knowing they won't encounter inappropriate material.

**Non-Users**
- External families or users outside the home network
- Single individuals without children
- Families comfortable with existing YouTube parental controls
- Users seeking a content discovery or social media platform

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | YouTube video download via yt-dlp | Core content acquisition mechanism |
| Must | Netflix-like video library interface | Familiar, child-friendly browsing experience |
| Must | Basic video streaming with HTML5 player | Essential playback functionality |
| Must | Docker containerization | Easy deployment constraint requirement |
| Should | Thumbnail generation and metadata extraction | Enhanced browsing experience |
| Should | Dark/light theme toggle | Modern UI expectation |
| Should | Mobile responsive design | Multi-device family access |
| Could | View count statistics | Basic usage insights |
| Could | Admin interface for content management | Content lifecycle management |
| Won't | User authentication/multiple profiles | Single-family use case, adds complexity |
| Won't | Content recommendation engine | Explicitly avoiding algorithm-based discovery |

### MVP Scope

**Phase 1 Core Features:**
- YouTube URL input and download (single video)
- Basic video library grid view
- HTML5 video streaming
- Docker deployment setup
- File system-based storage

### User Flow

**Critical Path - Parent Curates Content:**
1. Parent finds appropriate YouTube video
2. Parent enters URL in Sofathek admin interface
3. System downloads and processes video (thumbnail, metadata)
4. Video appears in family library grid
5. Children browse and watch curated content safely

---

## Technical Approach

**Feasibility**: HIGH

**Architecture Notes**
- **Frontend**: React 18+ with TypeScript and Shadcn/ui design system
- **Backend**: Node.js/Express API with yt-dlp integration for downloads
- **Storage**: File system-based with JSON metadata (no database complexity)
- **Containerization**: Docker with volume mounts for persistent storage
- **Video Processing**: FFmpeg for thumbnail generation and format optimization

**Leverage Existing Implementation**: Sofathek v1.4.0 had complete production-ready infrastructure that can be simplified for family use case.

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance on small computers | Medium | Optimize video processing, implement chunked downloads |
| Storage limitations | Medium | Implement storage monitoring, compression options |
| yt-dlp breaking changes | Low | Pin versions, implement error handling |
| Video format compatibility | Low | Use FFmpeg for format standardization |

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Family YouTube replacement | 100% usage shift | YouTube blocked, Sofathek becomes exclusive video source |
| Deployment simplicity | <10 commands | Documentation of setup steps |
| System stability | 99% uptime | Health monitoring logs |
| Content safety | 0 inappropriate content | Manual audit of curated library |

## Open Questions

- [ ] **Performance requirements**: What hardware specs are needed for smooth operation on "small computers"?
- [ ] **Storage management**: How much storage is acceptable, and what happens when limits are reached?
- [ ] **Content lifecycle**: Should old/unwatched content be automatically cleaned up?
- [ ] **Network requirements**: What bandwidth is needed for smooth streaming to multiple devices?
- [ ] **Backup strategy**: How should families backup their curated content library?

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Core Infrastructure | Project setup, Docker config, basic streaming | complete | - | - | [sofathek-core-infrastructure.plan.md](./../plans/sofathek-core-infrastructure.plan.md) |
| 2 | YouTube Integration | yt-dlp service, download workflow, progress tracking | complete | - | 1 | [sofathek-youtube-integration.plan.md](./../plans/sofathek-youtube-integration.plan.md) |
| 3 | Library Interface | React frontend, video grid, basic playback | complete | with 2 | 1 | [sofathek-library-interface.plan.md](./../plans/sofathek-library-interface.plan.md) |
| 4 | UI Polish | Responsive design, theming, error handling | complete | - | 2, 3 | [sofathek-ui-polish.plan.md](./../plans/sofathek-ui-polish.plan.md) |
| 5 | Production Ready | Testing, documentation, deployment guides | in-progress | - | 4 | [sofathek-production-ready.plan.md](./../plans/sofathek-production-ready.plan.md) |

### Phase Details

**Phase 1: Core Infrastructure**
- **Goal**: Establish foundational architecture for video streaming
- **Scope**: Docker setup, Express API, basic video streaming endpoints, file system scanning
- **Success signal**: Can serve and stream video files via HTTP with proper range support

**Phase 2: YouTube Integration** 
- **Goal**: Enable YouTube content acquisition and processing
- **Scope**: yt-dlp integration, download queue, thumbnail generation with FFmpeg
- **Success signal**: Can download YouTube videos and automatically integrate into library

**Phase 3: Library Interface**
- **Goal**: Provide Netflix-like browsing experience
- **Scope**: React frontend, video grid layout, HTML5 player, responsive design
- **Success signal**: Family members can easily browse and play curated content

**Phase 4: UI Polish**
- **Goal**: Professional user experience and marvellous visual design
- **Scope**: Dark/light themes, mobile optimization, loading states, shadcn first, error handling
- **Success signal**: Interface feels polished and works well on all family devices, Playwright tests focussing on esthetics and portability

**Phase 5: Production Ready**
- **Goal**: Reliable deployment and maintenance
- **Scope**: Testing in CI/CD, release packaging, deployment documentation, final documentation polishing
- **Success signal**: System can be deployed and maintained with minimal technical overhead

### Parallelism Notes

Phase 2 and 3 can run in parallel as they operate on different technical domains - backend YouTube integration vs frontend interface development. Both depend on Phase 1's infrastructure foundation.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Authentication Approach | Single-family, minimal auth | Multi-user profiles, OAuth | Simplicity for home network use case |
| Storage Strategy | File system + JSON | Database (SQLite/PostgreSQL) | Eliminates database complexity and maintenance |
| Video Processing | FFmpeg + yt-dlp | Custom solutions | Proven, mature tools with broad format support |
| Frontend Framework | React with TypeScript | Vue, Svelte, vanilla JS | Leverages existing v1.4.0 implementation |
| Deployment Method | Docker only | Multiple options | Ensures consistent deployment across environments |

---

## Research Summary

**Market Context**
- Self-hosted media servers (Jellyfin, Plex) focus on technical streaming capabilities
- YouTube downloaders (TubeArchivist, TubeSync) exist but lack family-safety focus
- Gap exists for family-governed content curation with child safety as primary concern
- No existing solution specifically addresses "YouTube replacement for families"

**Technical Context**
- Sofathek v1.4.0 provides complete, production-ready foundation
- React/Node.js/Docker stack proven effective for media streaming
- yt-dlp integration already implemented and tested
- File system approach eliminates database complexity while maintaining functionality
- Comprehensive testing infrastructure (Playwright) ensures reliability

---

*Generated: March 01, 2026*
*Status: DRAFT - needs validation*