# Feature: Audio Metadata Reading

## Purpose
To display useful information to the user (Chapter Title, Duration, Artist) and to calculate the total duration for the final audiobook, we need to read metadata from the imported audio files.

## Main Flow
1.  **File Added**: User drags a file into the Dashboard.
2.  **Request Metadata**: The React frontend sends an IPC message `read-metadata` with the file path to the Main process.
3.  **Process Metadata**:
    - The Main process uses `fluent-ffmpeg.ffprobe` to read the file.
    - Extracts `format.duration` (in seconds), `tags.title`, `tags.artist`, `tags.album`.
    - If `tags.title` is missing, use the filename.
4.  **Return Metadata**: IPC reply sends the data back to the frontend.
5.  **Update UI**: The Dashboard updates the file card with the real duration and title.

## Technical Details
- **Library**: `fluent-ffmpeg` (Main process).
- **Binary**: `ffmpeg-static` (provides the path to `ffprobe`).
- **IPC Channels**:
    - `audio:read-metadata` (Renderer -> Main)
    - `audio:metadata-result` (Main -> Renderer)

## Definition of Done
- `preload.ts` exposes `readMetadata(path)`.
- `main.ts` handles `audio:read-metadata` using `ffprobe`.
- Frontend calls this when file is dropped and updates state.
- **Unit Integration Test**: A test in `tests/` that calls the IPC handler function directly (or via mock) and verifies it returns correct duration for `test-assets/audio1.mp3`.
