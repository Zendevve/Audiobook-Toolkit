# Feature: Audio Merging & Processing

## Purpose
Merge multiple audio files into a single M4B audiobook file with embedded chapter markers.

## Main Flow
1.  **User Clicks Process**: User clicks "Process Audiobook" button with files selected.
2.  **Select Output Location**: Dialog prompts user for save location.
3.  **Generate Chapter Metadata**: Calculate chapter start times from cumulative durations.
4.  **Merge Audio**: FFmpeg concatenates all audio files.
5.  **Embed Chapters**: FFmpeg writes chapter metadata into M4B container.
6.  **Progress Reporting**: IPC sends progress updates to renderer.
7.  **Completion**: Notify user of success.

## Technical Details
- **FFmpeg Concat**: Use concat demuxer protocol for lossless merging.
- **Chapter Markers**: Use FFmpeg metadata format (`;FFMETADATA1`).
- **Output Format**: M4B container (AAC audio).
- **IPC Channels**:
    - `audio:process` (Renderer -> Main): Start processing
    - `audio:progress` (Main -> Renderer): Progress updates
    - `audio:complete` (Main -> Renderer): Processing finished

## FFmpeg Command Flow
```bash
# 1. Generate concat file list
file '/path/to/file1.mp3'
file '/path/to/file2.mp3'

# 2. Generate metadata file with chapters
;FFMETADATA1
[CHAPTER]
TIMEBASE=1/1000
START=0
END=300000
title=Chapter 1
[CHAPTER]
TIMEBASE=1/1000
START=300000
END=480000
title=Chapter 2

# 3. Merge with chapters
ffmpeg -f concat -safe 0 -i concat.txt -i metadata.txt \
  -map_metadata 1 -c:a aac -b:a 128k output.m4b
```

## Definition of Done
- Clicking "Process" opens save dialog.
- Files are merged into single M4B.
- Chapter markers are embedded.
- Progress bar updates during processing.
