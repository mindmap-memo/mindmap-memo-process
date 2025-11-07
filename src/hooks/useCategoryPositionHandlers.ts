import { useCallback, MutableRefObject } from 'react';
import { Page, CategoryBlock } from '../types';
import { calculateCategoryArea, clearCollisionDirections } from '../utils/categoryAreaUtils';
import { resolveUnifiedCollisions } from '../utils/collisionUtils';

interface UseCategoryPositionHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedCategoryIds: string[];
  draggedCategoryAreas: { [categoryId: string]: any };
  dragStartMemoPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  dragStartCategoryPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  shiftDragAreaCache: MutableRefObject<{ [categoryId: string]: any }>;
  previousFramePosition: MutableRefObject<Map<string, { x: number; y: number }>>;
  cacheCreationStarted: MutableRefObject<Set<string>>;
  clearCategoryCache: (categoryId: string) => void;
  // Shift 드래그 상태
  isShiftPressed: boolean;
  isDraggingMemo: boolean;
  isDraggingCategory: boolean;
  // 롱프레스 상태
  isLongPressActive: boolean;
}

export const useCategoryPositionHandlers = ({
  pages,
  setPages,
  currentPageId,
  selectedCategoryIds,
  draggedCategoryAreas,
  dragStartMemoPositions,
  dragStartCategoryPositions,
  shiftDragAreaCache,
  previousFramePosition,
  cacheCreationStarted,
  clearCategoryCache,
  isShiftPressed,
  isDraggingMemo,
  isDraggingCategory,
  isLongPressActive
}: UseCategoryPositionHandlersProps) => {

  // 카테고리 라벨만 이동 (영역은 변경하지 않음)
  // 라벨 위치 변경으로 영역이 확대/축소될 때 충돌 판정 발생
  const updateCategoryLabelPosition = useCallback((
    categoryId: string,
    position: { x: number; y: number }
  ) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      // 먼저 라벨 위치 업데이트
      const updatedPage = {
        ...page,
        categories: page.categories?.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              position
            };
          }
          return cat;
        }) || []
      };

      // 충돌 판정 적용 (영역 크기 조절로 인한 충돌)
      // 롱프레스 활성화 시 충돌 판정 스킵
      const collisionResult = resolveUnifiedCollisions(
        categoryId,
        'area',
        updatedPage,
        10,
        undefined,
        undefined,
        isLongPressActive
      );

      return {
        ...updatedPage,
        categories: collisionResult.updatedCategories,
        memos: collisionResult.updatedMemos
      };
    }));
  }, [setPages, currentPageId, isLongPressActive]);

  // 카테고리 드래그 종료 시 드롭 감지 및 캐시 제거
  const handleCategoryPositionDragEnd = useCallback((
    categoryId: string,
    finalPosition: { x: number; y: number }
  ) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      // Shift 드롭이 완료될 때까지 캐시 클리어를 지연 (500ms)
      setTimeout(() => {
        clearCategoryCache(categoryId);
        previousFramePosition.current.delete(categoryId);
        cacheCreationStarted.current.delete(categoryId);
        clearCollisionDirections(); // 충돌 방향 캐시 초기화
      }, 500);
      return;
    }

    // 드래그 종료 후 캐시 제거 - 메모 위치에 따라 자연스럽게 크기 조정
    // 다중 선택된 모든 카테고리의 캐시도 함께 제거
    // ⚠️ Shift 드롭이 완료될 때까지 캐시 클리어를 지연 (500ms)
    setTimeout(() => {
      const isMultiSelected = selectedCategoryIds.includes(categoryId);
      const categoriesToClear = isMultiSelected ? selectedCategoryIds : [categoryId];

      categoriesToClear.forEach(catId => {
        clearCategoryCache(catId);
        previousFramePosition.current.delete(catId);
        cacheCreationStarted.current.delete(catId);
      });

      // Shift 드래그 캐시도 함께 클리어 (Shift를 눌렀다 뗐을 때 남아있는 캐시 제거)
      shiftDragAreaCache.current = {};

      // 충돌 방향 캐시 초기화 (Shift를 눌렀다 뗐을 때 남아있는 충돌 판정 제거)
      clearCollisionDirections();
    }, 500);

    // !! 중요: 위치 캐시는 Shift 드롭 처리 후에 클리어되어야 함
    // handleShiftDropCategory에서 dragStartCategoryPositions를 사용하기 때문
    // setTimeout으로 충분한 시간 후 클리어 (Shift 드롭 처리가 먼저 완료되도록)
    setTimeout(() => {
      dragStartMemoPositions.current.clear();
      dragStartCategoryPositions.current.clear();
      console.log('[Category Drag End] 위치 캐시 클리어 완료');
    }, 500);
  }, [
    pages,
    currentPageId,
    selectedCategoryIds,
    clearCategoryCache,
    previousFramePosition,
    cacheCreationStarted,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    shiftDragAreaCache
  ]);

  // 카테고리 라벨 위치 자동 업데이트 (영역의 좌상단으로)
  // 메모가 이동할 때만 업데이트
  const updateCategoryPositions = useCallback(() => {
    // ⚠️ Shift 드래그 또는 롱프레스 중에는 영역 계산 스킵 (영역이 freeze된 상태)
    const isShiftDragging = isShiftPressed && (isDraggingMemo || isDraggingCategory);
    if (isShiftDragging || isLongPressActive) return;

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return;

    const categoriesToUpdate: CategoryBlock[] = [];

    currentPage.categories.forEach(category => {
      const childMemos = currentPage.memos.filter(m => m.parentId === category.id);
      const childCategories = currentPage.categories?.filter(c => c.parentId === category.id) || [];
      const hasChildren = childMemos.length > 0 || childCategories.length > 0;

      if (hasChildren) {
        const area = calculateCategoryArea(category, currentPage);
        if (area) {
          // 영역의 좌상단 위치와 category.position이 다르면 업데이트 필요
          const padding = 20;
          const newX = area.x + padding;
          const newY = area.y + padding;

          if (Math.abs(category.position.x - newX) > 1 || Math.abs(category.position.y - newY) > 1) {
            categoriesToUpdate.push({
              ...category,
              position: { x: newX, y: newY }
            });
          }
        }
      }
    });

    // 업데이트가 필요한 카테고리가 있으면 한 번에 업데이트
    if (categoriesToUpdate.length > 0) {
      setPages(prev => prev.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            categories: page.categories?.map(cat => {
              const updated = categoriesToUpdate.find(u => u.id === cat.id);
              return updated || cat;
            }) || []
          };
        }
        return page;
      }));
    }
  }, [pages, currentPageId, setPages, isShiftPressed, isDraggingMemo, isDraggingCategory, isLongPressActive]);

  return {
    updateCategoryLabelPosition,
    handleCategoryPositionDragEnd,
    updateCategoryPositions
  };
};
