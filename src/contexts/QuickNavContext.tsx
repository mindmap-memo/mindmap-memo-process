import React, { createContext, useContext, ReactNode } from 'react';
import { QuickNavItem } from '../types';

// QuickNav Context 타입 정의
export interface QuickNavContextType {
  // 즐겨찾기 항목들 (현재 페이지의 항목만)
  quickNavItems: QuickNavItem[];

  // 패널 표시 상태
  showQuickNavPanel: boolean;
  setShowQuickNavPanel: React.Dispatch<React.SetStateAction<boolean>>;
}

// Context 생성
const QuickNavContext = createContext<QuickNavContextType | undefined>(undefined);

// Provider Props
interface QuickNavProviderProps {
  children: ReactNode;
  value: QuickNavContextType;
}

// Provider 컴포넌트
export const QuickNavProvider: React.FC<QuickNavProviderProps> = ({ children, value }) => {
  return (
    <QuickNavContext.Provider value={value}>
      {children}
    </QuickNavContext.Provider>
  );
};

// Custom Hook
export const useQuickNav = () => {
  const context = useContext(QuickNavContext);
  if (!context) {
    throw new Error('useQuickNav must be used within QuickNavProvider');
  }
  return context;
};
