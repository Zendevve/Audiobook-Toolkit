# Feature: Chapter Splitter

**Status**: 🚧 In Progress
**Owner**: Zendevve

---

## Purpose

To split a single M4B/M4A audiobook file into individual files based on embedded chapter markers. This is useful for users who prefer one file per chapter or want to break down large books.

## Business Rules

1. **Input**: Single M4B, M4A, or MP3 file with embedded chapters.
2. **Output**: Multiple audio files (one per chapter).
3. **Format Support**:
   - Source Format: M4B, M4A, MP3
   - Target Format: Same as source (Copy mode) or Transcode (MP3/M4B)
4. **Naming**: Files should be named automatically (e.g., "01 - Chapter Name.m4b").
5. **Metadata**: Each split file must retain:
   - Global metadata (Author, Book Title, Cover Art)
   - Track/Disc number (if applicable)
   - Chapter title as the Track Title

## Main Flow

1. **Import**: User drags an M4B file into the Splitter tab.
2. **Analysis**: System reads chapter metadata using `ffprobe`.
3. **Review**: User sees a list of chapters (Start, End, Title).
   - Can uncheck chapters to skip.
4. **Configure**: User selects output directory and format options.
   - **Mode**: "Stream Copy" (Fast, no quality loss) or "Convert" (Re-encode).
5. **Process**:
   - System loops through selected chapters.
   - Runs `ffmpeg -i input -ss <start> -to <end> ...` for each.
6. **Result**: Folder populated with individual chapter files.

## Technical Details

### IPC Handlers

- `audio:read-chapters(filePath)`: Returns `ChapterInfo[]`.
- `audio:split-by-chapters(options)`: Executes the splitting logic.

### FFmpeg Command (Stream Copy)

```bash
ffmpeg -i input.m4b -ss 00:00:00 -to 00:15:30 -c copy -map 0 -metadata title="Chapter 1" "01 - Chapter 1.m4b"
```

## UI Components

- **ChapterSplitter**: Main container.
- **ChapterList**: Scrollable list of chapters with checkboxes.
- **SplitSettings**: Output config.

## Definition of Done

- [ ] Can read and display chapters from an M4B file.
- [ ] Can split a file into multiple parts using Stream Copy.
- [ ] Metadata is correctly preserved in split files.
- [ ] UI provides feedback during processing.
