# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start Next.js development server (http://localhost:3000)
  - **IMPORTANT**: Must run on port 3000 for Google login redirect to work properly
  - If port 3000 is occupied, kill the process: `npx kill-port 3000`
- `npm run build` - Create production build in `.next/` directory
- `npm start` - Start production server (after build)
- `npm run lint` - Run Next.js linter
- `npx tsc --noEmit` - Type check without compilation

## Application Architecture

This is a React TypeScript mindmap memo application built with Next.js 15 (App Router). The app provides an interactive canvas for creating, connecting, and organizing memo blocks in a mind mapping interface.

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
- **ContentBlock**: Block-based content with 4 types: text, image, file, link
- **CategoryBlock**: Hierarchical container for organizing memos and other categories with title, position, size, children array, parentId, and isExpanded state
- **Page**: Contains arrays of memos and categories with id and name
- **AppState**: Global application state interface

### Block-Based Content System

The application implements a TipTap-based block content editor:

- **ContentBlock Types**: 4 block types each with specific properties: text, image, file, link
- **Block Editor**: TipTap-based WYSIWYG editor with drag & drop support for files and images
- **Add Block Button**: Floating + button in bottom right of right panel when memo is selected, provides menu to add text, image, file, or link blocks
- **Drag & Drop**: Direct file/image drag & drop onto right panel to add new blocks
- **Seamless Editing**: Auto-save with debouncing, rich text formatting (bold, italic, code, strike)

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

### Data Persistence

The application uses **PostgreSQL database (Neon)** for data persistence:

- **Database Schema**: Tables for pages, memos, categories, and quick_nav_items (`create-tables.sql`)
- **API Layer**: RESTful API endpoints in `src/app/api/` for CRUD operations
  - `/api/pages` - Fetch all pages with memos and categories
  - `/api/pages/:id` - Update/delete page
  - `/api/memos` - Create memo
  - `/api/memos/:id` - Update/delete memo
  - `/api/categories` - Create category
  - `/api/categories/:id` - Update/delete category
  - `/api/quick-nav` - Manage quick navigation items
- **Auto-Save**: `useAutoSave` hook automatically saves changes to database with 300ms debounce
- **Initial Load**: `useAppState` hook loads all data from database on app start
- **Error Handling**: Falls back to default data if database connection fails

**Important**: All data is stored in the database. Do NOT use localStorage for data persistence.

### Next.js Architecture

This application uses Next.js 15 with the App Router pattern:

- **App Directory**: `src/app/` - Next.js App Router root
  - `layout.tsx` - Root layout with global styles and analytics
  - `page.tsx` - Main application page (renders App.tsx)
  - `globals.css` - Global CSS reset and base styles
  - `api/` - API Routes directory

- **API Routes**: RESTful endpoints in `src/app/api/`
  - Server-side only, run on Node.js runtime
  - Direct database access using Neon serverless driver
  - Automatic API endpoint generation based on folder structure
  - All routes follow Next.js App Router conventions with `route.ts` files

- **Client vs Server Components**:
  - Main app (`App.tsx`) is a Client Component (requires "use client" directive)
  - API routes are Server Components (default)
  - All interactive components with hooks/state require "use client" directive
  - Static components can remain Server Components for better performance

- **Global Styles**:
  - `src/app/globals.css` - CSS reset, HTML/body base styles (no margin/padding, overflow hidden)
  - SCSS modules for component-specific styles (`.module.scss` extension)
  - Global styles only in `globals.css`, all component styles use CSS Modules

### Technical Notes

