import React, { createContext, useContext, ReactNode } from 'react';
import { Page, MemoBlock, CategoryBlock } from '../types';

// AppState Context 타입 정의
export interface AppStateContextType {
  // 페이지 관련
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  setCurrentPageId: (id: string) => void;
  currentPage: Page | undefined;

  // 캔버스 상태
  canvasOffset: { x: number; y: number };
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasScale: number;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;

  // Shift 키 상태
  isShiftPressed: boolean;
  setIsShiftPressed: React.Dispatch<React.SetStateAction<boolean>>;

  // 핸들러 함수들
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onCategorySizeChange: (categoryId: string, size: { width: number; height: number }) => void;
  onMemoDisplaySizeChange: (memoId: string, displaySize: 'small' | 'default' | 'medium' | 'large') => void;
  onMemoTitleUpdate: (memoId: string, title: string) => void;
  onMemoBlockUpdate: (memoId: string, blockId: string, content: string) => void;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onCategoryToggleExpanded: (categoryId: string) => void;
  onMoveToCategory: (itemId: string, categoryId: string | null) => void;
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory: (categoryId: string, position: { x: number; y: number }) => void;
  onDeleteMemo: (memoId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteSelected: () => void;
  onMemoUpdate: (memo: MemoBlock) => void;
  onFocusMemo: (memoId: string) => void;
  onResetFilters: () => void;
  onCategoryPositionDragEnd: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onCategoryDragStart: () => void;
  onCategoryDragEnd: () => void;
  onMemoDragStart: (memoId: string) => void;
  onMemoDragEnd: () => void;
  onShiftDropCategory: (categoryId: string, targetCategoryId: string | null) => void;
  onClearCategoryCache: () => void;
  onDeleteMemoById: (memoId: string) => void;
  onAddQuickNav: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onAddMemo: (position: { x: number; y: number }) => void;
  onAddCategory: (position: { x: number; y: number }) => void;
  isDragSelecting: boolean;
  dragSelectStart: { x: number; y: number } | null;
  dragSelectEnd: { x: number; y: number } | null;
  dragHoveredMemoIds: string[];
  dragHoveredCategoryIds: string[];
  onDragSelectStart: (start: { x: number; y: number }) => void;
  onDragSelectMove: (current: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;
  activeImportanceFilters: number[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDraggingMemo: boolean;
  draggingMemoId: string | null;
  shiftDragAreaCacheRef: React.MutableRefObject<Map<string, any>>;
  isDraggingCategory: boolean;
  draggingCategoryId: string | null;
  onDisconnectMemo: () => void;
  dragLineEnd: { x: number; y: number } | null;
}

// Context 생성
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Provider Props
interface AppStateProviderProps {
  children: ReactNode;
  value: AppStateContextType;
}

// Provider 컴포넌트
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children, value }) => {
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom Hook
export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within AppStateProvider');
  }
  return context;
};
