import { useEffect } from 'react';

/**
 * useCanvasKeyboard
 *
 * 캔버스 키보드 이벤트 처리
 * - Space: 패닝 모드
 * - Alt: 줌 모드
 * - Escape: 모든 선택 해제
 * - Delete: 선택된 항목 삭제
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z: Redo
 */

interface UseCanvasKeyboardParams {
  isSpacePressed: boolean;
  setIsSpacePressed: (pressed: boolean) => void;
  isAltPressed: boolean;
  setIsAltPressed: (pressed: boolean) => void;
  baseTool: 'select' | 'pan' | 'zoom';
  setCurrentTool: (tool: 'select' | 'pan' | 'zoom') => void;
  isMouseOverCanvas: boolean;
  isConnecting: boolean;
  onCancelConnection: () => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedMemoId: string | null;
  selectedCategoryId: string | null;
  selectedMemoIds: string[];
  selectedCategoryIds: string[];
  onDeleteSelected: () => void;
  setIsPanning: (isPanning: boolean) => void;
}

export const useCanvasKeyboard = (params: UseCanvasKeyboardParams) => {
  const {
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,
    baseTool,
    setCurrentTool,
    isMouseOverCanvas,
    isConnecting,
    onCancelConnection,
    onMemoSelect,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedMemoId,
    selectedCategoryId,
    selectedMemoIds,
    selectedCategoryIds,
    onDeleteSelected,
    setIsPanning
  } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (Undo) / Ctrl+Shift+Z (Redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();

        if (e.shiftKey) {
          // Ctrl+Shift+Z: Redo
          if (canRedo) {
            onRedo();
          }
        } else {
          // Ctrl+Z: Undo
          if (canUndo) {
            onUndo();
          }
        }
        return;
      }

      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        setIsSpacePressed(true);
        setCurrentTool('pan');
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && !isAltPressed) {
        setIsAltPressed(true);
        setCurrentTool('zoom');
      }
      if (e.code === 'Escape') {
        // 모든 선택 해제
        onMemoSelect('', false); // 빈 문자열로 호출해서 선택 해제
        // 모든 드래그 상태 리셋
        setIsPanning(false);
        if (isConnecting) {
          onCancelConnection();
        }
        e.preventDefault();
      }

      // Delete 키: 선택된 메모/카테고리 삭제
      if (e.code === 'Delete') {
        // RightPanel의 입력 필드에 포커스가 있는 경우 무시
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        );

        if (!isInputFocused) {
          // 선택된 메모나 카테고리가 있으면 삭제
          if (selectedMemoId || selectedCategoryId || selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) {
            onDeleteSelected();
            e.preventDefault();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        setIsSpacePressed(false);
        // Alt가 눌려있으면 zoom, 아니면 baseTool로
        if (isAltPressed) {
          setCurrentTool('zoom');
        } else {
          setCurrentTool(baseTool);
        }
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && isAltPressed) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsAltPressed(false);
        // Space가 눌려있으면 pan, 아니면 baseTool로
        if (isSpacePressed) {
          setCurrentTool('pan');
        } else {
          setCurrentTool(baseTool);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      document.removeEventListener('keyup', handleKeyUp, { capture: true } as any);
    };
  }, [
    baseTool,
    isSpacePressed,
    isAltPressed,
    isMouseOverCanvas,
    isConnecting,
    onCancelConnection,
    onMemoSelect,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedMemoId,
    selectedCategoryId,
    selectedMemoIds,
    selectedCategoryIds,
    onDeleteSelected,
    setIsSpacePressed,
    setIsAltPressed,
    setCurrentTool,
    setIsPanning
  ]);
};