- Uses React 19 with TypeScript and Next.js 15 (App Router)
- **Framework**: Next.js with App Router architecture
- **Database**: PostgreSQL (Neon) for all data persistence
- **Styling with SCSS**: All component styles are organized in the `src/scss/` directory, mirroring the component structure. Component SCSS files are located in `src/scss/` with paths matching their component locations (e.g., `src/components/Canvas.tsx` → `src/scss/components/Canvas.module.scss`, `src/components/blocks/CodeBlock.tsx` → `src/scss/components/blocks/CodeBlock.module.scss`)
- **SCSS Module Pattern**: Import styles from `src/scss/` using relative paths: `import styles from '../../scss/components/ComponentName.module.scss'` and use `className={styles.className}` for type-safe class names
- **SCSS Module Naming**: All SCSS files MUST use `.module.scss` extension for Next.js CSS Modules
- **No Inline Styles**: Avoid inline styles; use SCSS classes for all styling. Only use inline styles for dynamic values that must be calculated at runtime (e.g., positions, transforms, colors that change based on data)
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
   - **파일 크기 제한**: 한 파일의 코드가 500줄을 초과하지 않도록 커스텀 훅으로 로직을 분리
   - 500줄이 넘어가면 관련 로직을 커스텀 훅으로 추출하여 별도 파일로 분리

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

8. **컴포넌트의 비대화 방지 (CRITICAL)**
   - **문제**: 컴포넌트 파일이 커지면 유지보수가 어려워지고 가독성이 떨어짐
   - **원칙**: App.tsx와 동일하게 컴포넌트도 로직을 분리해야 함
   - **컴포넌트 전용 훅 폴더 구조**:
     - 컴포넌트의 로직을 커스텀 훅으로 분리할 때, 해당 컴포넌트 전용 폴더를 생성
     - 폴더 안에 컴포넌트 파일과 해당 컴포넌트 전용 훅들을 함께 배치
     - 예시 구조:
       ```
       src/components/
       ├── Canvas/
       │   ├── Canvas.tsx              # 컴포넌트 본체
       │   ├── useCanvasState.ts       # Canvas 전용 상태 관리 훅
       │   ├── useCanvasHandlers.ts    # Canvas 전용 이벤트 핸들러 훅
       │   └── useCanvasRendering.ts   # Canvas 전용 렌더링 로직 훅
       ├── RightPanel/
       │   ├── RightPanel.tsx
       │   └── useRightPanelState.ts
       └── MemoBlock.tsx               # 단순한 컴포넌트는 파일만 존재
       ```
   - **적용 기준**:
     - 컴포넌트 파일이 500줄 이상이면 로직 분리 고려
     - 복잡한 상태 관리나 이벤트 핸들러가 많으면 훅으로 분리
     - 여러 useEffect, useState가 있으면 관련 로직끼리 묶어서 훅으로 분리
   - **전역 훅 vs 컴포넌트 전용 훅**:
     - **전역 훅** (`src/hooks/`): 여러 컴포넌트에서 공통으로 사용하는 로직
     - **컴포넌트 전용 훅** (`src/components/ComponentName/`): 특정 컴포넌트에서만 사용하는 로직
   - **장점**:
     - 컴포넌트 파일이 간결해져서 가독성 향상
     - 로직과 UI가 분리되어 테스트 및 유지보수 용이
     - 관련 파일들이 한 폴더에 모여 있어 찾기 쉬움

