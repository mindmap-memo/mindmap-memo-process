# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Create production build in `build/` directory
- `npm test` - Run Jest tests in watch mode
- `npm run eject` - Eject from Create React App (irreversible)
- `npx tsc --noEmit` - Type check without compilation

## Google Sheets Integration

The application integrates with Google Sheets API for data extraction and table creation:

- **API Configuration**: Google OAuth client configured in `src/config/google.ts` with read-only sheets access
- **Authentication**: Uses Google Identity Services (GIS) via GoogleAuth component for secure sign-in
- **Range Detection**: Smart clipboard-based system detects copied sheet ranges and auto-calculates A1 notation
- **Data Extraction**: Supports both structured table conversion and plain text extraction from sheet ranges
- **SheetsBlock**: Embedded iframe view of Google Sheets with range selection tools and extraction controls

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
- **ContentBlock**: Notion-style content blocks with 10 types: text, callout, checklist, image, file, bookmark, quote, code, table, sheets
- **Page**: Contains array of memos with id and name
- **AppState**: Global application state interface

### Block-Based Content System

The application implements a Notion-inspired block-based content editor:

- **ContentBlock Types**: 10 distinct block types each with specific properties and rendering logic: text, callout, checklist, image, file, bookmark, quote, code, table, sheets
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

### Advanced Table System

The application includes a sophisticated table system designed for business process management:

- **Column-Based Typing**: Each table column has a fixed type (text, number, date, checkbox, select, formula) that applies to all cells in that column
- **Data Registry**: Global named data system using @dataName syntax (e.g., "@예산_총액") for cross-table references and formula dependencies
- **Formula Engine**: Business-specific functions including PROGRESS(), STATUS(), DEADLINE(), WORKDAYS(), APPROVAL(), LATEST(), PREVIOUS(), SUM_BY()
- **Real-time Updates**: Data registry subscribes to changes and automatically updates dependent cells and formulas
- **Column Type Management**: Click column headers to change column types; type changes automatically convert existing cell values
- **Horizontal Scrolling**: Tables automatically add horizontal scroll when content exceeds container width
- **Context Menu UI**: Column type selector appears as positioned context menu rather than modal dialog

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

### Table System Architecture

- **Column-Based Type System**: TableColumn interface defines column properties including type, options, validation
- **Dual Data Structure**: Tables maintain both legacy `headers`/`rows` arrays and enhanced `columns`/`cells` arrays for backward compatibility
- **Data Registry Manager**: Global singleton (`src/utils/dataRegistry.ts`) manages named data points with dependency tracking
- **Formula Engine**: Separate class (`src/utils/formulaEngine.ts`) handles @dataName references and business-specific functions
- **Cell Editor Component**: Type-aware cell editing with autocomplete for @dataName references and formula helper
- **Column Type Selector**: Context menu positioned at click location for adding columns and changing existing column types
- **Type Conversion**: Automatic value conversion when changing column types (e.g., text → number uses parseFloat())
- **Table Scrolling**: Wrapper div with `overflowX: 'auto'` and `minWidth: 'max-content'` on table for horizontal scrolling

## Development Guidelines

- **File Management**: Always prefer editing existing files to creating new ones; never create files unless absolutely necessary
- **Table System**: When working with tables, remember the dual data structure - maintain both legacy arrays and enhanced objects
- **Error Handling**: Use proper TypeScript error handling with `error instanceof Error ? error.message : 'Unknown error'` pattern
- **Function Parameters**: Ensure all function calls have correct number of parameters (e.g., updateBlock requires 4 parameters: headers, rows, cells, columns)
- **Data Registry**: Use global data registry for cross-table references; remember @dataName syntax for formula references
- **Context Menus**: Position context menus using getBoundingClientRect() and pass position props for proper placement
- **Google Sheets Safety**: Always validate array data before using .map() - check `Array.isArray()` and filter non-arrays to prevent runtime errors
- **Range Detection**: Use clipboard-based detection for Google Sheets ranges; implement fallback UI for manual range input when automatic detection fails

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.