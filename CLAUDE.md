# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Create production build in `build/` directory
- `npm test` - Run Jest tests in watch mode
- `npm run eject` - Eject from Create React App (irreversible)
- `npx tsc --noEmit` - Type check without compilation

## Application Architecture

This is a React TypeScript mindmap memo application built with Create React App. The app provides an interactive canvas for creating, connecting, and organizing memo blocks in a mind mapping interface.

### Core Architecture

- **Main App Component** (`src/App.tsx`): Central state management hub handling all pages, memo blocks, UI panels, and interaction modes
- **Three-Panel Layout**: Resizable left panel (pages), center canvas (mindmap), right panel (memo editing)
- **State-First Design**: All application state lives in App.tsx and flows down through props

### Key Components

- **Canvas** (`src/components/Canvas.tsx`): Interactive mindmap area with SVG connection lines, drag-and-drop memo positioning, and connection modes
- **MemoBlock** (`src/components/MemoBlock.tsx`): Draggable memo cards with connection points, resize detection, and interactive connection handling
- **CategoryArea** (`src/components/CategoryArea.tsx`): Visual representation of category boundaries with semi-transparent colored regions
- **LeftPanel** (`src/components/LeftPanel.tsx`): Page navigation with inline editing capabilities and resizable interface
- **RightPanel** (`src/components/RightPanel.tsx`): Detailed memo editing form with title, tags, content, and connection navigation
- **Resizer** (`src/components/Resizer.tsx`): Reusable panel resize handle component

### Data Model

Core types in `src/types/index.ts`:

- **MemoBlock**: Individual memo with title, content, tags, connections array, position, and optional size. Contains `blocks` array for rich content
- **ContentBlock**: Notion-style content blocks with 8 types: text, callout, checklist, image, file, bookmark, quote, code
- **CategoryBlock**: Hierarchical container for organizing memos and other categories with title, position, size, children array, parentId, and isExpanded state
- **Page**: Contains arrays of memos and categories with id and name
- **AppState**: Global application state interface

### Block-Based Content System

The application implements a Notion-inspired block-based content editor:

- **ContentBlock Types**: 8 distinct block types each with specific properties and rendering logic: text, callout, checklist, image, file, bookmark, quote, code
- **Block Components**: Individual components in `src/components/blocks/` for each block type
- **ContentBlockComponent**: Wrapper component that renders appropriate block type and handles common functionality
- **Block Selection**: Multi-select blocks with drag selection, keyboard shortcuts (Ctrl+A, Delete), and context menu
- **Block Operations**: Create, delete, move, convert between types, and merge text blocks
- **Slash Commands**: Type "/" to open BlockSelector for inserting new blocks
- **Seamless Editing**: Auto-save with 300ms debounce, Enter key splits blocks, backspace merges blocks

### Category System

The application implements a hierarchical category system for organizing memos and categories:

- **Category Blocks**: Visual blocks that can contain memos and other categories as children
- **Category Areas**: Semi-transparent colored regions that appear when a category has children and is expanded
- **Drag and Drop**: Drag memos or categories onto category blocks/areas to establish parent-child relationships
- **Hierarchical Structure**: Categories can be nested infinitely with parentId references and children arrays
- **Area Calculation**: Dynamic bounding box calculation (`calculateCategoryArea`) that encompasses all child memos and categories with padding
- **Position Management**: When dragging categories, all child memos and categories move together maintaining relative positions
- **Expand/Collapse**: Categories can be expanded to show area or collapsed to show only the block
- **Area Caching**: During drag operations, category areas are cached to maintain fixed size and prevent recalculation

### Key Interaction Patterns

- **Memo Connections**: Click connection points on memo blocks to create bidirectional links between memos
- **Connection Modes**: Toggle between normal mode and disconnect mode for removing connections
- **Drag Operations**: Separate handling for memo dragging vs connection dragging, plus canvas-style drag selection for both memos and content blocks
- **Category Operations**: Drag memos/categories onto category blocks to add as children; categories auto-expand and show semi-transparent areas
- **Panel Management**: Collapsible panels with resize handles, fullscreen mode for right panel
- **Multi-Selection**: Shift+click for memo selection, drag selection for content blocks, unified selection UI
- **Quick Navigation**: Right-click memos/categories or category areas/labels to add to quick navigation list; floating button provides instant access to bookmarked items across pages

### Undo/Redo System

The application implements a comprehensive undo/redo system for canvas operations:

- **Canvas History Tracking**: Tracks all memo and category operations including create, delete, move, resize, and relationship changes
- **Keyboard Shortcuts**: Ctrl+Z (Undo) and Ctrl+Shift+Z (Redo) work throughout the application
- **Scope Separation**: Canvas-level undo/redo (App.tsx) for memos/categories vs. block-level undo/redo (RightPanel.tsx) for content editing
- **Smart Event Handling**: Canvas captures Ctrl+Z in capture phase but delegates to appropriate handler based on focus context
- **Visual Feedback**: Undo/Redo buttons in Canvas toolbar show availability and provide one-click access
- **History Storage**: Canvas actions stored with snapshots of page state for reliable restoration
- **Auto-cleanup**: Deleted memos/categories automatically removed from quick navigation list

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

### Category System Implementation Details

- **Area Rendering**: Category areas only render when `hasChildren && isExpanded`
- **Position Synchronization**: Category drag uses absolute positioning with stored original positions to prevent cumulative movement errors
- **Memo Position Cache**: `dragStartMemoPositions` ref stores original memo positions on drag start, cleared on drag end
- **Children Movement**: When category moves, children calculate new position as `originalPosition + totalDelta` (not cumulative)
- **Area Colors**: Semi-transparent colors assigned based on category ID hash using predefined color palette
- **Cache System**: `draggedCategoryAreas` state caches area size and original position during drag to maintain fixed dimensions; cache is cleared on drag end to allow natural area resizing based on memo positions
- **Drag State Management**: Uses custom hooks (`useDragState`) to manage drag-related state separately from main application state
- **Area Calculation**: Uses utility functions (`categoryAreaUtils.ts`) for consistent area boundary calculations across components

### Collision Detection System

The application implements a sophisticated collision detection system using unified collision utility functions:

- **Unified Collision Logic**: `resolveAreaCollisions` in `utils/collisionUtils.ts` handles all category-category collision detection
- **Priority-Based System**: Moving category has highest priority (0); other categories pushed based on priority hierarchy
- **Iterative Resolution**: Runs up to 10 iterations to handle chain reactions when one category pushes another
- **Child Element Movement**: When category is pushed, all child memos AND child categories move together recursively (collisionUtils.ts:127-143)
- **Parent Exclusion**: Categories with `parentId` are never pushed (move with parent only)
- **Overlap-Based Pushing**: Categories pushed by exactly the overlapping distance in shortest direction
- **Cache Management**:
  - `draggedCategoryAreas` caches area size during normal drag to prevent recalculation
  - `dragStartMemoPositions` and `dragStartCategoryPositions` store original positions for Shift drag restoration
  - All caches cleared on drag end via `clearCategoryCache` (App.tsx:121-129)
- **Memo-Area Collision**: Moving category areas also push parentless memo blocks (collisionUtils.ts:132-193)

### Shift+Drag Parent-Child System

The application implements Shift+drag functionality for adding/removing memos and categories to/from category hierarchies:

- **Shift Key Detection**: Global keyboard event listeners track Shift key state
- **Dynamic Mode Switching**: Shift key can be pressed before or during drag; mode switches dynamically
- **Visual Movement During Drag**: During Shift+drag, categories and all child elements move together visually through actual position updates
- **Position Restoration on Drop**: On drop, all positions are restored to original locations using `dragStartMemoPositions` and `dragStartCategoryPositions` refs
- **Parent-Child Update Only**: Shift drop only changes `parentId` relationships, not positions
- **Cache Management**: All caches (`draggedCategoryAreas`, `dragStartMemoPositions`, `dragStartCategoryPositions`) are cleared after Shift drop
- **Visual Hints**: Shows "💡 Shift를 누르면 카테고리에 추가" hint when dragging without Shift; green border and "+" icon when Shift is pressed
- **Area Freezing**: During Shift+drag, category areas are cached (`shiftDragAreaCache`) to prevent size changes as dragged items move
- **Memo Parent-Child**: `handleShiftDrop` handles adding/removing memos to/from categories based on overlap with frozen area bounds
- **Category Parent-Child**: `handleShiftDropCategory` handles adding/removing categories to/from other categories
- **Auto-Expand**: Target categories automatically expand when items are added to them (only on add, not on remove)
- **Excluding Dragged Item**: Area calculations exclude the currently dragged item to prevent false overlaps (`pageWithoutDraggingMemo`, `pageWithoutDraggingCategory`)
- **UI Mode Toggle**: Application supports two modes for managing parent-child relationships:
  1. **Shift+Drag Mode** (default): Hold Shift while dragging to add/remove items to/from categories
  2. **Button UI Mode**: Click on category block to open a UI panel showing all items in that category, with buttons to add/remove children directly