9. **컴포넌트 리팩토링 프로세스 (CRITICAL)**
   - **목적**: 비대한 컴포넌트를 체계적으로 커스텀 훅으로 분리
   - **리팩토링 단계**:
     1. 각 컴포넌트 안에 있는 각 로직을 커스텀 훅으로 분리한다
     2. 특정 컴포넌트에 해당하는 커스텀 훅은 컴포넌트 메인 tsx 파일과 함께 같은 폴더에 위치시킨다
        - 예: RightPanel의 로직을 커스텀 훅으로 나눴다면:
          ```
          src/components/RightPanel/
          ├── RightPanel.tsx              # 컴포넌트 본체
          └── hooks/                      # 컴포넌트 전용 훅 폴더
              ├── useRightPanelState.ts   # 상태 관리
              ├── useRightPanelHandlers.ts # 이벤트 핸들러
              └── useRightPanelEffects.ts  # useEffect 로직
          ```
     3. 코드가 너무 길어 전체적인 파악이 힘든 경우, **로직의 의미 단위로 분리**한다 (300줄은 관리하기 적절한 파일 크기 기준이며, 무작정 300줄씩 자르는 것이 아님)
     4. 훅으로 분리를 마친 로직은 **즉시 기존 파일에서 코드를 삭제**하고, 훅을 import 한다
        - ⚠️ **중요**: 훅 파일을 만들자마자 바로 기존 코드를 삭제해야 함 (나중에 하면 안 됨)
        - 삭제 후 즉시 import 문 추가
        - 중복 코드가 절대 남아있으면 안 됨
     5. 모든 로직이 훅으로 분리될 때까지 이 작업을 반복한다
   - **분리 원칙**:
     - 상태 관리 로직 → `useComponentNameState.ts`
     - 이벤트 핸들러 → `useComponentNameHandlers.ts`
     - 부수 효과(useEffect) → `useComponentNameEffects.ts`
     - 렌더링 로직 → `useComponentNameRendering.tsx`
   - **주의사항**:
     - 분리 후 반드시 기존 코드 삭제
     - import 경로 확인
     - 타입 정의도 함께 이동
     - 의존성 배열 확인

10. **새 로직 추가 시 필수 규칙 (CRITICAL)**
    - **절대 금지**: 기존 파일에 직접 로직을 작성하는 방식
    - **필수 원칙**: 모든 새로운 로직은 커스텀 훅 또는 유틸 함수로 만들어서 import하는 형태로 추가
    - **적용 범위**:
      - 새로운 기능 추가
      - 기존 기능 수정 및 확장
      - 반응형 로직 추가 (모바일, 태블릿 대응)
      - 이벤트 핸들러 추가
      - 상태 관리 로직 추가
    - **올바른 절차**:
      1. 새로운 기능이 필요하면 먼저 커스텀 훅 또는 유틸 함수 파일을 생성
      2. 해당 파일에서 로직을 완성
      3. 필요한 컴포넌트나 훅에서 import하여 사용
      4. 기존 파일에는 훅/함수 호출 코드만 추가
    - **예시 (반응형 로직 추가)**:
      ```typescript
      // ❌ 잘못된 방법 - App.tsx에 직접 작성
      const App = () => {
        const [isMobile, setIsMobile] = useState(false);

        useEffect(() => {
          const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
          };
          window.addEventListener('resize', checkMobile);
          checkMobile();
          return () => window.removeEventListener('resize', checkMobile);
        }, []);
        // ... 나머지 코드
      };

      // ✅ 올바른 방법 - 커스텀 훅으로 분리
      // src/hooks/useMediaQuery.ts
      export const useMediaQuery = (query: string) => {
        const [matches, setMatches] = useState(false);
        useEffect(() => {
          const media = window.matchMedia(query);
          setMatches(media.matches);
          const listener = () => setMatches(media.matches);
          media.addEventListener('change', listener);
          return () => media.removeEventListener('change', listener);
        }, [query]);
        return matches;
      };

      // App.tsx
      const App = () => {
        const isMobile = useMediaQuery('(max-width: 768px)');
        // ... 나머지 코드
      };
      ```
    - **예시 (유틸 함수)**:
      ```typescript
      // ❌ 잘못된 방법 - 컴포넌트 내부에 함수 정의
      const Component = () => {
        const getAllDescendantIds = (parentId: string): string[] => {
          // ... 로직
        };
        const result = getAllDescendantIds(id);
      };

      // ✅ 올바른 방법 - 유틸 함수로 분리
      // src/utils/categoryHierarchyUtils.ts
      export const getAllDescendantCategoryIds = (
        parentId: string,
        categories: CategoryBlock[]
      ): string[] => {
        // ... 로직
      };

      // Component.tsx
      import { getAllDescendantCategoryIds } from '../utils/categoryHierarchyUtils';
      const Component = () => {
        const result = getAllDescendantCategoryIds(id, categories);
      };
      ```
    - **장점**:
      - 코드 재사용성 극대화
      - 테스트 용이성 향상
      - 파일별 책임 명확화
      - 유지보수 및 디버깅 용이
      - 팀 협업 시 충돌 최소화

