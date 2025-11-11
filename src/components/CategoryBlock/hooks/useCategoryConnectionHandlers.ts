import React from 'react';

interface UseCategoryConnectionHandlersProps {
  categoryId: string;
  isConnecting: boolean;
  connectingFromId: string | null;
  setIsConnectionDragging: (value: boolean) => void;
  onStartConnection?: (categoryId: string) => void;
  onConnectItems?: (fromId: string, toId: string) => void;
  onUpdateDragLine?: (mousePos: { x: number; y: number }) => void;
  onCancelConnection?: () => void;
  canvasOffset?: { x: number; y: number };
  canvasScale?: number;
}

export const useCategoryConnectionHandlers = ({
  categoryId,
  isConnecting,
  connectingFromId,
  setIsConnectionDragging,
  onStartConnection,
  onConnectItems,
  onUpdateDragLine,
  onCancelConnection,
  canvasOffset = { x: 0, y: 0 },
  canvasScale = 1
}: UseCategoryConnectionHandlersProps) => {

  const isConnectingRef = React.useRef(isConnecting);
  const connectingFromIdRef = React.useRef(connectingFromId);
  const onConnectItemsRef = React.useRef(onConnectItems);
  const onCancelConnectionRef = React.useRef(onCancelConnection);
  const canvasOffsetRef = React.useRef(canvasOffset);
  const canvasScaleRef = React.useRef(canvasScale);

  // Ref 업데이트
  React.useEffect(() => {
    isConnectingRef.current = isConnecting;
    connectingFromIdRef.current = connectingFromId;
    onConnectItemsRef.current = onConnectItems;
    onCancelConnectionRef.current = onCancelConnection;
    canvasOffsetRef.current = canvasOffset;
    canvasScaleRef.current = canvasScale;
  }, [isConnecting, connectingFromId, onConnectItems, onCancelConnection, canvasOffset, canvasScale]);

  /**
   * 연결점 마우스/터치 다운 핸들러
   * PC: 항상 작동 (연결 모드 불필요)
   * 모바일: 연결 모드일 때만 작동
   */
  const handleConnectionPointMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    const isMobile = window.innerWidth <= 768;

    // PC는 항상, 모바일은 연결 모드일 때만 드래그 시작
    if (!isMobile || isConnecting) {
      setIsConnectionDragging(true);
      // 아직 시작 카테고리가 설정되지 않았으면 설정
      if (!connectingFromId) {
        onStartConnection?.(categoryId);
      }
    }
  };

  /**
   * 연결점 마우스/터치 업 핸들러
   * PC: 항상 작동
   * 모바일: 연결 모드일 때만 작동
   */
  const handleConnectionPointMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    const isMobile = window.innerWidth <= 768;

    // PC이거나 모바일 연결 모드일 때 연결 완성
    if ((!isMobile || isConnecting) && connectingFromId && connectingFromId !== categoryId) {
      onConnectItems?.(connectingFromId, categoryId);
    }
    setIsConnectionDragging(false);
  };

  /**
   * 연결 드래그 Effect
   * 전역 document에 이벤트 리스너 등록하여 연결선 드래그 처리
   */
  React.useEffect(() => {
    // isConnectionDragging 대신 connectingFromId로 판단
    const isConnectionDragging = connectingFromId === categoryId;

    if (isConnectionDragging && onUpdateDragLine) {
      const handleMouseMove = (e: MouseEvent) => {
        // Canvas 요소를 찾아서 rect 기준으로 변환
        const canvasElement = document.querySelector('[data-canvas-container]') as HTMLElement;
        if (canvasElement) {
          const rect = canvasElement.getBoundingClientRect();
          const offset = canvasOffsetRef.current;
          const scale = canvasScaleRef.current;
          const mouseX = (e.clientX - rect.left - offset.x) / scale;
          const mouseY = (e.clientY - rect.top - offset.y) / scale;
          onUpdateDragLine({ x: mouseX, y: mouseY });
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          // Canvas 요소를 찾아서 rect 기준으로 변환
          const canvasElement = document.querySelector('[data-canvas-container]') as HTMLElement;
          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const offset = canvasOffsetRef.current;
            const scale = canvasScaleRef.current;
            const mouseX = (e.touches[0].clientX - rect.left - offset.x) / scale;
            const mouseY = (e.touches[0].clientY - rect.top - offset.y) / scale;
            onUpdateDragLine({ x: mouseX, y: mouseY });
          }
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        // 마우스 위치에서 카테고리/메모 찾기 (data-category-id 또는 data-memo-id 속성 사용)
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const categoryElement = element?.closest('[data-category-id]');
        const memoElement = element?.closest('[data-memo-id]');

        const currentIsConnecting = isConnectingRef.current;
        const currentConnectingFromId = connectingFromIdRef.current;
        const currentOnConnectItems = onConnectItemsRef.current;
        const currentOnCancelConnection = onCancelConnectionRef.current;

        if ((categoryElement || memoElement) && currentIsConnecting && currentConnectingFromId) {
          const targetId = categoryElement?.getAttribute('data-category-id') || memoElement?.getAttribute('data-memo-id');

          if (targetId && targetId !== currentConnectingFromId) {
            currentOnConnectItems?.(currentConnectingFromId, targetId);
          } else {
            currentOnCancelConnection?.();
          }
        } else {
          currentOnCancelConnection?.();
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          const categoryElement = element?.closest('[data-category-id]');
          const memoElement = element?.closest('[data-memo-id]');

          const currentIsConnecting = isConnectingRef.current;
          const currentConnectingFromId = connectingFromIdRef.current;
          const currentOnConnectItems = onConnectItemsRef.current;
          const currentOnCancelConnection = onCancelConnectionRef.current;

          if ((categoryElement || memoElement) && currentIsConnecting && currentConnectingFromId) {
            const targetId = categoryElement?.getAttribute('data-category-id') || memoElement?.getAttribute('data-memo-id');

            if (targetId && targetId !== currentConnectingFromId) {
              currentOnConnectItems?.(currentConnectingFromId, targetId);
            } else {
              currentOnCancelConnection?.();
            }
          } else {
            currentOnCancelConnection?.();
          }
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [connectingFromId, categoryId, onUpdateDragLine]);

  return {
    handleConnectionPointMouseDown,
    handleConnectionPointMouseUp
  };
};
