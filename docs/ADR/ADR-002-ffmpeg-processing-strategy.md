# ADR-002: FFmpeg Processing Strategy

**Status**: Accepted
**Date**: 2025-12-26
**Owner**: Zendevve
**Related Features**: [001-core-audio-processing](../Features/001-core-audio-processing.md), [format-converter](../Features/format-converter.md)
**Supersedes**: N/A
**Superseded by**: N/A

---

## Context

Audiobook Toolkit needs to:
- Merge multiple audio files into a single audiobook
- Convert between audio formats (M4B, MP3, M4A, AAC, FLAC)
- Preserve metadata during processing
- Generate chapter markers at merge boundaries
- Embed cover art in output files

We needed to decide how to handle audio processing in an Electron application.

---

## Decision

Use **FFmpeg via fluent-ffmpeg** running as a child process in the Electron main process.

Key points:

- Bundle FFmpeg binaries using `ffmpeg-static` and `ffprobe-static`
- Execute FFmpeg commands from the Electron main process
- Use `filter_complex` for audio concatenation (not file-based concat)
- Generate FFMETADATA1 format for chapter markers
- Use AAC codec for M4B/M4A outputs, libmp3lame for MP3
- Stream progress events to renderer via IPC

### Processing Pipeline

```
Input Files → ffprobe (metadata) → ffmpeg (concat/convert) → Output File
                                       ↓
                                 IPC Progress Events → UI
```

### Codec Strategy

| Output Format | Container | Audio Codec | Notes |
|---------------|-----------|-------------|-------|
| M4B | ipod | AAC | Audiobook standard |
| M4A | mp4 | AAC | iTunes-compatible |
| MP3 | mp3 | libmp3lame | Universal compatibility |
| AAC | adts | AAC | Raw AAC stream |

---

## Alternatives Considered

### Web Audio API

- Pros: No external dependencies, runs in renderer
- Cons: Cannot encode to M4B/AAC, limited format support
- Rejected because: Does not support required output formats

### WebAssembly FFmpeg (ffmpeg.wasm)

- Pros: Runs in browser context, no native binaries
- Cons: Slower performance, higher memory usage, larger bundle
- Rejected because: Performance is critical for large audiobook files

### External FFmpeg Installation

- Pros: Smaller app bundle, user-managed updates
- Cons: Requires user to install FFmpeg separately, support burden
- Rejected because: Too complex for target audience

---

## Consequences

### Positive

- Full FFmpeg feature set available
- Excellent performance for large files
- Reliable codec support across platforms
- Progress tracking via ffmpeg output parsing
- Chapter markers work correctly

### Negative / Risks

- Large binary size (~70MB per platform)
  - Mitigation: Acceptable trade-off for functionality
- Platform-specific binaries needed
  - Mitigation: Handled automatically by ffmpeg-static
- Async process management complexity
  - Mitigation: Wrapped in fluent-ffmpeg abstraction

---

## Impact

### Code

- Main process: `electron/main.ts` handles all FFmpeg operations
- IPC handlers: `audio:process`, `audio:convert`, `audio:batchConvert`
- Progress events: `audio:progress`, `audio:convertProgress`

### Configuration

- FFmpeg path: Set via `ffmpeg.setFfmpegPath(ffmpegPath)`
- FFprobe path: Set via `ffmpeg.setFfprobePath(ffprobePath.path)`
- Temporary files: Created in `os.tmpdir()` for metadata

---

## Verification

### Objectives

- Audio files merge with correct duration
- Chapter markers appear at correct timestamps
- Metadata is preserved during conversion
- Cover art is embedded in output
- Progress events fire during processing

### Test Environment

- Test files: `test-assets/audio1.mp3`, `test-assets/audio2.mp3`
- Integration tests: `tests/integration/format-converter.test.ts`

### Key Test Cases

| Test | Verification |
|------|-------------|
| Merge 2 files | Output duration = sum of inputs |
| Chapter markers | ffprobe shows 2 chapters |
| Metadata preservation | Title/artist tags preserved |
| Cover art embedding | Visual inspection in media player |

---

## References

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [FFMETADATA Chapter Format](https://ffmpeg.org/ffmpeg-formats.html#Metadata-1)
