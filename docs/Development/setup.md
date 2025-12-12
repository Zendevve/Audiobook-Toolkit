# Development Setup

## Prerequisites
- Node.js (Latest LTS)
- Git
- FFmpeg (Handled via `ffmpeg-static` dependency, but good to have installed system-wide for debugging)

## Setup Steps
1. Clone the repository.
2. Run `npm install` in the `modern_markable` directory.
3. Run `npm run dev` to start the local development environment.

## Directory Structure
- `electron/`: Main process code
- `src/`: Renderer (React) code
- `docs/`: MCAF Documentation
- `tests/`: Vitest and Playwright tests
- `test-assets/`: Sample audio files for integration testing
