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

      // 상위 카테고리(조상)도 모두 캐시 제거 대상에 추가
      const getAllAncestors = (categoryId: string): string[] => {
        const ancestors: string[] = [];
        let currentId: string | undefined = categoryId;

        while (currentId) {
          const category = currentPage.categories?.find(c => c.id === currentId);
          if (category?.parentId && category.parentId !== isDraggingCategoryArea) {
            ancestors.push(category.parentId);
            currentId = category.parentId;
          } else {
            currentId = undefined;
          }
        }

        return ancestors;
      };

      // 모든 영향받은 카테고리와 그들의 조상을 추가
      const initialAffectedIds = Array.from(affectedCategoryIds);
      initialAffectedIds.forEach(catId => {
        const ancestors = getAllAncestors(catId);
        ancestors.forEach(ancestorId => affectedCategoryIds.add(ancestorId));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // 메모 위치와 드래그 상태를 하나의 문자열로 결합 (배열 크기 고정)
    `${currentPage?.memos?.map(m => `${m.id}:${m.position.x}:${m.position.y}:${m.size?.width}:${m.size?.height}:${m.parentId}`).join('|')}|dragging:${isDraggingCategoryArea || 'none'}`
    // onClearCategoryCache, setDraggedCategoryAreas는 안정적인 참조이므로 의존성 배열에서 제외
  ]);

  // 3. 카테고리 상태 변경 시 캐시 제거 및 영역 업데이트
  useEffect(() => {
    if (currentPage) {
      // 변경된 카테고리와 그 상위 카테고리들의 캐시 제거
      const affectedCategoryIds = new Set<string>();

      // 모든 카테고리를 순회하며 변경 감지
      currentPage.categories?.forEach(category => {
        if (category.id !== isDraggingCategoryArea) {
          affectedCategoryIds.add(category.id);

          // 상위 카테고리도 추가
          let currentId: string | undefined = category.parentId;
          while (currentId && currentId !== isDraggingCategoryArea) {
            affectedCategoryIds.add(currentId);
            const parentCat = currentPage.categories?.find(c => c.id === currentId);
            currentId = parentCat?.parentId;
          }
        }
      });

      if (affectedCategoryIds.size > 0) {
        setDraggedCategoryAreas(prev => {
          const newAreas = { ...prev };
          affectedCategoryIds.forEach(catId => {
            if (catId !== isDraggingCategoryArea) {
              delete newAreas[catId];
            }
          });
          return newAreas;
        });

        affectedCategoryIds.forEach(catId => {
          if (catId !== isDraggingCategoryArea) {
            onClearCategoryCache?.(catId);
          }
        });
      }

      setAreaUpdateTrigger(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage?.categories?.map(c => `${c.id}:${c.size?.width}:${c.size?.height}:${c.isExpanded}`).join('|'),
    isDraggingCategoryArea
    // onClearCategoryCache, setAreaUpdateTrigger, setDraggedCategoryAreas는 안정적인 참조이므로 의존성 배열에서 제외
  ]);
};