### Specific Implementation Guidelines

- **File Management**: Always prefer editing existing files to creating new ones; never create files unless absolutely necessary
- **Styling Guidelines**:
  - **ALWAYS use SCSS files** for component styling instead of inline styles
  - All SCSS files are organized in `src/scss/` directory, mirroring the component structure
  - For components in `src/components/`, create corresponding SCSS in `src/scss/` (e.g., `src/components/Canvas.tsx` → `src/scss/components/Canvas.module.scss`)
  - For nested components, maintain the same path structure (e.g., `src/components/blocks/CodeBlock.tsx` → `src/scss/components/blocks/CodeBlock.module.scss`)
  - **SCSS Module Naming**: All SCSS files MUST use `.module.scss` extension for Next.js CSS Modules
  - Import as SCSS module using relative paths: `import styles from '../../scss/components/ComponentName.module.scss'`
  - Use className for static styles, inline style only for dynamic runtime values
  - Organize SCSS with nested selectors matching component structure
  - **Global Styles**: Only `src/app/globals.css` should contain global, non-modular CSS
  - **Dynamic Values Only**: Use inline styles ONLY for values that change at runtime (positions, transforms, sizes, data-driven colors)
  - **Example of proper usage**:
    ```tsx
    // GOOD - import SCSS module from src/scss/
    import styles from '../../scss/components/Canvas.module.scss';

    // GOOD - dynamic position
    <div className={styles.memoBlock} style={{ left: `${memo.position.x}px`, top: `${memo.position.y}px` }}>

    // BAD - static styles inline
    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px' }}>

    // GOOD - static styles in SCSS
    <div className={styles.container}>
    ```
- **Icon Usage**: ALWAYS use wireframe/outline SVG icons from `lucide-react` library. NEVER use emoji icons (🔍, 📄, ✏️, 🗑️, etc.) in UI components
  - **Good**: `<Plus size={16} />`, `<ImageIcon size={16} />`
  - **Bad**: `+`, `🖼️`, `📎`
  - Install lucide-react if not present: `npm install lucide-react`
  - Import icons: `import { Plus, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'`
  - Standard size for inline icons: 16px
  - Standard size for larger icons: 20-32px
- **Error Handling**: Use proper TypeScript error handling with `error instanceof Error ? error.message : 'Unknown error'` pattern
- **Context Menus**: Position context menus using getBoundingClientRect() and pass position props for proper placement
- **Category Drag Operations**: Always use absolute positioning (originalPosition + totalDelta) rather than cumulative deltas to prevent position drift
- **Collision Detection**: Use unified collision resolution function (`resolveAreaCollisions`) to prevent duplicate logic and infinite loops
- **Shift+Drag Operations**: When implementing Shift+drag features, remember to: (1) disable collision detection, (2) freeze area bounds using cache, (3) exclude dragged item from area calculations, (4) use frozen cached bounds for overlap detection
- **Logging**: NEVER add console.log statements in render functions, useEffect callbacks, or frequently-called functions (e.g., calculateCategoryArea, renderSingleCategoryArea) as they cause infinite log spam and make debugging impossible. Only log in event handlers (onClick, onMouseDown, etc.) or one-time initialization code

## Responsive Design Guidelines (Desktop-Down Approach)

### ⚠️ CRITICAL: PC 버전 보호 원칙

**모바일 기능 개발 시 PC 버전이 망가지지 않도록 반드시 준수해야 할 규칙:**

