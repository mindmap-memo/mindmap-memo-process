import React from 'react';
import { CategoryBlock } from '../../../types';

/**
 * useCategoryAreaCalculation
 *
 * 카테고리 영역 계산 로직을 관리하는 훅
 *
 * **관리하는 기능:**
 * - 드래그 중인 카테고리 영역 계산 (캐시 사용)
 * - Shift 드래그 중인 카테고리 영역 계산
 * - 일반 카테고리 영역 계산
 */

interface UseCategoryAreaCalculationParams {
  draggedCategoryAreas: {
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  };
  isShiftPressed?: boolean;
  shiftDragAreaCache: React.MutableRefObject<{ [categoryId: string]: any }>;
  shiftDragInfo: {
    categoryId: string;
    offset: { x: number; y: number };
  } | null;
  isDescendantOf: (categoryId: string, ancestorId: string) => boolean;
  isDraggingMemo?: boolean;
  isDraggingCategory?: boolean;
  draggingCategoryId?: string | null;
  calculateCategoryAreaWithColor: (category: CategoryBlock, visited?: Set<string>, excludeCategoryId?: string) => any;
}

export const useCategoryAreaCalculation = (params: UseCategoryAreaCalculationParams) => {
  const {
    draggedCategoryAreas,
    isShiftPressed,
    shiftDragAreaCache,
    shiftDragInfo,
    isDescendantOf,
    isDraggingMemo,
    isDraggingCategory,
    draggingCategoryId,
    calculateCategoryAreaWithColor
  } = params;

  /**
   * 카테고리 영역 계산
   * - 드래그 중: 캐시된 영역 사용
   * - Shift 드래그 중: Shift 캐시 사용
   * - 일반: 동적 계산
   */
  const calculateArea = React.useCallback((category: CategoryBlock): any => {
    // 1. 카테고리 드래그 중: 캐시된 영역 사용
    if (draggedCategoryAreas[category.id]) {
      const cached = draggedCategoryAreas[category.id];
      const deltaX = category.position.x - cached.originalPosition.x;
      const deltaY = category.position.y - cached.originalPosition.y;

      return {
        x: cached.area.x + deltaX,
        y: cached.area.y + deltaY,
        width: cached.area.width,   // 캐시된 크기 유지
        height: cached.area.height, // 캐시된 크기 유지
        color: cached.area.color
      };
    }

    // 2. Shift 드래그 중: 캐시된 영역의 크기 사용, 위치는 임시 오프셋 적용
    if (isShiftPressed && shiftDragAreaCache.current[category.id]) {
      const cachedArea = shiftDragAreaCache.current[category.id];

      // Shift 드래그 중이고 현재 카테고리가 드래그 중이거나 그 하위 항목이면 오프셋 적용
      let currentPosition = category.position;
      if (shiftDragInfo && (shiftDragInfo.categoryId === category.id || isDescendantOf(category.id, shiftDragInfo.categoryId))) {
        currentPosition = {
          x: category.position.x + shiftDragInfo.offset.x,
          y: category.position.y + shiftDragInfo.offset.y
        };
      }

      // 캐시된 영역이 카테고리 블록 기준으로 얼마나 떨어져 있는지 계산
      const offsetX = cachedArea.x - (category.position.x - 20); // padding 20 고려
      const offsetY = cachedArea.y - (category.position.y - 20);

      return {
        x: currentPosition.x - 20 + offsetX,
        y: currentPosition.y - 20 + offsetY,
        width: cachedArea.width,   // 캐시된 크기 유지
        height: cachedArea.height, // 캐시된 크기 유지
        color: cachedArea.color
      };
    }

    // 3. 일반: 동적 계산
    // 드래그 중일 때는 드래그 중인 카테고리를 제외하고 계산 (Shift 여부 관계없이)
    let excludeId: string | undefined = undefined;
    if ((isDraggingMemo || isDraggingCategory) && draggingCategoryId) {
      // 카테고리 드래그 중일 때만 제외 (메모 드래그는 카테고리가 아니므로)
      if (isDraggingCategory) {
        excludeId = draggingCategoryId;
      }
    }

    const area = calculateCategoryAreaWithColor(category, new Set(), excludeId);

    // 하위 카테고리인데 자식이 없어서 area가 null인 경우, 기본 영역 생성
    if (!area && category.parentId) {
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const padding = 20;
      return {
        x: category.position.x - padding,
        y: category.position.y - padding,
        width: categoryWidth + padding * 2,
        height: categoryHeight + padding * 2,
        color: `rgba(${Math.abs(category.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % 200 + 50}, ${Math.abs(category.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 7) % 200 + 50}, 255, 0.1)`
      };
    }

    // Shift 드래그 중이면 계산된 영역을 캐시에 저장 (메모 또는 카테고리 드래그)
    if (isShiftPressed && (isDraggingMemo || isDraggingCategory) && area) {
      shiftDragAreaCache.current[category.id] = area;
    }

    return area;
  }, [
    draggedCategoryAreas,
    isShiftPressed,
    shiftDragAreaCache,
    shiftDragInfo,
    isDescendantOf,
    isDraggingMemo,
    isDraggingCategory,
    draggingCategoryId,
    calculateCategoryAreaWithColor
  ]);

  return { calculateArea };
};
