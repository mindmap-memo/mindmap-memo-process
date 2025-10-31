import React from 'react';

interface UseCategoryConnectionHandlersProps {
  categoryId: string;
  isConnecting: boolean;
  connectingFromId: string | null;
  setIsConnectionDragging: (value: boolean) => void;
  onStartConnection?: (categoryId: string) => void;
  onConnectItems?: (fromId: string, toId: string) => void;
}

export const useCategoryConnectionHandlers = ({
  categoryId,
  isConnecting,
  connectingFromId,
  setIsConnectionDragging,
  onStartConnection,
  onConnectItems
}: UseCategoryConnectionHandlersProps) => {

  const handleConnectionPointMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isConnecting) {
      setIsConnectionDragging(true);
      onStartConnection?.(categoryId);
    }
  };

  const handleConnectionPointMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isConnecting && connectingFromId && connectingFromId !== categoryId) {
      onConnectItems?.(connectingFromId, categoryId);
    }
    setIsConnectionDragging(false);
  };

  return {
    handleConnectionPointMouseDown,
    handleConnectionPointMouseUp
  };
};
