import { useCallback, MutableRefObject } from 'react';
import { Page, CanvasActionType } from '../types';
import { calculateCategoryArea, CategoryArea } from '../utils/categoryAreaUtils';
import { resolveUnifiedCollisions } from '../utils/collisionUtils';

interface UsePositionHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedMemoIds: string[];
  selectedCategoryIds: string[];
  isShiftPressed: boolean;
  draggedCategoryAreas: { [categoryId: string]: any };
  dragStartMemoPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  dragStartCategoryPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  previousFramePosition: MutableRefObject<Map<string, { x: number; y: number }>>;
  cacheCreationStarted: MutableRefObject<Set<string>>;
  categoryPositionTimers: MutableRefObject<Map<string, NodeJS.Timeout>>;
  memoPositionTimers: MutableRefObject<Map<string, NodeJS.Timeout>>;
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{ [categoryId: string]: any }>>;
  clearCategoryCache: (categoryId: string) => void;
  saveCanvasState: (actionType: CanvasActionType, description: string) => void;
  updateCategoryPositions: () => void;
}

export const usePositionHandlers = ({
  pages,
  setPages,
  currentPageId,
  selectedMemoIds,
  selectedCategoryIds,
  isShiftPressed,
  draggedCategoryAreas,
  dragStartMemoPositions,
  dragStartCategoryPositions,
  previousFramePosition,
  cacheCreationStarted,
  categoryPositionTimers,
  memoPositionTimers,
  setDraggedCategoryAreas,
  clearCategoryCache,
  saveCanvasState,
  updateCategoryPositions
}: UsePositionHandlersProps) => {

  // 카테고리 위치 업데이트
  const updateCategoryPosition = useCallback((categoryId: string, position: { x: number; y: number }) => {
    console.log('[App] updateCategoryPosition 호출 - categoryId:', categoryId, 'position:', position, 'timestamp:', Date.now());

    // 먼저 현재 카테고리 위치를 찾아서 델타 값 계산 (state 업데이트 전의 원본 위치 기준)
    const currentPage = pages.find(p => p.id === currentPageId);
    const targetCategory = currentPage?.categories?.find(cat => cat.id === categoryId);

    let deltaX = 0;
    let deltaY = 0;
    let frameDeltaX = 0;
    let frameDeltaY = 0;

    if (targetCategory) {
      deltaX = position.x - targetCategory.position.x;
      deltaY = position.y - targetCategory.position.y;

      // 이전 프레임 위치와 비교하여 프레임 간 delta 계산
      const prevPos = previousFramePosition.current.get(categoryId);
      if (prevPos) {
        frameDeltaX = position.x - prevPos.x;
        frameDeltaY = position.y - prevPos.y;
      } else {
        // 첫 프레임이면 전체 delta 사용
        frameDeltaX = deltaX;
        frameDeltaY = deltaY;
      }

      // 현재 위치를 이전 프레임으로 저장
      previousFramePosition.current.set(categoryId, { x: position.x, y: position.y });

      // 첫 번째 위치 변경 시 드래그 시작으로 간주하고 영역 캐시 및 메모 원본 위치 저장
      if (!cacheCreationStarted.current.has(categoryId) && currentPage) {
        console.log('[App] 캐시 생성 시작 - categoryId:', categoryId, '원본 위치:', targetCategory.position);
        cacheCreationStarted.current.add(categoryId);

        const currentArea = calculateCategoryArea(targetCategory, currentPage);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: targetCategory.position.x, y: targetCategory.position.y }
            }
          }));
        }

        // 모든 하위 카테고리 ID 수집 (재귀적으로)
        const getAllDescendantCategoryIds = (parentId: string): string[] => {
          const directChildren = (currentPage.categories || [])
            .filter(cat => cat.parentId === parentId)
            .map(cat => cat.id);

          const allDescendants = [...directChildren];
          directChildren.forEach(childId => {
            allDescendants.push(...getAllDescendantCategoryIds(childId));
          });

          return allDescendants;
        };

        const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

        // 다중 선택된 모든 카테고리들의 하위 요소 ID 수집
        const isMultiSelected = selectedCategoryIds.includes(categoryId);
        const allSelectedCategoriesDescendants = new Set<string>();
        if (isMultiSelected) {
          selectedCategoryIds.forEach(selectedCatId => {
            allSelectedCategoriesDescendants.add(selectedCatId);
            getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
              allSelectedCategoriesDescendants.add(descId);
            });
          });
        }

        // 모든 하위 depth의 메모들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const memoPositions = new Map<string, {x: number, y: number}>();
        currentPage.memos.forEach(memo => {
          // 드래그 중인 카테고리의 하위 메모
          if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 다른 카테고리들의 하위 메모
          else if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 메모들
          else if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
        });
        dragStartMemoPositions.current.set(categoryId, memoPositions);

        // 모든 하위 depth의 카테고리들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const categoryPositions = new Map<string, {x: number, y: number}>();
        currentPage.categories?.forEach(cat => {
          // 드래그 중인 카테고리의 하위 카테고리
          if (allDescendantCategoryIds.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
          // 다중 선택된 다른 카테고리들과 그 하위 카테고리들
          else if (isMultiSelected && allSelectedCategoriesDescendants.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
        });
        dragStartCategoryPositions.current.set(categoryId, categoryPositions);

      }
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const pageTargetCategory = (page.categories || []).find(cat => cat.id === categoryId);
      if (!pageTargetCategory) return page;

      // 원본 카테고리 위치와 새 위치의 총 델타 계산
      const cachedData = draggedCategoryAreas[categoryId];
      const totalDeltaX = cachedData ? position.x - cachedData.originalPosition.x : deltaX;
      const totalDeltaY = cachedData ? position.y - cachedData.originalPosition.y : deltaY;

      // 모든 하위 카테고리 ID 수집 (재귀적으로)
      const getAllDescendantCategoryIds = (parentId: string): string[] => {
        const directChildren = (page.categories || [])
          .filter(cat => cat.parentId === parentId)
          .map(cat => cat.id);

        const allDescendants = [...directChildren];
        directChildren.forEach(childId => {
          allDescendants.push(...getAllDescendantCategoryIds(childId));
        });

        return allDescendants;
      };

      // 다중 선택된 카테고리들 확인
      const isMultiSelected = selectedCategoryIds.includes(categoryId);


      // 드래그 중인 카테고리의 하위 요소만 수집 (이들은 부모를 따라 이동)
      const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

      // 다중 선택된 "모든" 카테고리들의 하위 요소 수집
      const allSelectedCategoriesDescendants = new Set<string>();
      if (isMultiSelected) {
        selectedCategoryIds.forEach(selectedCatId => {
          allSelectedCategoriesDescendants.add(selectedCatId);
          getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
            allSelectedCategoriesDescendants.add(descId);
          });
        });
      }

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = page.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 모든 하위 depth의 메모들도 함께 이동 (절대 위치 계산)
      const updatedMemos = page.memos.map(memo => {
        // 1. 드래그 중인 카테고리의 하위 메모들 이동 (절대 위치)
        if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
          const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
          if (originalPos) {
            return {
              ...memo,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음 (드래그 종료 후 호출 방지)
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 메모들도 이동 (절대 위치)
        if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 메모들도 이동 (절대 위치, 선택된 카테고리의 하위 요소가 아닌 경우만)
        if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
          if (!isDescendantOfSelectedCategory(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }
        return memo;
      });

      // 모든 하위 depth의 카테고리들도 함께 이동 (절대 위치 계산)
      const updatedCategories = (page.categories || []).map(category => {
        if (category.id === categoryId) {
          console.log('[App setPages] 카테고리 위치 업데이트 - categoryId:', categoryId, 'position:', position);
          return { ...category, position };
        }

        // 1. 드래그 중인 카테고리의 하위 카테고리들 이동 (절대 위치)
        if (allDescendantCategoryIds.has(category.id) && category.id !== categoryId) {
          const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
          if (originalPos) {
            return {
              ...category,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 카테고리들도 이동 (절대 위치)
        if (isMultiSelected && allSelectedCategoriesDescendants.has(category.id)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(category.id)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 최상위 카테고리들도 이동 (절대 위치, 하위가 아닌 것만)
        if (isMultiSelected && selectedCategoryIds.includes(category.id) && category.id !== categoryId && !allDescendantCategoryIds.has(category.id)) {
          if (!isDescendantOfSelectedCategory(category.parentId)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        return category;
      });

      // 충돌 검사 수행 (Shift 누르면 충돌 검사 건너뛰기)
      if (!isShiftPressed) {
        const pageWithUpdates = {
          ...page,
          memos: updatedMemos,
          categories: updatedCategories
        };

        // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
        // 다중 선택된 모든 카테고리와 메모의 ID 수집
        const allMovingIds = isMultiSelected
          ? [...selectedCategoryIds, ...selectedMemoIds]
          : [categoryId];

        const collisionResult = resolveUnifiedCollisions(categoryId, 'area', pageWithUpdates, 10, allMovingIds);

        return {
          ...page,
          memos: collisionResult.updatedMemos,
          categories: collisionResult.updatedCategories
        };
      }

      return {
        ...page,
        memos: updatedMemos,
        categories: updatedCategories
      };
    }));

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = categoryPositionTimers.current.get(categoryId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('category_move', `카테고리 이동: ${categoryId}`);
      categoryPositionTimers.current.delete(categoryId);
    }, 200);

    categoryPositionTimers.current.set(categoryId, newTimer);
  }, [
    pages,
    currentPageId,
    selectedMemoIds,
    selectedCategoryIds,
    isShiftPressed,
    draggedCategoryAreas,
    previousFramePosition,
    cacheCreationStarted,
    setDraggedCategoryAreas,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    setPages,
    categoryPositionTimers,
    saveCanvasState
  ]);

  // 메모 위치 업데이트
  const updateMemoPosition = useCallback((memoId: string, position: { x: number; y: number }) => {
    // 메모가 이동하면 부모 카테고리의 캐시 제거 (영역 재계산을 위해)
    const currentPage = pages.find(p => p.id === currentPageId);
    const movedMemo = currentPage?.memos.find(m => m.id === memoId);
    if (movedMemo?.parentId) {
      clearCategoryCache(movedMemo.parentId);
    }

    // 다중 선택된 메모들 확인
    const isMultiSelected = selectedMemoIds.includes(memoId);
    const deltaX = movedMemo ? position.x - movedMemo.position.x : 0;
    const deltaY = movedMemo ? position.y - movedMemo.position.y : 0;

    setPages(prev => {
      const currentPage = prev.find(p => p.id === currentPageId);
      if (!currentPage) {
        return prev.map(page =>
          page.id === currentPageId
            ? {
                ...page,
                memos: page.memos.map(memo =>
                  memo.id === memoId ? { ...memo, position } : memo
                )
              }
            : page
        );
      }

      const movedMemo = currentPage.memos.find(m => m.id === memoId);
      if (!movedMemo) return prev;

      // 영역과의 충돌 체크 (방향별)
      const categories = currentPage.categories || [];
      const memoWidth = movedMemo.size?.width || 200;
      const memoHeight = movedMemo.size?.height || 95;

      let restrictedX = false;
      let restrictedY = false;

      // 부모가 없는 메모만 영역 충돌 검사 (Shift 누르면 스킵)
      if (!movedMemo.parentId && !isShiftPressed) {
        for (const category of categories) {
          const categoryArea = calculateCategoryArea(category, currentPage);
          if (!categoryArea) continue;

          // 새 위치에서의 메모 영역
          const newMemoBounds = {
            left: position.x,
            top: position.y,
            right: position.x + memoWidth,
            bottom: position.y + memoHeight
          };

          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };

          // 겹침 계산
          const overlapLeft = Math.max(newMemoBounds.left, areaBounds.left);
          const overlapTop = Math.max(newMemoBounds.top, areaBounds.top);
          const overlapRight = Math.min(newMemoBounds.right, areaBounds.right);
          const overlapBottom = Math.min(newMemoBounds.bottom, areaBounds.bottom);

          // 겹침이 있으면
          if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
            // X 방향 이동 체크
            const deltaX = position.x - movedMemo.position.x;
            if (deltaX !== 0) restrictedX = true;

            // Y 방향 이동 체크
            const deltaY = position.y - movedMemo.position.y;
            if (deltaY !== 0) restrictedY = true;
          }
        }
      }

      // 제한된 방향은 원래 위치 유지
      const finalPosition = {
        x: restrictedX ? movedMemo.position.x : position.x,
        y: restrictedY ? movedMemo.position.y : position.y
      };

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = currentPage.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 선택된 카테고리의 모든 하위 요소(메모, 카테고리) 찾기
      const getAllChildrenOfCategories = (categoryIds: string[]): { memos: Set<string>, categories: Set<string> } => {
        const childMemos = new Set<string>();
        const childCategories = new Set<string>();

        const addDescendants = (catId: string) => {
          // 이 카테고리의 직계 자식 메모들
          currentPage.memos.forEach(m => {
            if (m.parentId === catId) {
              childMemos.add(m.id);
            }
          });

          // 이 카테고리의 직계 자식 카테고리들
          currentPage.categories?.forEach(c => {
            if (c.parentId === catId) {
              childCategories.add(c.id);
              // 재귀적으로 하위 요소들도 추가
              addDescendants(c.id);
            }
          });
        };

        categoryIds.forEach(catId => addDescendants(catId));
        return { memos: childMemos, categories: childCategories };
      };

      const childrenOfSelectedCategories = isMultiSelected
        ? getAllChildrenOfCategories(selectedCategoryIds)
        : { memos: new Set<string>(), categories: new Set<string>() };

      console.log('🔍 선택된 카테고리의 하위 요소:', {
        selectedCategoryIds,
        childMemos: Array.from(childrenOfSelectedCategories.memos),
        childCategories: Array.from(childrenOfSelectedCategories.categories)
      });

      // 메모 위치 업데이트 (다중 선택 시 선택된 모든 메모 + 선택된 카테고리의 하위 메모들 함께 이동)
      const updatedPage = {
        ...currentPage,
        memos: currentPage.memos.map(memo => {
          if (memo.id === memoId) {
            return { ...memo, position: finalPosition };
          }

          // 1. 다중 선택된 다른 메모들 이동 (단, 선택된 카테고리의 하위 요소가 아닌 경우만)
          if (isMultiSelected && selectedMemoIds.includes(memo.id) && memo.id !== memoId) {
            if (!isDescendantOfSelectedCategory(memo.parentId)) {
              return {
                ...memo,
                position: {
                  x: memo.position.x + deltaX,
                  y: memo.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 메모들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.memos.has(memo.id)) {
            return {
              ...memo,
              position: {
                x: memo.position.x + deltaX,
                y: memo.position.y + deltaY
              }
            };
          }

          return memo;
        }),
        // 선택된 카테고리들 + 하위 카테고리들 함께 이동
        categories: (currentPage.categories || []).map(category => {
          // 1. 직접 선택된 카테고리 이동 (단, 다른 선택된 카테고리의 하위가 아닌 경우만)
          if (isMultiSelected && selectedCategoryIds.includes(category.id)) {
            if (!isDescendantOfSelectedCategory(category.parentId)) {
              return {
                ...category,
                position: {
                  x: category.position.x + deltaX,
                  y: category.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 카테고리들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.categories.has(category.id)) {
            return {
              ...category,
              position: {
                x: category.position.x + deltaX,
                y: category.position.y + deltaY
              }
            };
          }

          return category;
        })
      };

      // Shift 드래그 중에는 충돌 검사 안 함
      if (isShiftPressed) {
        return prev.map(page =>
          page.id === currentPageId
            ? updatedPage
            : page
        );
      }

      // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
      // 다중 선택된 모든 메모와 카테고리의 ID 수집
      const allMovingIds = isMultiSelected
        ? [...selectedMemoIds, ...selectedCategoryIds]
        : [memoId];

      const collisionResult = resolveUnifiedCollisions(memoId, 'memo', updatedPage, 10, allMovingIds);

      return prev.map(page =>
        page.id === currentPageId
          ? {
              ...page,
              categories: collisionResult.updatedCategories,
              memos: collisionResult.updatedMemos
            }
          : page
      );
    });

    // 메모 이동 후 부모 카테고리의 라벨 위치 업데이트
    if (movedMemo?.parentId) {
      setTimeout(() => updateCategoryPositions(), 0);
    }

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = memoPositionTimers.current.get(memoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('memo_move', `메모 이동: ${memoId}`);
      memoPositionTimers.current.delete(memoId);
    }, 200);

    memoPositionTimers.current.set(memoId, newTimer);
  }, [
    pages,
    currentPageId,
    selectedMemoIds,
    selectedCategoryIds,
    isShiftPressed,
    clearCategoryCache,
    setPages,
    updateCategoryPositions,
    memoPositionTimers,
    saveCanvasState
  ]);

  return {
    updateCategoryPosition,
    updateMemoPosition
  };
};
