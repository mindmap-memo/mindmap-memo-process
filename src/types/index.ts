// Content Block Types
export type ContentBlockType =
  | 'text'
  | 'image'
  | 'file'
  | 'bookmark';

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

export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  url: string; // 기존 호환성
  src?: string; // TipTap ImageNode용 (url과 동일)
  alt?: string;
  caption?: string;
  width?: number;
  importance?: ImportanceLevel;
}

export interface FileBlock extends BaseContentBlock {
  type: 'file';
  url: string; // 기존 호환성
  name: string; // 기존 호환성
  size?: number; // 기존 호환성
  type_info?: string; // 기존 호환성
  // TipTap FileNode용 필드들
  fileName?: string; // name과 동일
  fileSize?: number; // size와 동일
  fileType?: string; // type_info와 동일
  fileData?: string; // url과 동일 (base64 data)
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

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | FileBlock
  | BookmarkBlock;

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
  importance?: ImportanceLevel; // 메모 전체의 중요도
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
  quickNavItems?: QuickNavItem[]; // 페이지별 즐겨찾기 목록
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
export interface TutorialSubStep {
  order: number; // 1, 2, 3, ...
  description: string; // 서브스텝 설명
  targetElement?: string; // 애니메이션 타겟 (CSS selector)
  animationType: 'cursor-click' | 'cursor-drag' | 'cursor-hover' | 'highlight' | 'none';
  eventType: 'memo-created' | 'connection-started' | 'connection-completed' | 'category-created' | 'memo-added-to-category' | 'custom';
  customValidation?: () => boolean; // 커스텀 이벤트 검증 함수
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'bottom-right';
  action?: 'click' | 'drag' | 'type' | 'none'; // Required user action
  validation?: () => boolean; // Check if step is completed
  nextButtonText?: string;
  subSteps?: TutorialSubStep[]; // 순차적으로 진행되는 서브스텝들
}

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  completed: boolean;
  currentSubStep?: number; // 현재 서브스텝 인덱스 (0부터 시작)
}

export interface AppState {
  pages: Page[];
  currentPageId: string;
  selectedMemoId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  canvasHistory: CanvasHistory; // Canvas-specific undo/redo history
  tutorialState?: TutorialState; // Tutorial state
}