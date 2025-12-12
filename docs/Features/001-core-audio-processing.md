# Feature: Core Audio Processing

## Purpose
To merge multiple input audio files (MP3, AAC, etc.) into a single `.m4b` audiobook file, while preserving metadata and adding chapter markers at the merge points.

## Main Flow
1.  **Input**: User accepts a list of file paths (File A, File B, File C).
2.  **Analysis**: System probes files to get duration and existing metadata.
3.  **Calculation**: calculate start times for chapters:
    - Chapter 1: 00:00:00 (Title: File A)
    - Chapter 2: Length(A) (Title: File B)
    - Chapter 3: Length(A) + Length(B) (Title: File C)
4.  **Processing**: System constructs an FFmpeg command to:
    - Concatenate audio streams.
    - Map metadata to a chapter file.
    - Output `.m4b` (AAC encoding).
5.  **Output**: A single valid file on disk.

## Business Rules
- **No iTunes**: Must rely solely on FFmpeg.
- **Format**: Output MUST be `.m4b` (AAC).
- **Quality**: Default to input quality or standard audiobook bitrate (e.g., 64kbps mono or 128kbps stereo).

## Test Flows
### Integration Test: Merge Two Files
- **Data**: `test-assets/audio1.mp3` (5s), `test-assets/audio2.mp3` (5s).
- **Action**: Call `AudioProcessor.merge([file1, file2], output_path)`.
- **Verification**:
    - `output_path` exists.
    - `ffprobe output_path` shows duration ~10s.
    - `ffprobe output_path` shows 2 chapters.

### Edge Case: Invalid File
- **Data**: `test-assets/corrupt.mp3`.
- **Action**: Attempt merge.
- **Result**: Error thrown, process aborts gracefully, UI receives error message.

## Definition of Done
- `AudioProcessor` class implemented.
- Integration tests using real `ffmpeg-static` binaries pass.
- Verified output plays in a standard media player (e.g., VLC).