1. **조건부 로직 필수**: 모바일 전용 코드는 반드시 `isMobile` 체크 또는 `onOpenEditor` 존재 여부로 조건 분기
   ```typescript
   // GOOD - 조건부 분기
   if (onOpenEditor) {
     // 모바일 전용 로직
     onOpenEditor();
   } else {
     // PC 전용 로직
     setIsEditing(true);
   }

   // BAD - 무조건 실행
   if (onOpenEditor) {
     onOpenEditor();
   }
   // PC에서는 아무 일도 안 일어남!
   ```

2. **이벤트 핸들러 차단 금지**: `e.stopPropagation()`, `e.preventDefault()`, `return` 등으로 이벤트를 차단할 때 PC 버전에 영향이 없는지 확인
   - **특히 주의**: `data-*` 속성으로 특정 영역을 감지하여 이벤트를 차단하는 코드는 PC 드래그까지 막을 수 있음

3. **테스트 필수**: 모바일 코드를 수정한 후 반드시 PC 버전(768px 초과)에서 테스트
   - 드래그 앤 드롭이 정상 작동하는지 확인
   - 더블클릭 편집이 정상 작동하는지 확인
   - 선택, 연결 등 모든 인터랙션이 정상인지 확인

4. **CSS 미디어 쿼리 사용**: 스타일 변경은 JavaScript가 아닌 CSS 미디어 쿼리 사용
   ```scss
   // GOOD
   .button {
     padding: 10px; // PC 기본값
   }

   @media (max-width: 768px) {
     .button {
       padding: 20px; // 모바일에서만 오버라이드
     }
   }
   ```

5. **공통 로직 재사용**: PC와 모바일이 같은 기능을 다르게 구현할 때, 가능하면 공통 로직을 공유하고 UI만 다르게 처리

### 1. 기본 원칙: Desktop-Down (점진적 축소)

- **현재 상태**: 데스크톱 버전 웹 애플리케이션이 이미 완성됨
- **접근 방식**: 'Progressive Degradation' 방식 사용
- **핵심**: 데스크톱 스타일(기본)을 기준으로, 화면 크기가 작아질 때 스타일을 덮어쓰는(override) 방식으로 수정

### 2. 필수 설정 (Global Setup)

**HTML**: `<head>` 태그에 뷰포트 메타 태그 반드시 포함
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

**CSS (Global)**: 유연한 미디어(이미지, 비디오 등)가 부모 요소를 벗어나지 않도록 설정
```css
img, video, iframe {
  max-width: 100%;
  height: auto;
}
```

### 3. 미디어 쿼리 (Media Query) 전략

- **사용 구문**: `max-width`를 사용하여 화면이 특정 너비 '이하'일 때 스타일 적용
- **분기점 (Breakpoints)**: 특정 기기가 아닌, 레이아웃이 시각적으로 깨지는 지점을 기준으로 설정 (예: 1024px, 768px, 480px)

**작성 예시**:
```scss
/* 1. 기본 스타일 (Desktop) */
.container {
  width: 1200px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

/* 2. 태블릿 (1024px 이하) */
@media (max-width: 1024px) {
  .container {
    width: 100%;
    grid-template-columns: 1fr 1fr; /* 2열 */
  }
}

/* 3. 모바일 (768px 이하) */
@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr; /* 1열 */
  }
}
```

### 4. 핵심 수정 가이드 (Checklist)

#### 4.1. 고정 폭(px) → 유동 폭(%, max-width)
- **문제**: `width: 1200px;`
- **수정**: `max-width: 1200px; width: 100%;` (좌우 padding은 별도 지정)

#### 4.2. 내비게이션 (GNB)
- **데스크톱**: 가로형 메뉴
- **모바일/태블릿**:
  - 데스크톱 메뉴는 `display: none;` 처리
  - '햄버거 버튼(☰)'과 클릭 시 동작하는 메뉴(사이드바, 아코디언 등)를 `display: block;`으로 활성화 (JavaScript 로직 필요)

