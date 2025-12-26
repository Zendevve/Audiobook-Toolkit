# ADR-001: Tech Stack Choice

**Status**: Accepted
**Date**: 2025-12-26
**Owner**: Zendevve
**Related Features**: All features
**Supersedes**: N/A
**Superseded by**: N/A

---

## Context

Audiobook Toolkit needs to be a cross-platform desktop application that can:
- Process audio files using FFmpeg
- Provide a modern, premium user interface
- Access the local filesystem for reading/writing files
- Work offline without requiring internet connectivity

The target audience is audiobook enthusiasts who want a free, open-source alternative to expensive commercial tools like GoldWave or commercial M4B creators.

---

## Decision

Build Audiobook Toolkit using:

- **Electron** (v39) — Cross-platform desktop framework
- **React** (v19) — UI component library
- **TypeScript** (v5.9) — Type-safe JavaScript
- **Vite** (v7) — Fast build tool with HMR
- **FFmpeg** (via ffmpeg-static) — Audio processing engine
- **TailwindCSS** — Utility-first styling
- **Framer Motion** — Animations
- **Radix UI** — Accessible primitives (via shadcn/ui)

Key points:

- Single codebase for Windows, macOS, and Linux
- No native dependencies beyond bundled FFmpeg
- Modern React patterns (hooks, function components)
- Type safety throughout the codebase

---

## Alternatives Considered

### Tauri

- Pros: Smaller bundle size, Rust backend, better security
- Cons: Less mature ecosystem, harder to work with audio processing
- Rejected because: FFmpeg integration is simpler with Node.js, and the team has more experience with Electron

### NW.js

- Pros: Similar to Electron, good Node.js integration
- Cons: Smaller community, fewer resources, less active development
- Rejected because: Electron has better tooling and community support

### Native (C++/Qt)

- Pros: Best performance, smallest bundle size
- Cons: Requires platform-specific builds, longer development time
- Rejected because: Development velocity is prioritized over bundle size

---

## Consequences

### Positive

- Fast development with familiar React ecosystem
- Cross-platform from day one
- Easy FFmpeg integration through Node.js child processes
- Large community for troubleshooting
- Hot module replacement during development

### Negative / Risks

- Large application bundle size (~150MB+ with FFmpeg)
  - Mitigation: Acceptable for desktop apps; users download once
- Higher memory usage compared to native apps
  - Mitigation: Electron performance is sufficient for this use case
- Security considerations with Node.js integration
  - Mitigation: Context isolation enabled, nodeIntegration disabled

---

## Impact

### Code

- Affected modules: All modules
- New boundaries: Main process (Node.js) vs Renderer process (React)
- Architecture: IPC-based communication between processes

### Data / Configuration

- Config location: `electron/main.ts` for Electron config
- Vite config: `vite.config.ts`
- TypeScript: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

### Documentation

- Feature docs must distinguish Main vs Renderer process code
- Testing docs must cover both unit tests and integration tests
- Development docs must include Electron-specific setup steps

---

## Verification

### Objectives

- Application builds for all three platforms
- FFmpeg commands execute correctly
- UI renders with acceptable performance

### Test Commands

- build: `npm run build`
- test: `npm test`
- dev: `npm run dev`

---

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vite Plugin Electron](https://github.com/electron-vite/vite-plugin-electron)
- [FFmpeg Static](https://github.com/eugeneware/ffmpeg-static)
