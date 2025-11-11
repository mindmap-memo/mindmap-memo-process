import { useCallback } from 'react';

interface UseCanvasHandlersProps {
  // Drag handlers
  setIsDraggingMemo: (isDragging: boolean) => void;
  setDraggingMemoId: (id: string | null) => void;
  setIsDraggingCategory: (isDragging: boolean) => void;
  setDraggingCategoryId: (id: string | null) => void;

  // Tutorial handlers
  handleSubStepEvent: (eventType: string) => void;

  // Analytics
  trackMemoCreated: () => void;
  trackCategoryCreated: () => void;
  trackConnectionCreated: () => void;

  // Base handlers
  addMemoBlock: (position?: { x: number; y: number }) => void;
  addCategory: (position?: { x: number; y: number }) => void;
  startConnection: (memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  connectMemos: (fromId: string, toId: string) => void;
}

/**
 * useCanvasHandlers
 *
 * Canvas 컴포넌트에 전달할 inline wrapper 함수들을 관리하는 커스텀 훅
 */
export const useCanvasHandlers = (props: UseCanvasHandlersProps) => {
  const {
    setIsDraggingMemo,
    setDraggingMemoId,
    setIsDraggingCategory,
    setDraggingCategoryId,
    handleSubStepEvent,
    trackMemoCreated,
    trackCategoryCreated,
    trackConnectionCreated,
    addMemoBlock,
    addCategory,
    startConnection,
    connectMemos
  } = props;

  // 메모 추가 핸들러 (튜토리얼 + 애널리틱스)
  const handleAddMemo = useCallback((position?: { x: number; y: number }) => {
    addMemoBlock(position);
    handleSubStepEvent('memo-created');
    trackMemoCreated();
  }, [addMemoBlock, handleSubStepEvent, trackMemoCreated]);

  // 카테고리 추가 핸들러 (애널리틱스)
  const handleAddCategory = useCallback((position?: { x: number; y: number }) => {
    addCategory(position);
    trackCategoryCreated();
  }, [addCategory, trackCategoryCreated]);

  // 연결 시작 핸들러 (튜토리얼)
  const handleStartConnection = useCallback((memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => {
    startConnection(memoId, direction);
    handleSubStepEvent('connection-started');
  }, [startConnection, handleSubStepEvent]);

  // 연결 완료 핸들러 (튜토리얼 + 애널리틱스)
  const handleConnectMemos = useCallback((fromId: string, toId: string) => {
    connectMemos(fromId, toId);
    handleSubStepEvent('connection-completed');
    trackConnectionCreated();
  }, [connectMemos, handleSubStepEvent, trackConnectionCreated]);

  // 메모 드래그 시작 핸들러
  const handleMemoDragStart = useCallback((memoId: string) => {
    setIsDraggingMemo(true);
    setDraggingMemoId(memoId);
  }, [setIsDraggingMemo, setDraggingMemoId]);

  // 메모 드래그 종료 핸들러
  const handleMemoDragEnd = useCallback(() => {
    setIsDraggingMemo(false);
    setDraggingMemoId(null);
  }, [setIsDraggingMemo, setDraggingMemoId]);

  // 카테고리 드래그 시작 핸들러
  const handleCategoryDragStart = useCallback(() => {
    setIsDraggingCategory(true);
  }, [setIsDraggingCategory]);

  // 카테고리 드래그 종료 핸들러
  const handleCategoryDragEnd = useCallback(() => {
    setIsDraggingCategory(false);
    setDraggingCategoryId(null);
  }, [setIsDraggingCategory, setDraggingCategoryId]);

  return {
    handleAddMemo,
    handleAddCategory,
    handleStartConnection,
    handleConnectMemos,
    handleMemoDragStart,
    handleMemoDragEnd,
    handleCategoryDragStart,
    handleCategoryDragEnd
  };
};
