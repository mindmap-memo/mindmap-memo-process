import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useColumnResize
 *
 * 테이블 컬럼 크기 조정 로직을 관리하는 훅
 *
 * **관리하는 기능:**
 * - 컬럼 너비 상태 관리
 * - 드래그로 컬럼 크기 조정
 * - 마우스 이벤트 처리
 */

interface UseColumnResizeParams {
  initialWidths?: number[];
  columnCount: number;
}

export const useColumnResize = ({ initialWidths, columnCount }: UseColumnResizeParams) => {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    initialWidths || Array(columnCount).fill(150)
  );
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  const handleResizeMove = useRef<((e: MouseEvent) => void) | null>(null);
  const handleResizeEnd = useRef<(() => void) | null>(null);

  /**
   * 컬럼 크기 조정 시작
   */
  const handleResizeStart = useCallback((e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizingColumn(columnIndex);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnIndex] || 150);

    // 크기 조정 중 마우스 이동 핸들러
    const moveHandler = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - e.clientX;
      const newWidth = Math.max(50, (columnWidths[columnIndex] || 150) + delta);

      setColumnWidths(prev => {
        const newWidths = [...prev];
        newWidths[columnIndex] = newWidth;
        return newWidths;
      });
    };

    // 크기 조정 종료 핸들러
    const endHandler = () => {
      setIsResizing(false);
      setResizingColumn(null);

      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);

      handleResizeMove.current = null;
      handleResizeEnd.current = null;
    };

    handleResizeMove.current = moveHandler;
    handleResizeEnd.current = endHandler;

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
  }, [columnWidths]);

  /**
   * 컬럼 개수가 변경될 때 너비 배열 업데이트
   */
  useEffect(() => {
    if (columnWidths.length !== columnCount) {
      setColumnWidths(prev => {
        const newWidths = [...prev];
        // 추가된 컬럼에 기본 너비 설정
        while (newWidths.length < columnCount) {
          newWidths.push(150);
        }
        // 삭제된 컬럼 제거
        if (newWidths.length > columnCount) {
          newWidths.length = columnCount;
        }
        return newWidths;
      });
    }
  }, [columnCount, columnWidths.length]);

  /**
   * 컴포넌트 언마운트 시 이벤트 리스너 정리
   */
  useEffect(() => {
    return () => {
      if (handleResizeMove.current) {
        document.removeEventListener('mousemove', handleResizeMove.current);
      }
      if (handleResizeEnd.current) {
        document.removeEventListener('mouseup', handleResizeEnd.current);
      }
    };
  }, []);

  return {
    columnWidths,
    isResizing,
    resizingColumn,
    handleResizeStart,
    setColumnWidths
  };
};
