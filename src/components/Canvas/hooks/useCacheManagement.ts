import { useEffect } from 'react';
import { Page } from '../../../types';

/**
 * useCacheManagement
 *
 * 카테고리 영역 캐시 관리를 담당하는 훅
 *
 * **관리하는 캐시:**
 * 1. Shift 드래그 영역 캐시 (shiftDragAreaCache)
 * 2. 드래그 중인 카테고리 영역 캐시 (draggedCategoryAreas)
 * 3. 메모 위치 변경 시 영향받는 카테고리 캐시
 * 4. 카테고리 상태 변경 시 영역 업데이트 트리거
 */

interface UseCacheManagementParams {
  // Dragging state
  isDraggingMemo?: boolean;
  isDraggingCategory?: boolean;
  isDraggingCategoryArea: string | null;

  // Shift drag cache
  shiftDragAreaCache: React.MutableRefObject<{ [categoryId: string]: any }>;

  // Page data
  currentPage: Page | undefined;

  // Category cache management
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>>;
  onClearCategoryCache?: (categoryId: string) => void;
  setAreaUpdateTrigger: React.Dispatch<React.SetStateAction<number>>;
}

export const useCacheManagement = (params: UseCacheManagementParams) => {
  const {
    isDraggingMemo,
    isDraggingCategory,
    isDraggingCategoryArea,
    shiftDragAreaCache,
    currentPage,
    setDraggedCategoryAreas,
    onClearCategoryCache,
    setAreaUpdateTrigger
  } = params;

  // 1. 드래그가 완전히 끝나면 캐시 클리어
  // 중요: Shift를 떼는 것과 드래그가 끝나는 것은 별개
  // Shift를 떼도 드래그가 진행 중이면 캐시 유지 (기존 부모 영역 고정)
  useEffect(() => {
    if (!isDraggingMemo && !isDraggingCategory) {
      shiftDragAreaCache.current = {};
    }
  }, [isDraggingMemo, isDraggingCategory, shiftDragAreaCache]);

  // 2. 메모 위치 변경 시 영역 업데이트 (카테고리 위치는 제외)
  useEffect(() => {
    if (currentPage) {
      // 메모가 속한 카테고리의 캐시 제거 (영역 크기 재계산)
      // 단, 드래그 중인 카테고리는 제외 (크기 고정 유지)
      const affectedCategoryIds = new Set<string>();
      currentPage.memos.forEach(memo => {
        if (memo.parentId && memo.parentId !== isDraggingCategoryArea) {
          affectedCategoryIds.add(memo.parentId);
        }
      });

      if (affectedCategoryIds.size > 0) {
        setDraggedCategoryAreas(prev => {
          const newAreas = { ...prev };
          affectedCategoryIds.forEach(catId => {
            // 드래그 중인 카테고리의 캐시는 제거하지 않음
            if (catId !== isDraggingCategoryArea) {
              delete newAreas[catId];
            }
          });
          return newAreas;
        });

        // App.tsx의 메모 위치 캐시도 동기화하여 제거 (별도 effect로 분리)
        affectedCategoryIds.forEach(catId => {
          if (catId !== isDraggingCategoryArea) {
            onClearCategoryCache?.(catId);
          }
        });
      }
    }
  }, [
    // 메모 위치만 감지 (카테고리 위치는 제외)
    currentPage?.memos?.map(m => `${m.id}:${m.position.x}:${m.position.y}:${m.size?.width}:${m.size?.height}:${m.parentId}`).join('|'),
    isDraggingCategoryArea,
    onClearCategoryCache,
    setDraggedCategoryAreas
  ]);

  // 3. 카테고리 상태 변경 시 영역 업데이트 트리거만 실행 (캐시 제거 안 함)
  useEffect(() => {
    if (currentPage) {
      setAreaUpdateTrigger(prev => prev + 1);
    }
  }, [
    currentPage?.categories?.map(c => `${c.id}:${c.size?.width}:${c.size?.height}:${c.isExpanded}`).join('|'),
    setAreaUpdateTrigger
  ]);
};
