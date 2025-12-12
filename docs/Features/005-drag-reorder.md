# Feature: Drag Reorder Files

## Purpose
Allow users to reorder audio files in the merge list by dragging and dropping, ensuring chapters appear in the desired order in the final audiobook.

## Business Rules
- Files can be reordered at any time before processing starts
- Reorder updates chapter indices automatically
- Visual feedback during drag operation (lift, placeholder)
- Keyboard accessibility: arrow keys + Enter to move items

## Main Flow
1. User adds multiple audio files to the list
2. User clicks and drags a file item
3. Item lifts with shadow, placeholder appears at drop location
4. User releases at new position
5. List reorders, chapter numbers update

## Components
- `Dashboard.tsx` - integrates dnd-kit
- `SortableItem.tsx` - individual draggable file row

## Test Flows

### T1: Basic Reorder
- **Data**: 3 files in list (A, B, C)
- **Action**: Drag C to position 1
- **Expected**: Order becomes C, A, B; chapter numbers update to 1, 2, 3

### T2: Process After Reorder
- **Data**: 2 files, reordered
- **Action**: Process audiobook
- **Expected**: Chapters in output match reordered list

## Definition of Done
- [ ] Files can be dragged between positions
- [ ] Visual feedback during drag
- [ ] Chapter numbers update after reorder
- [ ] Integration test verifies reorder state
- [ ] Processing respects new order