#### 4.3. 터치 이벤트 (:hover 금지)
- **문제**: 마우스 hover에 의존하는 모든 기능 (드롭다운, 툴팁 등)
- **수정**: click (또는 tap) 이벤트로 동작하도록 변경. 모바일에서는 `:hover`가 없음

#### 4.4. 터치 영역 (Touch Target)
- **문제**: 손가락으로 누르기 힘든 작은 버튼, 링크, 아이콘
- **수정**: 시각적 크기와 별개로 padding을 추가하여 최소 터치 영역(44px x 44px 이상) 확보

#### 4.5. 단위 (Units)
- **레이아웃**: 고정 px 대신 flex, grid, % 사용 지향
- **폰트/여백**: px 대신 rem 단위 우선 고려 (미디어 쿼리 내에서 font-size 재조정)

### 5. 터치 상호작용 (Touch Interaction) 심화 규칙

데스크톱의 '마우스' 환경과 모바일/태블릿의 '터치' 환경은 근본적으로 다름. 다음 규칙을 준수하여 터치 환경의 버그를 방지하고 사용성을 향상.

#### 5.1. '끈적한 호버(Sticky Hover)' 현상 방지

**문제**: 모바일에서 `:hover` 스타일이 적용된 요소를 탭(Tap)하면, 손가락을 뗀 후에도 `:hover` 스타일이 사라지지 않고 남아있는 버그 발생

**규칙**: `:hover` 스타일은 '실제로 호버가 가능한 기기(마우스 사용자 등)'에서만 적용

**해결책**: CSS의 `(hover: hover)` 미디어 쿼리를 사용하여 스타일 분리

```scss
/* .button:hover 스타일은 기본 CSS에 작성하지 않음
   대신, 모바일 사용자를 위해 :active (누르는 순간) 피드백을 줌 */
.button:active {
  background-color: darkblue; /* 예시: 누르는 순간의 피드백 */
}

/* @media (hover: hover)
   마우스 포인터 등 '진짜 호버'가 가능한 기기에서만
   :hover 스타일이 적용되도록 격리 */
@media (hover: hover) {
  .button:hover {
    background-color: navy; /* 데스크톱 전용 호버 스타일 */
  }
}
```

#### 5.2. 제스처 (Gestures) 충돌 방지 및 접근성

**핀치 줌 (Pinch-to-Zoom)**:
- **규칙**: 웹 접근성을 위해 사용자의 화면 확대/축소 기능을 절대 막지 않음
- **금지**: `<meta name="viewport" ... content="user-scalable=no">` 속성 사용 금지 (기본 뷰포트 태그 유지)

**스와이프 (Swipe)**:
- **주의**: 이미지 캐러셀, 탭 등에 스와이프 기능을 적용할 경우, 브라우저의 기본 '페이지 뒤로 가기 / 앞으로 가기' 스와이프 제스처와 충돌하지 않도록 터치 영역(edge) 신중하게 설정

#### 5.3. 정보 밀도와 간격 (Density & Spacing)

**문제**: 손가락은 마우스보다 뭉툭하고 부정확함

**규칙 1 (간격)**: 터치 영역(44px) 확보뿐만 아니라, 클릭 가능한 요소와 요소 사이의 간격(margin)도 충분히 확보하여 잘못된 터치 방지

**규칙 2 (밀도)**: 데스크톱의 빽빽한 UI(예: 복잡한 데이터 테이블)는 모바일에서 사용 불가능. '카드(Card)형 리스트' 등으로 레이아웃을 단순화하고 정보 밀도를 낮추는 방향으로 리디자인

### 6. 모바일/태블릿 레이아웃 전략 (페이지 분리 방식)

#### 6.1. 레이아웃 구조

**데스크톱 (768px 초과)**:
- 3패널 레이아웃: Left Panel - Canvas - Right Panel
- Resizer로 패널 크기 조정 가능
- 모든 패널이 동시에 표시됨

