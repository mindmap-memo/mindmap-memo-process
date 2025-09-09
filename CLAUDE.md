# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Create production build in `build/` directory
- `npm test` - Run Jest tests in watch mode
- `npm run eject` - Eject from Create React App (irreversible)

## Application Architecture

This is a React TypeScript mindmap memo application built with Create React App. The app provides an interactive canvas for creating, connecting, and organizing memo blocks in a mind mapping interface.

### Core Architecture

- **Main App Component** (`src/App.tsx`): Central state management hub handling all pages, memo blocks, UI panels, and interaction modes
- **Three-Panel Layout**: Resizable left panel (pages), center canvas (mindmap), right panel (memo editing)
- **State-First Design**: All application state lives in App.tsx and flows down through props

### Key Components

- **Canvas** (`src/components/Canvas.tsx`): Interactive mindmap area with SVG connection lines, drag-and-drop memo positioning, and connection modes
- **MemoBlock** (`src/components/MemoBlock.tsx`): Draggable memo cards with connection points, resize detection, and interactive connection handling
- **LeftPanel** (`src/components/LeftPanel.tsx`): Page navigation with inline editing capabilities and resizable interface
- **RightPanel** (`src/components/RightPanel.tsx`): Detailed memo editing form with title, tags, content, and connection navigation
- **Resizer** (`src/components/Resizer.tsx`): Reusable panel resize handle component

### Data Model

Core types in `src/types/index.ts`:

- **MemoBlock**: Individual memo with title, content, tags, connections array, position, and optional size. Contains both legacy `content` field and new `blocks` array for rich content
- **ContentBlock**: Notion-style content blocks with 9 types: text, callout, checklist, image, file, bookmark, quote, code, table
- **Page**: Contains array of memos with id and name
- **AppState**: Global application state interface

### Block-Based Content System

The application implements a Notion-inspired block-based content editor:

- **ContentBlock Types**: 9 distinct block types each with specific properties and rendering logic
- **Block Components**: Individual components in `src/components/blocks/` for each block type
- **ContentBlockComponent**: Wrapper component that renders appropriate block type and handles common functionality
- **Block Selection**: Multi-select blocks with drag selection, keyboard shortcuts (Ctrl+A, Delete), and context menu
- **Block Operations**: Create, delete, move, convert between types, and merge text blocks
- **Slash Commands**: Type "/" to open BlockSelector for inserting new blocks
- **Seamless Editing**: Auto-save with 300ms debounce, Enter key splits blocks, backspace merges blocks

### Key Interaction Patterns

- **Memo Connections**: Click connection points on memo blocks to create bidirectional links between memos
- **Connection Modes**: Toggle between normal mode and disconnect mode for removing connections
- **Drag Operations**: Separate handling for memo dragging vs connection dragging, plus canvas-style drag selection for both memos and content blocks
- **Panel Management**: Collapsible panels with resize handles, fullscreen mode for right panel
- **Multi-Selection**: Shift+click for memo selection, drag selection for content blocks, unified selection UI

### Advanced Features

- **Canvas Interaction**: Pan, zoom, drag selection with visual feedback boxes
- **Block Merging**: Backspace at start of text block merges content with previous block (like Notion)
- **Auto-Focus Management**: Automatic focus handling when creating, deleting, or merging blocks
- **Real-time Visual Feedback**: Drag hover states, selection highlighting, transition animations

### Technical Notes

- Uses React 18 with TypeScript
- All styling is inline (no CSS files)
- Connection lines drawn with SVG overlays
- ResizeObserver for dynamic memo block sizing
- Bidirectional memo connections (stored in both memo's connections arrays)
- Complex state management with multiple selection modes and interaction states
- Event delegation and coordinate transformation for accurate drag operations

### Important Implementation Details

- **State Flow**: App.tsx holds all state and passes down through props - no external state management
- **Block Creation**: New memos start with empty title and single text block. Use `createNewBlock()` helper in RightPanel
- **Coordinate Systems**: Canvas uses transform/scale coordinates, drag selection uses client coordinates - conversion needed
- **Focus Management**: TextBlock components auto-focus after creation/merge using setTimeout delays (50-100ms)
- **Auto-save Debouncing**: TextBlock content auto-saves after 300ms of inactivity to prevent excessive updates
- **Block Merging Logic**: Only text blocks can merge, content appends to previous block, cursor moves to merge point
- **Drag Selection**: Works across entire right panel, uses collision detection with block boundaries
- **Panel Fullscreen**: Right panel can overlay entire screen, hides resizer and changes positioning to fixed