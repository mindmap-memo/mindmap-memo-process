import React, { createContext, useContext, ReactNode } from 'react';

// Panel Context 타입 정의
export interface PanelContextType {
  // 패널 열림/닫힘 상태
  leftPanelOpen: boolean;
  setLeftPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 패널 너비
  leftPanelWidth: number;
  setLeftPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  rightPanelWidth: number;
  setRightPanelWidth: React.Dispatch<React.SetStateAction<number>>;

  // 오른쪽 패널 전체화면
  isRightPanelFullscreen: boolean;
  setIsRightPanelFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Context 생성
const PanelContext = createContext<PanelContextType | undefined>(undefined);

// Provider Props
interface PanelProviderProps {
  children: ReactNode;
  value: PanelContextType;
}

// Provider 컴포넌트
export const PanelProvider: React.FC<PanelProviderProps> = ({ children, value }) => {
  return (
    <PanelContext.Provider value={value}>
      {children}
    </PanelContext.Provider>
  );
};

// Custom Hook
export const usePanel = () => {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanel must be used within PanelProvider');
  }
  return context;
};