**모바일/태블릿 (768px 이하)**:
- **완전 분리된 단일 뷰 시스템**
- 하단 탭 네비게이션으로 뷰 전환
- 3개의 독립적인 풀스크린 뷰:
  1. **Pages 뷰**: 페이지 목록 (LeftPanel fullscreen)
  2. **Canvas 뷰**: 마인드맵 캔버스 (Canvas fullscreen)
  3. **Editor 뷰**: 메모 편집 (RightPanel fullscreen)

#### 6.2. 구현 방법

**컴포넌트 구조**:
```
src/components/
  └── MobileLayout/
      ├── MobileLayout.tsx         # 모바일 레이아웃 컴포넌트
      ├── BottomTabBar.tsx         # 하단 탭 네비게이션
      └── hooks/
          └── useMobileLayout.ts   # 뷰 전환 상태 관리
```

**App.tsx 분기 로직**:
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

return isMobile ? (
  <MobileLayout {...props} />
) : (
  <DesktopLayout {...props} />  // 기존 3패널 레이아웃
);
```

#### 6.3. 상태 관리

- **전역 상태**: Context API로 모든 앱 상태 공유
- **뷰 전환 시 상태 유지**:
  - 선택된 메모/카테고리
  - 스크롤 위치
  - 편집 중인 콘텐츠
- **Navigation state**: `activeView` ('pages' | 'canvas' | 'editor')

#### 6.4. 각 패널의 fullscreen prop

모든 패널 컴포넌트에 `fullscreen?: boolean` prop 추가:
- `true`: 전체 화면 모드, Resizer 숨김, 모바일 최적화 스타일 적용
- `false` (기본): 데스크톱 모드

**예시**:
```tsx
<LeftPanel fullscreen={isMobile} />
<Canvas fullscreen={isMobile} />
<RightPanel fullscreen={isMobile} />
```

#### 6.5. 하단 탭 네비게이션

**디자인**:
- 고정 하단 바 (position: fixed, bottom: 0)
- 3개 탭: Pages / Canvas / Editor
- 아이콘 + 라벨
- 활성 탭 강조 표시
- 최소 터치 영역: 44px 높이

**아이콘** (lucide-react):
- Pages: `<FileText />`
- Canvas: `<Map />`
- Editor: `<Edit3 />`

### 7. 반응형 구현 체크리스트

**필수 설정**:
- [ ] 뷰포트 메타 태그 추가 (`src/app/layout.tsx`)
- [ ] 전역 미디어 스타일 설정 (`src/app/globals.css`)
- [ ] 미디어 쿼리 분기점 설정 (768px)

**모바일 레이아웃**:
- [ ] MobileLayout 컴포넌트 생성
- [ ] BottomTabBar 컴포넌트 생성
- [ ] 뷰 전환 상태 관리 훅 생성
- [ ] App.tsx에 화면 크기 감지 로직 추가
- [ ] 각 패널에 fullscreen prop 추가

**터치 최적화**:
- [ ] `:hover` 스타일을 `@media (hover: hover)` 내부로 이동
- [ ] 모바일용 `:active` 피드백 추가
- [ ] 터치 영역 44px 이상 확보 (버튼, 링크, 아이콘)
- [ ] 요소 간 충분한 간격(margin) 확보
- [ ] 컨텍스트 메뉴를 롱프레스/버튼으로 변경
- [ ] 드래그 앤 드롭을 터치 드래그로 변환

**스타일 조정**:
- [ ] 고정 폭을 유동 폭으로 변경 (모든 컴포넌트 SCSS)
- [ ] 폰트 크기를 rem 단위로 변경
- [ ] 레이아웃을 flex/grid로 변경
- [ ] 모바일에서 정보 밀도 낮추기
- [ ] 핀치 줌 기능 유지 (`user-scalable=no` 금지)

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.