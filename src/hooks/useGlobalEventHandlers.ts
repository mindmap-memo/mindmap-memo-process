import { useEffect } from 'react';

/**
 * 전역 이벤트 핸들러를 관리하는 커스텀 훅
 * - 브라우저 기본 줌 차단
 * - Shift 키 상태 감지
 * - ESC 키로 선택 해제
 */

interface UseGlobalEventHandlersProps {
  isShiftPressed: boolean;
  setIsShiftPressed: (pressed: boolean) => void;
  setSelectedMemoIds: (ids: string[]) => void;
  setSelectedCategoryIds: (ids: string[]) => void;
  setIsDragSelecting: (selecting: boolean) => void;
  setDragSelectStart: (pos: { x: number; y: number } | null) => void;
  setDragSelectEnd: (pos: { x: number; y: number } | null) => void;
  setDragHoveredMemoIds: (ids: string[]) => void;
  setDragHoveredCategoryIds: (ids: string[]) => void;
}

export const useGlobalEventHandlers = ({
  setIsShiftPressed,
  setSelectedMemoIds,
  setSelectedCategoryIds,
  setIsDragSelecting,
  setDragSelectStart,
  setDragSelectEnd,
  setDragHoveredMemoIds,
  setDragHoveredCategoryIds
}: UseGlobalEventHandlersProps) => {
  // 브라우저 기본 Ctrl/Command + 휠 줌 차단 (전역)
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // document 전체에 리스너 추가 (passive: false로 preventDefault 가능하게)
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

  // Shift 키 상태 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        console.log('[App] Shift 키 눌림');
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        console.log('[App] Shift 키 떼어짐');
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setIsShiftPressed]);

  // ESC 키로 모든 선택 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ESC: 모든 선택 해제
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedMemoIds([]);
        setSelectedCategoryIds([]);
        // 드래그 선택 UI도 초기화
        setIsDragSelecting(false);
        setDragSelectStart(null);
        setDragSelectEnd(null);
        setDragHoveredMemoIds([]);
        setDragHoveredCategoryIds([]);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    setSelectedMemoIds,
    setSelectedCategoryIds,
    setIsDragSelecting,
    setDragSelectStart,
    setDragSelectEnd,
    setDragHoveredMemoIds,
    setDragHoveredCategoryIds
  ]);
};
