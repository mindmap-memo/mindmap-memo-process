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

  // 드래그 상태
  isDraggingMemo: boolean;
  setIsDraggingMemo: React.Dispatch<React.SetStateAction<boolean>>;
  draggingMemoId: string | null;
  setDraggingMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  isDraggingCategory: boolean;
  setIsDraggingCategory: React.Dispatch<React.SetStateAction<boolean>>;
  draggingCategoryId: string | null;
  setDraggingCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
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
