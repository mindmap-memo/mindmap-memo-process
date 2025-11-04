import React, { createContext, useContext, ReactNode } from 'react';
import { MemoBlock, CategoryBlock, ImportanceLevel } from '../types';

// Selection Context 타입 정의
export interface SelectionContextType {
  // 메모 선택
  selectedMemoId: string | null;
  setSelectedMemoId: (id: string | null) => void;
  selectedMemoIds: string[];
  setSelectedMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];

  // 카테고리 선택
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategory: CategoryBlock | undefined;
  selectedCategories: CategoryBlock[];

  // 드래그 선택
  isDragSelecting: boolean;
  setIsDragSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  dragSelectStart: { x: number; y: number } | null;
  setDragSelectStart: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  dragSelectEnd: { x: number; y: number } | null;
  setDragSelectEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  dragHoveredMemoIds: string[];
  setDragHoveredMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  dragHoveredCategoryIds: string[];
  setDragHoveredCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isDragSelectingWithShift: boolean;
  setIsDragSelectingWithShift: React.Dispatch<React.SetStateAction<boolean>>;

  // 선택 핸들러
  handleMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  selectCategory: (categoryId: string | null, isShiftClick?: boolean) => void;

  // 필터
  activeImportanceFilters: Set<ImportanceLevel>;
  setActiveImportanceFilters: React.Dispatch<React.SetStateAction<Set<ImportanceLevel>>>;
  showGeneralContent: boolean;
  setShowGeneralContent: React.Dispatch<React.SetStateAction<boolean>>;
  toggleImportanceFilter: (level: ImportanceLevel) => void;
  toggleGeneralContent: () => void;

  // 드래그 상태
  isDraggingMemo: boolean;
  setIsDraggingMemo: React.Dispatch<React.SetStateAction<boolean>>;
  draggingMemoId: string | null;
  setDraggingMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  isDraggingCategory: boolean;
  setIsDraggingCategory: React.Dispatch<React.SetStateAction<boolean>>;
}

// Context 생성
const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Provider Props
interface SelectionProviderProps {
  children: ReactNode;
  value: SelectionContextType;
}

// Provider 컴포넌트
export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children, value }) => {
  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

// Custom Hook
export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};
