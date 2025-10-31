import { useState, useCallback } from 'react';

/**
 * useCellSelection
 *
 * 테이블 셀 선택 로직을 관리하는 훅
 *
 * **관리하는 기능:**
 * - 개별 셀 선택/해제
 * - 범위 선택 (드래그 선택)
 * - 선택 상태 조회
 */

export const useCellSelection = () => {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastSelectedCell, setLastSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{row: number, col: number} | null>(null);
  const [dragEndCell, setDragEndCell] = useState<{row: number, col: number} | null>(null);

  /**
   * 셀 키 생성 (row-col 형식)
   */
  const getCellKey = useCallback((row: number, col: number) => `${row}-${col}`, []);

  /**
   * 셀이 선택되었는지 확인
   */
  const isCellSelected = useCallback((row: number, col: number) => {
    return selectedCells.has(getCellKey(row, col));
  }, [selectedCells, getCellKey]);

  /**
   * 범위 내 모든 셀 키 가져오기
   */
  const getCellsInRange = useCallback((
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): Set<string> => {
    const cells = new Set<string>();
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.add(getCellKey(row, col));
      }
    }

    return cells;
  }, [getCellKey]);

  /**
   * 셀이 현재 드래그 선택 범위에 있는지 확인
   */
  const isCellInDragRange = useCallback((row: number, col: number) => {
    if (!isDragSelecting || !dragStartCell || !dragEndCell) return false;

    const minRow = Math.min(dragStartCell.row, dragEndCell.row);
    const maxRow = Math.max(dragStartCell.row, dragEndCell.row);
    const minCol = Math.min(dragStartCell.col, dragEndCell.col);
    const maxCol = Math.max(dragStartCell.col, dragEndCell.col);

    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [isDragSelecting, dragStartCell, dragEndCell]);

  /**
   * 드래그 선택 시작
   */
  const startDragSelection = useCallback((row: number, col: number) => {
    setIsDragSelecting(true);
    setDragStartCell({ row, col });
    setDragEndCell({ row, col });
  }, []);

  /**
   * 드래그 선택 업데이트
   */
  const updateDragSelection = useCallback((row: number, col: number) => {
    if (isDragSelecting) {
      setDragEndCell({ row, col });
    }
  }, [isDragSelecting]);

  /**
   * 드래그 선택 완료
   */
  const finishDragSelection = useCallback(() => {
    if (isDragSelecting && dragStartCell && dragEndCell) {
      const cells = getCellsInRange(
        dragStartCell.row,
        dragStartCell.col,
        dragEndCell.row,
        dragEndCell.col
      );
      setSelectedCells(cells);
      setLastSelectedCell(dragEndCell);
    }
    setIsDragSelecting(false);
    setDragStartCell(null);
    setDragEndCell(null);
  }, [isDragSelecting, dragStartCell, dragEndCell, getCellsInRange]);

  /**
   * 단일 셀 선택 토글
   */
  const toggleCellSelection = useCallback((row: number, col: number) => {
    const key = getCellKey(row, col);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
    setLastSelectedCell({ row, col });
  }, [getCellKey]);

  /**
   * 모든 선택 해제
   */
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setLastSelectedCell(null);
  }, []);

  /**
   * 특정 셀들 선택
   */
  const selectCells = useCallback((cells: Set<string>) => {
    setSelectedCells(cells);
  }, []);

  return {
    selectedCells,
    lastSelectedCell,
    isDragSelecting,
    dragStartCell,
    dragEndCell,
    getCellKey,
    isCellSelected,
    getCellsInRange,
    isCellInDragRange,
    startDragSelection,
    updateDragSelection,
    finishDragSelection,
    toggleCellSelection,
    clearSelection,
    selectCells,
    setLastSelectedCell
  };
};
