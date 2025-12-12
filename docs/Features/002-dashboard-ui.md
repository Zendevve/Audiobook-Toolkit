# Feature: Dashboard UI & File Selection

## Purpose
The Dashboard is the main entry point where users add, reorder, and manage audio files before merging them. It must provide a premium, "Director's Cut" feel.

## Main Flow
1.  **Empty State**: When no files are selected, show a large, inviting "Drop Area" with a "Select Files" button.
2.  **Drag & Drop**: User drags valid audio files (mp3, aac, m4a, wav) onto the window.
3.  **File List**:
    - Files appear in a list.
    - Each item shows: Metadata (Title, Duration), Filename.
    - User can **reorder** items (drag to sort).
    - User can **remove** items.
4.  **Action Bar**: "Process" button becomes active when files are present.

## UI/UX Rules
- **Aesthetic**: Dark mode, glassmorphism effects, smooth animations (Framer Motion).
- **Feedback**: Visual cues when dragging over the drop zone.
- **Validation**: Reject non-audio files with a toast notification.

## Test Flows
### UI Test: Drag and Drop
- **Action**: Drag `audio1.mp3` and `audio2.mp3` into drop zone.
- **Result**: 2 items appear in the list. "Process" button enables.

### UI Test: Remove File
- **Action**: Click "X" on first item.
- **Result**: Item disappears. List count decrements.

## Definition of Done
- `Dashboard` component implemented using `react-dropzone` and `framer-motion`.
- File list supports adding/removing files.
- Unit tests for file list state logic.
