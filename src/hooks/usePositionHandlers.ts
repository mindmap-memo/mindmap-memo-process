import { useCallback, MutableRefObject } from 'react';
import { Page, CanvasActionType } from '../types';
import { calculateCategoryArea, CategoryArea } from '../utils/categoryAreaUtils';
import { resolveUnifiedCollisions, resolveAreaCollisions } from '../utils/collision';
import {
  getAllDescendantCategoryIds,
  getAllParentCategoryIds,
  isDescendantOfSelectedCategory,
  getAllChildrenOfCategories
} from '../utils/categoryHierarchyUtils';

interface UsePositionHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedMemoIds: string[];
  selectedCategoryIds: string[];
  isShiftPressed: boolean;
  isShiftPressedRef: React.MutableRefObject<boolean>;  // Ref 추가
  draggedCategoryAreas: MutableRefObject<{ [categoryId: string]: any }>;
  dragStartMemoPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  dragStartCategoryPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  previousFramePosition: MutableRefObject<Map<string, { x: number; y: number }>>;
  cacheCreationStarted: MutableRefObject<Set<string>>;
  categoryPositionTimers: MutableRefObject<Map<string, NodeJS.Timeout>>;
  memoPositionTimers: MutableRefObject<Map<string, NodeJS.Timeout>>;
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
  isShiftPressedRef,
  draggedCategoryAreas,
  dragStartMemoPositions,
  dragStartCategoryPositions,
  previousFramePosition,
  cacheCreationStarted,
  categoryPositionTimers,
  memoPositionTimers,
  clearCategoryCache,
  saveCanvasState,
  updateCategoryPositions
}: UsePositionHandlersProps) => {

  // 카테고리 위치 업데이트
  const updateCategoryPosition = useCallback((categoryId: string, position: { x: number; y: number }) => {

    // 먼저 현재 카테고리 위치를 찾아서 델타 값 계산 (state 업데이트 전의 원본 위치 기준)
    const currentPage = pages.find(p => p.id === currentPageId);
    const targetCategory = currentPage?.categories?.find(cat => cat.id === categoryId);

    if (!targetCategory || !currentPage) return;

    let deltaX = 0;
    let deltaY = 0;
    let frameDeltaX = 0;
    let frameDeltaY = 0;

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

    // 첫 번째 위치 변경 시 드래그 시작으로 간주하고 영역 캐시 및 하위 요소 원본 위치 저장
    if (!cacheCreationStarted.current.has(categoryId)) {
      cacheCreationStarted.current.add(categoryId);

      // 원본 위치는 무조건 저장 (영역이 없어도)
      const originalPos = { x: targetCategory.position.x, y: targetCategory.position.y };
      const currentArea = calculateCategoryArea(targetCategory, currentPage);

      // 영역이 있든 없든 원본 위치는 무조건 저장 (Shift 드롭에서 필요)
      draggedCategoryAreas.current[categoryId] = {
        area: currentArea,
        originalPosition: originalPos
      };

      const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId, currentPage.categories || [])]);

      // 다중 선택된 모든 카테고리들의 하위 요소 ID 수집
      const isMultiSelected = selectedCategoryIds.includes(categoryId);
      const allSelectedCategoriesDescendants = new Set<string>();
      if (isMultiSelected) {
        selectedCategoryIds.forEach(selectedCatId => {
          allSelectedCategoriesDescendants.add(selectedCatId);
          getAllDescendantCategoryIds(selectedCatId, currentPage.categories || []).forEach(descId => {
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

      console.log('[Position Handler] 드래그 시작 - 원본 위치 저장 완료:', {
        draggedCategoryId: categoryId,
        memoPositionsCount: memoPositions.size,
        categoryPositionsCount: categoryPositions.size
      });
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const pageTargetCategory = (page.categories || []).find(cat => cat.id === categoryId);
      if (!pageTargetCategory) return page;

      // 원본 카테고리 위치와 새 위치의 총 델타 계산
      const cachedData = draggedCategoryAreas.current[categoryId];
      const totalDeltaX = cachedData ? position.x - cachedData.originalPosition.x : deltaX;
      const totalDeltaY = cachedData ? position.y - cachedData.originalPosition.y : deltaY;

      // 다중 선택된 카테고리들 확인
      const isMultiSelected = selectedCategoryIds.includes(categoryId);


      // 드래그 중인 카테고리의 하위 요소만 수집 (이들은 부모를 따라 이동)
      const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId, page.categories || [])]);

      // 다중 선택된 "모든" 카테고리들의 하위 요소 수집
      const allSelectedCategoriesDescendants = new Set<string>();
      if (isMultiSelected) {
        selectedCategoryIds.forEach(selectedCatId => {
          allSelectedCategoriesDescendants.add(selectedCatId);
          getAllDescendantCategoryIds(selectedCatId, page.categories || []).forEach(descId => {
            allSelectedCategoriesDescendants.add(descId);
          });
        });
      }

      // 모든 하위 depth의 메모들도 함께 이동 (절대 위치 계산)
      // Shift 드래그 시 하위 요소를 이동시키지 않음
      const updatedMemos = page.memos.map(memo => {
        // 1. 드래그 중인 카테고리의 하위 메모들 이동 (절대 위치)
        // Shift 모드면 하위 메모 이동 스킵
        if (!isShiftPressedRef.current && memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
          const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
          if (originalPos) {
            return {
              ...memo,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          } else {
            // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용 (즉시 이동)
            return {
              ...memo,
              position: {
                x: memo.position.x + frameDeltaX,
                y: memo.position.y + frameDeltaY
              }
            };
          }
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 메모들도 이동 (절대 위치)
        // Shift 모드면 다중 선택 하위 메모 이동 스킵
        if (!isShiftPressedRef.current && isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
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
            } else {
              // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용
              return {
                ...memo,
                position: {
                  x: memo.position.x + frameDeltaX,
                  y: memo.position.y + frameDeltaY
                }
              };
            }
          }
        }

        // 3. 다중 선택된 메모들도 이동 (절대 위치, 선택된 카테고리의 하위 요소가 아닌 경우만)
        if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
          if (!isDescendantOfSelectedCategory(memo.parentId, selectedCategoryIds, page.categories || [])) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            } else {
              // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용
              return {
                ...memo,
                position: {
                  x: memo.position.x + frameDeltaX,
                  y: memo.position.y + frameDeltaY
                }
              };
            }
          }
        }
        return memo;
      });

      // 모든 하위 depth의 카테고리들도 함께 이동 (절대 위치 계산)
      // 롱프레스 활성화 시 하위 요소를 이동시키지 않음
      const updatedCategories = (page.categories || []).map(category => {
        if (category.id === categoryId) {
          return { ...category, position };
        }

        // 1. 드래그 중인 카테고리의 하위 카테고리들 이동 (절대 위치)
        // 롱프레스 모드면 하위 카테고리 이동 스킵
        if (!isShiftPressedRef.current && allDescendantCategoryIds.has(category.id) && category.id !== categoryId) {
          const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
          if (originalPos) {
            return {
              ...category,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          } else {
            // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용 (즉시 이동)
            return {
              ...category,
              position: {
                x: category.position.x + frameDeltaX,
                y: category.position.y + frameDeltaY
              }
            };
          }
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 카테고리들도 이동 (절대 위치)
        // 롱프레스 모드면 다중 선택 하위 카테고리 이동 스킵
        if (!isShiftPressedRef.current && isMultiSelected && allSelectedCategoriesDescendants.has(category.id)) {
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
            } else {
              // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용
              return {
                ...category,
                position: {
                  x: category.position.x + frameDeltaX,
                  y: category.position.y + frameDeltaY
                }
              };
            }
          }
        }

        // 3. 다중 선택된 최상위 카테고리들도 이동 (절대 위치, 하위가 아닌 것만)
        if (isMultiSelected && selectedCategoryIds.includes(category.id) && category.id !== categoryId && !allDescendantCategoryIds.has(category.id)) {
          if (!isDescendantOfSelectedCategory(category.parentId, selectedCategoryIds, page.categories || [])) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            } else {
              // 원본 위치가 없으면 현재 위치에서 프레임 delta 적용
              return {
                ...category,
                position: {
                  x: category.position.x + frameDeltaX,
                  y: category.position.y + frameDeltaY
                }
              };
            }
          }
        }

        return category;
      });

      // 충돌 검사 수행 (Shift 드래그 시 충돌 검사 건너뛰기)
      // Ref를 사용하여 드래그 중 Shift 상태 변경을 실시간으로 반영
      if (!isShiftPressedRef.current) {
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

        // 프레임 delta 전달 (충돌 당한 객체가 같은 속도로 밀려나도록)
        const collisionResult = resolveUnifiedCollisions(
          categoryId,
          'area',
          pageWithUpdates,
          10,
          allMovingIds,
          { x: frameDeltaX, y: frameDeltaY },
          isShiftPressedRef.current
        );

        // 영역 이동 시 메모와 충돌 처리 추가
        // resolveAreaCollisions의 영역-메모 충돌 로직 실행
        let finalPage = {
          ...page,
          memos: collisionResult.updatedMemos,
          categories: collisionResult.updatedCategories
        };

        // 이동 중인 모든 카테고리들에 대해 영역-메모 충돌 검사
        const categoriesToCheck = isMultiSelected ? selectedCategoryIds : [categoryId];

        for (const catId of categoriesToCheck) {
          const movingCategory = finalPage.categories?.find(cat => cat.id === catId);
          if (movingCategory && movingCategory.isExpanded) {
            const movingArea = calculateCategoryArea(movingCategory, finalPage);

            if (movingArea) {
              // 모든 메모를 대상으로 충돌 검사
              finalPage.memos = finalPage.memos.map(memo => {
                // 이 카테고리의 자식 메모는 제외
                if (memo.parentId === catId) return memo;

                // 이 카테고리의 하위 카테고리들의 자식 메모도 제외
                const isDescendantMemo = (memoParentId: string | null | undefined): boolean => {
                  if (!memoParentId) return false;
                  if (memoParentId === catId) return true;

                  const parentCat = finalPage.categories?.find(c => c.id === memoParentId);
                  if (!parentCat) return false;

                  return isDescendantMemo(parentCat.parentId);
                };

                if (isDescendantMemo(memo.parentId)) return memo;

                // 이동 중인 다른 카테고리/메모는 제외 (우선순위 0)
                if (allMovingIds.includes(memo.id)) return memo;

                const memoWidth = memo.size?.width || 200;
                const memoHeight = memo.size?.height || 95;

                const memoBounds = {
                  left: memo.position.x,
                  top: memo.position.y,
                  right: memo.position.x + memoWidth,
                  bottom: memo.position.y + memoHeight
                };

                const areaBounds = {
                  left: movingArea.x,
                  top: movingArea.y,
                  right: movingArea.x + movingArea.width,
                  bottom: movingArea.y + movingArea.height
                };

                // 겹침 계산
                const overlapLeft = Math.max(memoBounds.left, areaBounds.left);
                const overlapTop = Math.max(memoBounds.top, areaBounds.top);
                const overlapRight = Math.min(memoBounds.right, areaBounds.right);
                const overlapBottom = Math.min(memoBounds.bottom, areaBounds.bottom);

                if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) return memo;

                // 밀어낼 방향 계산
                const memoBoundsArea: CategoryArea = {
                  x: memoBounds.left,
                  y: memoBounds.top,
                  width: memoBounds.right - memoBounds.left,
                  height: memoBounds.bottom - memoBounds.top
                };

                const areaBoundsArea: CategoryArea = {
                  x: areaBounds.left,
                  y: areaBounds.top,
                  width: areaBounds.right - areaBounds.left,
                  height: areaBounds.bottom - areaBounds.top
                };

                // calculatePushDirection 대신 직접 계산 (import 없이)
                const overlapWidth = overlapRight - overlapLeft;
                const overlapHeight = overlapBottom - overlapTop;

                let pushX = 0;
                let pushY = 0;

                if (overlapWidth < overlapHeight) {
                  // X축 겹침이 적음 - X 방향으로 밀기
                  const direction = areaBounds.left < memoBounds.left ? 1 : -1;
                  pushX = overlapWidth * direction;
                } else {
                  // Y축 겹침이 적음 - Y 방향으로 밀기
                  const direction = areaBounds.top < memoBounds.top ? 1 : -1;
                  pushY = overlapHeight * direction;
                }

                // 프레임 delta로 제한 (부드러운 이동)
                if (frameDeltaX !== 0 || frameDeltaY !== 0) {
                  const frameDeltaAbsX = Math.abs(frameDeltaX);
                  const frameDeltaAbsY = Math.abs(frameDeltaY);

                  if (pushX !== 0) {
                    const pushDirX = Math.sign(pushX);
                    pushX = pushDirX * Math.min(frameDeltaAbsX, Math.abs(pushX));
                  }
                  if (pushY !== 0) {
                    const pushDirY = Math.sign(pushY);
                    pushY = pushDirY * Math.min(frameDeltaAbsY, Math.abs(pushY));
                  }
                }

                return {
                  ...memo,
                  position: {
                    x: memo.position.x + pushX,
                    y: memo.position.y + pushY
                  }
                };
              });
            }
          }
        }

        // 카테고리가 다른 카테고리 내부에 있다면, 모든 상위 카테고리의 영역 변경을 재귀적으로 확인
        // Shift 드래그 중에는 스킵
        if (pageTargetCategory.parentId && !isShiftPressedRef.current) {
          const allParentIds = getAllParentCategoryIds(pageTargetCategory.parentId, finalPage.categories || []);

          // 원본 페이지 상태 가져오기
          const originalPageState = pages.find(p => p.id === currentPageId);
          if (originalPageState) {
            // 영역이 있는 카테고리 수집 (변경 여부와 무관하게 충돌 검사 필요)
            const changedCategoryIds: string[] = [];

            for (const parentId of allParentIds) {
              const parentCategory = finalPage.categories?.find(c => c.id === parentId);
              if (parentCategory?.isExpanded) {
                // 새 영역 계산 (현재 finalPage 기준)
                const newArea = calculateCategoryArea(parentCategory, finalPage);

                // 영역이 존재하면 충돌 검사 대상에 추가
                // (하위요소 드래그 중 방향 전환 시에도 충돌 검사가 누락되지 않도록)
                if (newArea) {
                  changedCategoryIds.push(parentId);
                }
              }
            }

            // 변경된 카테고리가 있으면 충돌 검사
            if (changedCategoryIds.length > 0) {
              // 모든 변경된 카테고리에 대해 충돌 검사
              // (최상위 필터링 제거 - 하위 카테고리도 같은 부모 내 형제 요소와 충돌할 수 있음)

              // 모든 변경된 카테고리에 대해 충돌 검사
              // 영역 드래그와 동일한 방식으로 처리 (resolveUnifiedCollisions 사용)
              for (const parentId of changedCategoryIds) {
                const parentCategory = finalPage.categories?.find(c => c.id === parentId);
                if (!parentCategory) continue;

                // 영역 드래그와 동일하게 통합 충돌 검사 사용
                const collisionResult = resolveUnifiedCollisions(
                  parentId,
                  'area',
                  finalPage,
                  10,
                  [parentId], // 이동 중인 영역으로 취급
                  { x: frameDeltaX, y: frameDeltaY }, // 하위 카테고리 이동 속도 전달
                  isShiftPressedRef.current
                );

                finalPage = {
                  ...finalPage,
                  categories: collisionResult.updatedCategories,
                  memos: collisionResult.updatedMemos
                };
              }
            }
          }
        }

        return finalPage;
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
    dragStartMemoPositions,
    dragStartCategoryPositions,
    setPages,
    categoryPositionTimers,
    saveCanvasState,
    isShiftPressedRef
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
      if (!movedMemo) {
        return prev;
      }

      // 위치 제한 로직 제거 - 충돌 검사는 resolveUnifiedCollisions에서 처리
      const finalPosition = position;

      const childrenOfSelectedCategories = isMultiSelected
        ? getAllChildrenOfCategories(selectedCategoryIds, currentPage)
        : { memos: new Set<string>(), categories: new Set<string>() };

      // 메모 위치 업데이트 (다중 선택 시 선택된 모든 메모 + 선택된 카테고리의 하위 메모들 함께 이동)
      const updatedPage = {
        ...currentPage,
        memos: currentPage.memos.map(memo => {
          if (memo.id === memoId) {
            return { ...memo, position: finalPosition };
          }

          // 1. 다중 선택된 다른 메모들 이동 (단, 선택된 카테고리의 하위 요소가 아닌 경우만)
          if (isMultiSelected && selectedMemoIds.includes(memo.id) && memo.id !== memoId) {
            if (!isDescendantOfSelectedCategory(memo.parentId, selectedCategoryIds, currentPage.categories || [])) {
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
            if (!isDescendantOfSelectedCategory(category.parentId, selectedCategoryIds, currentPage.categories || [])) {
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
      // Ref를 사용하여 드래그 중 Shift 상태 변경을 실시간으로 반영
      if (isShiftPressedRef.current) {
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

      const collisionResult = resolveUnifiedCollisions(
        memoId,
        'memo',
        updatedPage,
        10,
        allMovingIds,
        undefined,
        isShiftPressedRef.current
      );

      let finalPage = {
        ...updatedPage,
        categories: collisionResult.updatedCategories,
        memos: collisionResult.updatedMemos
      };

      // 메모가 카테고리 내부에 있다면, 모든 상위 카테고리의 영역 변경을 재귀적으로 확인
      // Shift 드래그 중에는 스킵
      if (movedMemo?.parentId && !isShiftPressedRef.current) {
        const allParentIds = getAllParentCategoryIds(movedMemo.parentId, finalPage.categories || []);

        // 영역이 있는 카테고리 수집 (변경 여부와 무관하게 충돌 검사 필요)
        const changedCategoryIds: string[] = [];

        for (const parentId of allParentIds) {
          const parentCategory = finalPage.categories?.find(c => c.id === parentId);
          console.log('[Memo Drag] 카테고리 확인:', parentId, 'isExpanded:', parentCategory?.isExpanded);
          if (parentCategory?.isExpanded) {
            // 새 영역 계산 (현재 finalPage 기준)
            const newArea = calculateCategoryArea(parentCategory, finalPage);
            console.log('[Memo Drag] 영역 계산:', parentId, 'area:', newArea);

            // 영역이 존재하면 충돌 검사 대상에 추가
            // (하위요소 드래그 중 방향 전환 시에도 충돌 검사가 누락되지 않도록)
            if (newArea) {
              changedCategoryIds.push(parentId);
            }
          }
        }

        // 변경된 카테고리가 있으면 충돌 검사
        if (changedCategoryIds.length > 0) {
          console.log('[Memo Drag] 영역 변경 감지:', changedCategoryIds);

          // 모든 변경된 카테고리에 대해 충돌 검사
          // (최상위 필터링 제거 - b가 확장되어 a 내부의 d와 충돌할 수 있음)
          console.log('[Memo Drag] 충돌 검사 대상:', changedCategoryIds);

          // 모든 변경된 카테고리에 대해 충돌 검사
          // 영역 드래그와 동일한 방식으로 처리 (resolveUnifiedCollisions 사용)
          for (const parentId of changedCategoryIds) {
            const parentCategory = finalPage.categories?.find(c => c.id === parentId);
            if (!parentCategory) {
              continue;
            }

            // 영역 드래그와 동일하게 통합 충돌 검사 사용
            const collisionResult = resolveUnifiedCollisions(
              parentId,
              'area',
              finalPage,
              10,
              [parentId], // 이동 중인 영역으로 취급
              { x: deltaX, y: deltaY }, // 메모 이동 속도 전달
              isShiftPressedRef.current
            );

            finalPage = {
              ...finalPage,
              categories: collisionResult.updatedCategories,
              memos: collisionResult.updatedMemos
            };
          }
        }
      }

      return prev.map(page =>
        page.id === currentPageId ? finalPage : page
      );
    });

    // 메모 이동 후 부모 카테고리의 라벨 위치 업데이트
    // Shift 드래그 중에는 업데이트 스킵
    if (movedMemo?.parentId && !isShiftPressedRef.current) {
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
    saveCanvasState,
    isShiftPressedRef
  ]);

  return {
    updateCategoryPosition,
    updateMemoPosition
  };
};
