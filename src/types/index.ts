// Content Block Types
export type ContentBlockType = 
  | 'text'
  | 'callout'
  | 'checklist'
  | 'image'
  | 'file'
  | 'bookmark'
  | 'quote'
  | 'code'
  | 'table'
  | 'sheets';

// Importance System
export type ImportanceLevel = 'critical' | 'important' | 'opinion' | 'reference' | 'question' | 'idea' | 'data' | 'none';

export interface ImportanceRange {
  start: number;
  end: number;
  level: ImportanceLevel;
  note?: string; // 사용자 메모나 이유
}

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
}

export interface TextBlock extends BaseContentBlock {
  type: 'text';
  content: string;
  importanceRanges?: ImportanceRange[]; // 텍스트 내 중요도 범위들
}

export interface CalloutBlock extends BaseContentBlock {
  type: 'callout';
  content: string;
  emoji?: string;
  color?: string;
  importance?: ImportanceLevel;
}

export interface ChecklistBlock extends BaseContentBlock {
  type: 'checklist';
  items: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
  importance?: ImportanceLevel;
}

export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  importance?: ImportanceLevel;
}

export interface FileBlock extends BaseContentBlock {
  type: 'file';
  url: string;
  name: string;
  size?: number;
  type_info?: string;
  importance?: ImportanceLevel;
}

export interface BookmarkBlock extends BaseContentBlock {
  type: 'bookmark';
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  importance?: ImportanceLevel;
}

export interface QuoteBlock extends BaseContentBlock {
  type: 'quote';
  content: string;
  author?: string;
  importance?: ImportanceLevel;
}

export interface CodeBlock extends BaseContentBlock {
  type: 'code';
  content: string;
  language?: string;
  importance?: ImportanceLevel;
}

// Enhanced table cell types
export type CellType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'formula' | 'file' | 'email' | 'phone';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

export interface TableCell {
  value: any;
  type: CellType;
  dataName?: string;     // Named data reference like "예산_총액"
  description?: string;  // Description of the data
  unit?: string;        // Unit (원, %, 개, etc.)
  isKey: boolean;       // Is this a key data point for referencing
  validation?: ValidationRule;
  format?: string;      // Date format, number format, etc.
  formula?: string;     // Formula if type is 'formula'
  options?: string[];   // Options for select type
}

export interface CellReference {
  pageId: string;
  memoId: string;
  blockId: string;
  cellId: string;
}

export interface DataLink {
  id: string;
  sourceData: string;   // "@예산_총액"
  targetCells: CellReference[];
  linkType: 'direct' | 'formula' | 'condition';
  updatePolicy: 'realtime' | 'manual' | 'scheduled';
}

export interface DataRegistry {
  [key: string]: {
    value: any;
    source: CellReference;
    type: string;
    lastUpdated: Date;
    dependents: string[]; // Other data names that reference this
  };
}

export interface TableColumn {
  id: string;
  name: string;
  type: CellType;
  options?: string[]; // For select type columns
  format?: string; // Date format, number format, etc.
  validation?: ValidationRule;
}

export interface TableBlock extends BaseContentBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  // Enhanced table properties
  columns?: TableColumn[]; // Column definitions with types
  cells?: TableCell[][]; // Enhanced cell data structure
  tableType?: 'data-collection' | 'approval-matrix' | 'timeline' | 'checklist' | 'basic';
  template?: string;
  autoSum?: boolean;
  dependencies?: DataLink[];
  permissions?: { [cellId: string]: string[] }; // Cell permissions by user
  importance?: ImportanceLevel;
}

export interface SheetsBlock extends BaseContentBlock {
  type: 'sheets';
  url: string;
  width?: number;
  height?: number;
  title?: string;
  zoom?: number; // 확대/축소 비율 (%)
  importance?: ImportanceLevel;
}

export type ContentBlock = 
  | TextBlock
  | CalloutBlock
  | ChecklistBlock
  | ImageBlock
  | FileBlock
  | BookmarkBlock
  | QuoteBlock
  | CodeBlock
  | TableBlock
  | SheetsBlock;

export type MemoDisplaySize = 'small' | 'medium' | 'large';

export interface MemoBlock {
  id: string;
  title: string;
  content: string; // 기존 호환성을 위해 유지
  blocks: ContentBlock[]; // 새로운 블록 기반 콘텐츠
  tags: string[];
  connections: string[];
  position: { x: number; y: number };
  size?: { width: number; height: number };
  displaySize?: MemoDisplaySize; // 캔버스에서의 표시 크기
  parentId?: string | null; // 부모 카테고리 ID (종속 관계)
}

// 카테고리(폴더) 블록 타입
export interface CategoryBlock {
  id: string;
  title: string;
  tags: string[];
  connections: string[]; // 연결된 아이템 IDs (MemoBlock 또는 CategoryBlock)
  position: { x: number; y: number };
  originalPosition?: { x: number; y: number }; // 생성 시 초기 위치 (영역 계산용)
  size?: { width: number; height: number };
  isExpanded: boolean; // 펼침/접기 상태
  children: string[]; // 하위 블록 IDs (MemoBlock 또는 CategoryBlock)
  parentId?: string; // 부모 카테고리 ID
}

// 캔버스 아이템 타입 (메모 또는 카테고리)
export type CanvasItem = MemoBlock | CategoryBlock;

// 타입 가드 함수들
export function isMemoBlock(item: CanvasItem): item is MemoBlock {
  return 'content' in item;
}

export function isCategoryBlock(item: CanvasItem): item is CategoryBlock {
  return 'isExpanded' in item;
}

export interface Page {
  id: string;
  name: string;
  memos: MemoBlock[];
  categories: CategoryBlock[]; // 카테고리 블록들
}

// Canvas action types for history tracking
export type CanvasActionType =
  | 'memo_create'
  | 'memo_delete'
  | 'memo_move'
  | 'memo_resize'
  | 'category_create'
  | 'category_delete'
  | 'category_move'
  | 'category_resize'
  | 'category_expand'
  | 'connection_add'
  | 'connection_remove'
  | 'move_to_category'
  | 'bulk_select'
  | 'bulk_move'
  | 'bulk_delete';

export interface CanvasAction {
  type: CanvasActionType;
  timestamp: number;
  pageSnapshot: {
    memos: MemoBlock[];
    categories: CategoryBlock[];
  };
  description: string;
}

export interface CanvasHistory {
  past: CanvasAction[];
  present: CanvasAction | null;
  future: CanvasAction[];
  maxHistorySize: number;
}

// Quick Navigation
export type QuickNavTargetType = 'memo' | 'category';

export interface QuickNavItem {
  id: string;
  name: string;
  targetId: string;
  targetType: QuickNavTargetType;
  pageId: string; // 어느 페이지에 있는지
}

// Tutorial System
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'drag' | 'type' | 'none'; // Required user action
  validation?: () => boolean; // Check if step is completed
  nextButtonText?: string;
}

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  completed: boolean;
}

export interface AppState {
  pages: Page[];
  currentPageId: string;
  selectedMemoId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  dataRegistry: DataRegistry; // Global data registry for named data
  canvasHistory: CanvasHistory; // Canvas-specific undo/redo history
  quickNavItems?: QuickNavItem[]; // Quick navigation shortcuts
  tutorialState?: TutorialState; // Tutorial state
}