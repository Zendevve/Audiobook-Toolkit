# Changelog

All notable changes to Audiobook Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Toast notification system using Sonner library
- Architecture Decision Records (ADR-001, ADR-002, ADR-003)
- Integration tests for audio merge functionality
- This CHANGELOG file

### Changed
- WebSecurity now enabled in production builds (was disabled)
- User receives toast feedback for all major actions

### Fixed
- Silent failures now show error toasts
- Conversion completion now notifies user

---

## [0.2.0] - 2025-12-23

### Added
- **Format Converter** - Batch convert between M4B, MP3, M4A, and AAC
- Conversion presets (64k Voice, 128k Standard, 192k High Quality)
- Progress tracking for conversions
- "Audiobook Binder" / "Format Converter" tab navigation

### Changed
- Improved UI tab layout with animated active indicator
- Converter displays file queue with status icons

---

## [0.1.0] - 2025-12-20

### Added
- **Audiobook Binder** - 4-step wizard for creating audiobooks
  - Upload Step: Drag-and-drop audio files
  - Arrange Step: Reorder chapters with drag-and-drop
  - Metadata Step: Book details with Open Library auto-fill
  - Export Step: Format and bitrate selection
- **Open Library Integration** - Auto-fill book metadata and covers
- **Smart Artwork Detection** - Find cover art from folder or embedded
- **Audio Preview** - Play/pause audio clips in the arrange view
- **Project Save/Load** - Save and restore project states (.adbp format)
- Custom titlebar with minimize/maximize/close
- Cinematic dark mode UI with glassmorphism effects
- Framer Motion animations throughout

### Technical
- Electron v39 + React v19 + TypeScript v5.9
- FFmpeg via ffmpeg-static for audio processing
- Vite v7 build system
- TailwindCSS for styling