## Development Guidelines

### Code Quality and Maintenance (CRITICAL - 항상 준수)

**코드가 복잡해지면서 문제가 반복되는 것을 방지하기 위한 핵심 원칙:**

1. **중복 코드 즉시 제거**
   - 같은 로직이 2곳 이상에 있으면 즉시 유틸 함수로 분리
   - 예: `calculateCategoryArea`가 App.tsx와 Canvas.tsx에 중복 → `utils/categoryAreaUtils.ts`로 통합
   - 중복 코드는 한 곳을 수정하면 다른 곳에서 문제가 발생하는 원인

2. **기능 세분화 및 함수화**
   - 하나의 함수는 하나의 책임만 수행 (Single Responsibility Principle)
   - 복잡한 로직은 작은 함수들로 분리
   - 예: 충돌 검사 로직을 `resolveAreaCollisions` 함수로 독립
   - 각 함수는 명확한 input/output을 가져야 함

3. **함수 호출 정돈화**
   - 불필요한 함수 호출 제거 (성능 및 무한 루프 방지)
   - 함수 호출 흐름을 명확하게 유지
   - 상태 업데이트는 한 번에 하나의 `setPages` 호출로 처리
   - 예: 메모 위치 업데이트와 충돌 검사를 단일 `setPages` 내에서 처리

4. **미사용 코드 즉시 제거**
   - 주석 처리된 코드는 git history에 있으니 과감히 삭제
   - 사용하지 않는 import, 변수, 함수 즉시 제거
   - ESLint 경고를 무시하지 말고 해결

5. **유틸 함수 분리 원칙**
   - 같은 로직을 2곳 이상에서 사용하면 `src/utils/`에 분리
   - 순수 함수로 작성 (side effect 최소화)
   - 적절한 TypeScript 타입 정의
   - 예시:
     - `categoryAreaUtils.ts` - 영역 계산 관련
     - `collisionUtils.ts` - 충돌 검사 관련

6. **문제 해결 후 재발 방지**
   - 버그를 고친 후, 왜 발생했는지 분석
   - 근본 원인을 제거하는 방향으로 리팩토링
   - 같은 패턴의 문제가 다른 곳에 없는지 확인
   - 해결 방법을 이 문서에 기록

7. **App.tsx의 비대화 방지 (CRITICAL)**
   - **절대 금지**: App.tsx에 모든 상태를 두는 방식 사용 금지
   - **새로운 기능 제작 시**: 반드시 커스텀 훅으로 제작 (유틸 함수는 유틸 함수로 제작)
   - **App.tsx의 역할**: 훅을 호출하고 조합하는 역할만 수행, 기능 자체의 코드가 작성되어서는 안 됨
   - **아키텍처 패턴**:
     1. 커스텀 훅으로 상태와 관리 로직 작성 (`src/hooks/`)
     2. 훅에서 반환된 상태와 함수들을 Context에 담아 전역적으로 제공
     3. 하위 컴포넌트에서는 useContext 훅을 사용해 props 전달 없이 바로 상태에 접근
   - **훅 문서화**: 새로운 훅을 만들 때마다 해당 훅의 목적, 사용법, 반환값을 문서화
   - **예시**:
     - `useDragState.ts` - 드래그 관련 상태 관리
     - `usePanelState.ts` - 패널 상태 관리
     - `useSelectionHandlers.ts` - 선택 관련 핸들러

### Specific Implementation Guidelines

- **File Management**: Always prefer editing existing files to creating new ones; never create files unless absolutely necessary
- **Error Handling**: Use proper TypeScript error handling with `error instanceof Error ? error.message : 'Unknown error'` pattern
- **Context Menus**: Position context menus using getBoundingClientRect() and pass position props for proper placement
- **Category Drag Operations**: Always use absolute positioning (originalPosition + totalDelta) rather than cumulative deltas to prevent position drift
- **Collision Detection**: Use unified collision resolution function (`resolveAreaCollisions`) to prevent duplicate logic and infinite loops
- **Shift+Drag Operations**: When implementing Shift+drag features, remember to: (1) disable collision detection, (2) freeze area bounds using cache, (3) exclude dragged item from area calculations, (4) use frozen cached bounds for overlap detection
- **Logging**: NEVER add console.log statements in render functions, useEffect callbacks, or frequently-called functions (e.g., calculateCategoryArea, renderSingleCategoryArea) as they cause infinite log spam and make debugging impossible. Only log in event handlers (onClick, onMouseDown, etc.) or one-time initialization code

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.