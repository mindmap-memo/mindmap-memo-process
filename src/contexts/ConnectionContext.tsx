import React, { createContext, useContext, ReactNode } from 'react';

// Connection Context 타입 정의
export interface ConnectionContextType {
  // 연결 모드
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  isDisconnectMode: boolean;
  setIsDisconnectMode: React.Dispatch<React.SetStateAction<boolean>>;

  // 연결 시작점 정보
  connectingFromId: string | null;
  setConnectingFromId: React.Dispatch<React.SetStateAction<string | null>>;
  connectingFromDirection: 'top' | 'right' | 'bottom' | 'left' | null;
  setConnectingFromDirection: React.Dispatch<React.SetStateAction<'top' | 'right' | 'bottom' | 'left' | null>>;

  // 드래그 라인 끝점
  dragLineEnd: { x: number; y: number } | null;
  setDragLineEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
}

// Context 생성
const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

// Provider Props
interface ConnectionProviderProps {
  children: ReactNode;
  value: ConnectionContextType;
}

// Provider 컴포넌트
export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children, value }) => {
  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

// Custom Hook
export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};
