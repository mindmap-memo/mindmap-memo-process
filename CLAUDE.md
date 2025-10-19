# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Create production build in `.next/` directory
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks
- `npx tsc --noEmit` - Type check without compilation

## Application Architecture

This is a Next.js 15 (App Router) TypeScript mindmap memo application. The app provides an interactive canvas for creating, connecting, and organizing memo blocks in a mind mapping interface with server-side rendering and modern React features.

### Core Architecture

- **Next.js App Router**: Modern React Server Components and Client Components architecture
- **Main Page Component** (`src/app/page.tsx`): Client component that manages application state with custom hooks and contexts
- **Three-Panel Layout**: Resizable left panel (pages), center canvas (mindmap), right panel (memo editing)
- **State Management**: Uses React Context API with custom hooks for state management and sharing between components
- **Server-Side Features**: Leverages Next.js for optimal performance with SSR/SSG capabilities

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

- Uses Next.js 15 with React 19 and TypeScript
- **Next.js App Router**: Utilizes the modern App Router architecture with proper separation of Server and Client Components
- **Client Components**: All interactive components marked with 'use client' directive for client-side interactivity
- **Styling with SCSS**: All component styles are organized in the `src/scss/` directory, mirroring the component structure. Component SCSS files are located in `src/scss/` with paths matching their component locations (e.g., `src/components/Canvas.tsx` → `src/scss/Canvas.scss`, `src/components/blocks/CodeBlock.tsx` → `src/scss/components/blocks/CodeBlock.scss`)
- **SCSS Module Pattern**: Import styles from `src/scss/` using relative paths: `import styles from '../../scss/ComponentName.scss'` and use `className={styles.className}` for type-safe class names
- **No Inline Styles**: Avoid inline styles; use SCSS classes for all styling. Only use inline styles for dynamic values that must be calculated at runtime (e.g., positions, transforms, colors that change based on data)
- Connection lines drawn with SVG overlays
- ResizeObserver for dynamic memo block sizing
- Bidirectional memo connections (stored in both memo's connections arrays)
- Complex state management with multiple selection modes and interaction states using React Context
- Event delegation and coordinate transformation for accurate drag operations

### Important Implementation Details

- **State Flow**: State managed through custom hooks and React Context API for sharing between components without prop drilling
- **Client-Side Rendering**: All interactive components use 'use client' directive for proper Next.js client-side functionality
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

7. **페이지 컴포넌트의 비대화 방지 (CRITICAL)**
   - **절대 금지**: page.tsx에 모든 상태를 두는 방식 사용 금지
   - **새로운 기능 제작 시**: 반드시 커스텀 훅으로 제작 (유틸 함수는 유틸 함수로 제작)
   - **page.tsx의 역할**: 훅을 호출하고 조합하는 역할만 수행, 기능 자체의 코드가 작성되어서는 안 됨
   - **아키텍처 패턴** (Next.js App Router):
     1. 커스텀 훅으로 상태와 관리 로직 작성 (`src/hooks/`)
     2. 훅에서 반환된 상태와 함수들을 Context에 담아 전역적으로 제공 (`src/contexts/`)
     3. Context Provider는 page.tsx 또는 별도 Provider 컴포넌트에서 설정
     4. 하위 컴포넌트에서는 useContext 훅을 사용해 props 전달 없이 바로 상태에 접근
   - **훅 문서화**: 새로운 훅을 만들 때마다 해당 훅의 목적, 사용법, 반환값을 문서화
   - **예시**:
     - `useDragState.ts` - 드래그 관련 상태 관리
     - `usePanelState.ts` - 패널 상태 관리
     - `useSelectionHandlers.ts` - 선택 관련 핸들러

8. **컴포넌트의 비대화 방지 (CRITICAL)**
   - **문제**: 컴포넌트 파일이 커지면 유지보수가 어려워지고 가독성이 떨어짐
   - **원칙**: page.tsx와 동일하게 컴포넌트도 로직을 분리해야 함
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

9. **성능 최적화 (Memoization) (CRITICAL)**
   - **문제**: 캔버스 기반 앱은 드래그, 리사이즈, 충돌 감지 등으로 인해 불필요한 리렌더링이 성능 저하의 주범
   - **React.memo 적극 사용**:
     - 캔버스 위에 렌더링되는 컴포넌트 (MemoBlock, CategoryArea, CategoryBlock 등)는 반드시 React.memo로 감싸기
     - Props가 변경되지 않으면 리렌더링되지 않도록 최적화
     - 예: `export default React.memo(MemoBlock)`
   - **useCallback 생활화**:
     - page.tsx나 상위 컴포넌트에서 하위 컴포넌트로 전달하는 모든 이벤트 핸들러는 useCallback으로 감싸기
     - 예: `onDragStart`, `onClick`, `onMemoUpdate` 등
     - useCallback 없이 함수를 전달하면 매번 새로운 함수가 생성되어 React.memo가 무력화됨
   - **useMemo 활용**:
     - `calculateCategoryArea`처럼 비용이 많이 드는 계산은 useMemo로 캐싱
     - 하위 컴포넌트에 props로 전달되는 배열/객체는 useMemo를 사용하여 불필요한 재생성 방지
     - 예: `const categoryAreas = useMemo(() => calculateAreas(categories), [categories])`
   - **최적화 검증**:
     - React DevTools Profiler를 사용하여 리렌더링 횟수 확인
     - 드래그 중 모든 컴포넌트가 리렌더링되면 안 됨 - 오직 변경된 컴포넌트만 리렌더링되어야 함

10. **상수 및 설정 관리 (CRITICAL)**
    - **문제**: 매직 넘버(300ms, 50ms 등)가 코드 곳곳에 하드코딩되면 수정 시 누락 위험
    - **상수 중앙 관리**: `src/constants/` 디렉토리에 모든 상수 값 관리
    - **파일 구조**:
      ```
      src/constants/
      ├── layout.ts      # 패널 기본/최소 너비, 리사이저 크기 등
      ├── timing.ts      # AUTO_SAVE_DEBOUNCE = 300, FOCUS_DELAY = 50 등
      ├── keys.ts        # KEY_CODE.SHIFT, KEY_CODE.CTRL 등
      └── app.ts         # DEFAULT_BLOCK_TYPE = 'text' 등
      ```
    - **예시**:
      ```typescript
      // src/constants/timing.ts
      export const TIMING = {
        AUTO_SAVE_DEBOUNCE: 300,
        FOCUS_DELAY: 50,
        MERGE_FOCUS_DELAY: 100,
      } as const;

      // src/constants/layout.ts
      export const LAYOUT = {
        LEFT_PANEL_DEFAULT_WIDTH: 250,
        LEFT_PANEL_MIN_WIDTH: 150,
        RIGHT_PANEL_DEFAULT_WIDTH: 400,
        RESIZER_WIDTH: 4,
      } as const;
      ```
    - **사용 방법**: `import { TIMING } from '@/constants/timing'` 후 `TIMING.AUTO_SAVE_DEBOUNCE` 사용
    - **장점**: 값 변경 시 한 곳만 수정하면 되고, 타입 안정성 확보

### Testing Strategy

**복잡한 로직은 테스트가 필수입니다. 충돌 감지, undo/redo, 드래그 앤 드롭 등 핵심 기능에 대한 테스트를 작성하여 코드 안정성을 확보합니다.**

1. **유틸 함수 (Unit Test)**
   - `src/utils/` 폴더의 모든 순수 함수는 Jest로 유닛 테스트 작성
   - 테스트 대상:
     - `calculateCategoryArea` - 다양한 케이스의 영역 계산 검증
     - `resolveAreaCollisions` - 충돌 감지 로직의 정확성 검증
     - `categoryAreaUtils.ts`의 모든 함수
     - `collisionUtils.ts`의 모든 함수
   - 목표: 100% 코드 커버리지
   - 예시:
     ```typescript
     describe('calculateCategoryArea', () => {
       it('should calculate area with padding', () => {
         const result = calculateCategoryArea(category, memos, categories);
         expect(result.width).toBeGreaterThan(0);
       });
     });
     ```

2. **컴포넌트 (Integration Test)**
   - React Testing Library (RTL)로 주요 인터랙션 테스트
   - 테스트 대상:
     - RightPanel의 블록 편집 (생성, 삭제, 변환)
     - Canvas의 드래그 앤 드롭
     - LeftPanel의 페이지 관리
   - 사용자 관점에서 테스트 작성
   - 예시:
     ```typescript
     test('creates new text block on Enter key', async () => {
       render(<RightPanel />);
       const textInput = screen.getByRole('textbox');
       await userEvent.type(textInput, 'Hello{Enter}');
       expect(screen.getAllByRole('textbox')).toHaveLength(2);
     });
     ```

3. **핵심 기능 (E2E Test)**
   - Playwright 또는 Cypress로 주요 유저 시나리오 테스트
   - 테스트 시나리오:
     - "메모 생성 → 카테고리 생성 → Shift+Drag로 메모를 카테고리에 추가"
     - "메모 간 연결 생성 및 해제"
     - "Undo/Redo 동작 검증"
     - "블록 타입 변환 및 내용 유지 확인"
   - CI/CD 파이프라인에 통합하여 자동 실행
   - 예시 (Playwright):
     ```typescript
     test('add memo to category with Shift+Drag', async ({ page }) => {
       await page.goto('/');
       await page.click('[data-testid="create-memo"]');
       await page.click('[data-testid="create-category"]');
       // Shift+Drag 시뮬레이션
       await page.keyboard.down('Shift');
       await page.dragAndDrop('[data-memo-id="1"]', '[data-category-id="1"]');
       await page.keyboard.up('Shift');
       // 검증
       expect(await page.locator('[data-category-id="1"] [data-memo-id="1"]').count()).toBe(1);
     });
     ```

4. **테스트 작성 원칙**
   - 새로운 유틸 함수 작성 시 반드시 테스트도 함께 작성
   - 버그 수정 시 해당 버그를 재현하는 테스트를 먼저 작성 (TDD)
   - 테스트는 `__tests__/` 폴더 또는 `*.test.ts` 파일로 관리
   - 테스트 실행: `npm test`

### Git Commit Convention

**프로젝트 히스토리를 명확하게 관리하기 위해 Conventional Commits 규칙을 따릅니다.**

- **feat:** 새로운 기능 추가
  - 예: `feat: Add Shift+Drag parent-child system`
  - 예: `feat: Implement undo/redo for canvas operations`

- **fix:** 버그 수정
  - 예: `fix: Resolve infinite loop in collision detection`
  - 예: `fix: Prevent category area recalculation during drag`

- **refactor:** 코드 리팩토링 (기능 변경 없이 코드 구조 개선)
  - 예: `refactor: Separate drag logic into useDragState hook`
  - 예: `refactor: Extract collision detection to utils`

- **docs:** 문서 수정
  - 예: `docs: Update CLAUDE.md with testing guidelines`
  - 예: `docs: Add performance optimization section`

- **style:** 코드 스타일 변경 (SCSS, 포맷팅, 세미콜론 등)
  - 예: `style: Update Canvas.scss with new color scheme`
  - 예: `style: Format code with prettier`

- **test:** 테스트 추가 또는 수정
  - 예: `test: Add unit tests for calculateCategoryArea`
  - 예: `test: Add E2E test for memo creation flow`

- **chore:** 빌드 설정, 패키지 업데이트 등
  - 예: `chore: Update Next.js to 15.1`
  - 예: `chore: Add Jest configuration`

- **perf:** 성능 개선
  - 예: `perf: Add React.memo to MemoBlock component`
  - 예: `perf: Optimize category area calculation with useMemo`

**커밋 메시지 형식:**
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**예시:**
```
feat: Add multi-select for content blocks

- Implement drag selection in RightPanel
- Add Ctrl+A shortcut for selecting all blocks
- Add Delete key handler for selected blocks

Closes #123
```

### Specific Implementation Guidelines

- **File Management**: Always prefer editing existing files to creating new ones; never create files unless absolutely necessary
- **Styling Guidelines (SCSS Module Pattern)**:
  - **ALWAYS use SCSS files** for component styling instead of inline styles
  - **중앙 관리 원칙**: All SCSS files are organized in `src/scss/` directory, mirroring the component structure
  - For components in `src/components/`, create corresponding SCSS in `src/scss/` (e.g., `src/components/Canvas.tsx` → `src/scss/Canvas.scss`)
  - For nested components, maintain the same path structure (e.g., `src/components/blocks/CodeBlock.tsx` → `src/scss/components/blocks/CodeBlock.scss`)
  - Import as SCSS module using relative paths: `import styles from '../../scss/ComponentName.scss'`
  - **절대 금지**: 컴포넌트 폴더 내부에 `.module.scss` 파일을 생성하지 마십시오. 모든 스타일은 `src/scss/` 디렉토리에서 중앙 관리합니다.
  - Use className for static styles, inline style only for dynamic runtime values
  - Organize SCSS with nested selectors matching component structure
  - **Dynamic Values Only**: Use inline styles ONLY for values that change at runtime (positions, transforms, sizes, data-driven colors)
  - **Example of proper usage**:
    ```tsx
    // GOOD - import from src/scss/ (central management)
    import styles from '../../scss/Canvas.scss';

    // BAD - DO NOT create SCSS in component folder
    import styles from './Canvas.module.scss'; // ❌ NEVER DO THIS

    // GOOD - dynamic position
    <div className={styles.memoBlock} style={{ left: `${memo.position.x}px`, top: `${memo.position.y}px` }}>

    // BAD - static styles inline
    <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px' }}>

    // GOOD - static styles in SCSS
    <div className={styles.container}>
    ```
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