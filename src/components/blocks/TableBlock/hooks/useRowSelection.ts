import { useState, useCallback } from 'react';

/**
 * useRowSelection
 *
 * 테이블 행 선택 로직을 관리하는 훅
 *
 * **관리하는 기능:**
 * - 행 선택/해제
 * - 선택된 행 조회
 * - 컨텍스트 메뉴 표시
 */

export const useRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showRowContextMenu, setShowRowContextMenu] = useState(false);
  const [rowContextMenuPosition, setRowContextMenuPosition] = useState<{x: number, y: number}>({x: 0, y: 0});

  /**
   * 행 선택 토글
   */
  const handleRowSelect = useCallback((rowIndex: number, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowIndex);
      } else {
        newSet.delete(rowIndex);
      }
      return newSet;
    });
  }, []);

  /**
   * 행 컨텍스트 메뉴 표시
   */
  const handleRowContextMenu = useCallback((e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // 우클릭한 행이 선택되지 않았으면 해당 행만 선택
    setSelectedRows(prev => {
      if (!prev.has(rowIndex)) {
        return new Set([rowIndex]);
      }
      return prev;
    });

    setRowContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowRowContextMenu(true);
  }, []);

  /**
   * 컨텍스트 메뉴 닫기
   */
  const closeContextMenu = useCallback(() => {
    setShowRowContextMenu(false);
  }, []);

  /**
   * 선택된 행 초기화
   */
  const clearRowSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  /**
   * 특정 행들 선택
   */
  const selectRows = useCallback((rows: Set<number>) => {
    setSelectedRows(rows);
  }, []);

  return {
    selectedRows,
    hoveredRow,
    showRowContextMenu,
    rowContextMenuPosition,
    handleRowSelect,
    handleRowContextMenu,
    closeContextMenu,
    clearRowSelection,
    selectRows,
    setHoveredRow,
    setShowRowContextMenu
  };
};
