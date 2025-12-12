# Feature: Output Format & Bitrate Selection

## Purpose
Allow users to choose the output format (M4B, MP3, AAC) and audio bitrate (64k-192k) before processing, giving control over file size and compatibility.

## Business Rules
- Default format: M4B (best for audiobooks with chapters)
- Default bitrate: 128k
- MP3 format disables chapter markers (show warning)
- Settings persist for the session
- Bitrate options: 64k, 96k, 128k, 192k

## Main Flow
1. User adds files to the list
2. User selects output format from dropdown
3. User selects bitrate from dropdown
4. If MP3 selected, warning appears: "MP3 does not support chapters"
5. User clicks Process
6. Output uses selected format and bitrate

## Components
- `Dashboard.tsx` - format/bitrate selects in footer
- `src/components/ui/select.tsx` - Shadcn Select component

## Test Flows

### T1: Format Selection
- **Action**: Select MP3 from format dropdown
- **Expected**: State updates, process uses MP3 encoder

### T2: Bitrate Selection
- **Action**: Select 64k bitrate
- **Expected**: FFmpeg uses `-b:a 64k`

### T3: MP3 Chapter Warning
- **Action**: Select MP3 with 2+ files
- **Expected**: Warning displays about no chapters

## Definition of Done
- [ ] Format dropdown with M4B/MP3/AAC options
- [ ] Bitrate dropdown with 64k/96k/128k/192k options
- [ ] MP3 chapter warning appears when applicable
- [ ] Processing respects selected settings
