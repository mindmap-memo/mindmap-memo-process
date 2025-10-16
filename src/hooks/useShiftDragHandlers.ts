import { useCallback, MutableRefObject } from 'react';
import { Page, MemoBlock, CategoryBlock, CanvasActionType } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';

interface UseShiftDragHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedCategoryIds: string[];
  draggedCategoryAreas: MutableRefObject<{ [categoryId: string]: any }>;
  dragStartMemoPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  dragStartCategoryPositions: MutableRefObject<Map<string, Map<string, { x: number; y: number }>>>;
  toggleCategoryExpanded: (categoryId: string) => void;
  saveCanvasState: (actionType: CanvasActionType, description: string) => void;
  clearCategoryCache: (categoryId: string) => void;
}

export const useShiftDragHandlers = ({
  pages,
  setPages,
  currentPageId,
  selectedCategoryIds,
  draggedCategoryAreas,
  dragStartMemoPositions,
  dragStartCategoryPositions,
  toggleCategoryExpanded,
  saveCanvasState,
  clearCategoryCache
}: UseShiftDragHandlersProps) => {

  // 겹침 체크 헬퍼 함수
  const isOverlapping = useCallback((bounds1: any, bounds2: any, margin = 50) => {
    const overlaps = !(bounds1.right + margin < bounds2.left ||
             bounds1.left - margin > bounds2.right ||
             bounds1.bottom + margin < bounds2.top ||
             bounds1.top - margin > bounds2.bottom);

    return overlaps;
  }, []);

  // 모든 하위 카테고리 ID를 재귀적으로 가져오는 함수
  const getAllDescendantIds = useCallback((categoryId: string, currentPage: Page): string[] => {
    const descendants: string[] = [categoryId];
    const children = (currentPage.categories || []).filter(c => c.parentId === categoryId);
    children.forEach(child => {
      descendants.push(...getAllDescendantIds(child.id, currentPage));
    });
    return descendants;
  }, []);

  // 가장 깊은 레벨의 카테고리 찾기
  const findDeepestCategory = useCallback((overlappingCategories: CategoryBlock[], currentPage: Page): CategoryBlock | null => {
    if (overlappingCategories.length === 0) return null;

    // 각 카테고리의 깊이를 계산
    const categoriesWithDepth = overlappingCategories.map(category => {
      let depth = 0;
      let checkParent = category.parentId;
      while (checkParent) {
        depth++;
        const parentCat = currentPage.categories?.find(c => c.id === checkParent);
        checkParent = parentCat?.parentId;
      }
      return { category, depth };
    });

    // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
    const deepest = categoriesWithDepth.reduce((max, item) =>
      item.depth > max.depth ? item : max
    );

    return deepest.category;
  }, []);

  // Shift 드래그로 카테고리에 카테고리 추가
  const handleShiftDropCategory = useCallback((
    draggedCategory: CategoryBlock,
    position: { x: number; y: number },
    currentPage: Page,
    cachedAreas?: {[categoryId: string]: any}
  ) => {
    // 카테고리 찾기
    const categoryWidth = draggedCategory.size?.width || 200;
    const categoryHeight = draggedCategory.size?.height || 80;
    const categoryBounds = {
      left: position.x,
      top: position.y,
      right: position.x + categoryWidth,
      bottom: position.y + categoryHeight
    };

    // 드래그 중인 카테고리와 그 모든 하위 카테고리들 + 현재 부모 카테고리를 제외한 페이지 데이터 생성
    const excludedIds = getAllDescendantIds(draggedCategory.id, currentPage);
    // 현재 부모도 제외 (빠져나올 때 부모에 추가 UI가 계속 뜨는 것 방지)
    if (draggedCategory.parentId) {
      excludedIds.push(draggedCategory.parentId);
    }
    const pageWithoutDraggingCategory = {
      ...currentPage,
      categories: (currentPage.categories || []).filter(c => !excludedIds.includes(c.id)),
      memos: currentPage.memos.filter(m => !excludedIds.includes(m.parentId || ''))
    };

    // 타겟 카테고리 찾기 (자기 자신과 자신의 하위는 이미 pageWithoutDraggingCategory에서 제외됨)
    // 겹치는 모든 카테고리 찾기
    const overlappingCategories = pageWithoutDraggingCategory.categories?.filter(category => {

      // 1. 카테고리 블록과의 점 충돌 체크 (마우스 포인터 기반)
      const catWidth = category.size?.width || 200;
      const catHeight = category.size?.height || 80;
      const catBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + catWidth,
        bottom: category.position.y + catHeight
      };

      // 마우스 포인터(드롭 위치)가 카테고리 블록 안에 있는지 체크
      const isPointerInBlock = (
        position.x >= catBounds.left &&
        position.x <= catBounds.right &&
        position.y >= catBounds.top &&
        position.y <= catBounds.bottom
      );

      if (isPointerInBlock) {
        return true;
      }

      // 2. 카테고리 영역과의 점 충돌 체크 (마우스 포인터 기반)
      // 펼쳐진 카테고리만 영역 체크 (성능 최적화)
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 카테고리를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingCategory);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };

          // 마우스 포인터가 영역 안에 있는지 체크
          const isPointerInArea = (
            position.x >= areaBounds.left &&
            position.x <= areaBounds.right &&
            position.y >= areaBounds.top &&
            position.y <= areaBounds.bottom
          );

          if (isPointerInArea) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    let targetCategory = findDeepestCategory(overlappingCategories, currentPage);

    // 순환 종속 방지: 타겟 카테고리가 드래그된 카테고리의 하위인지 확인
    if (targetCategory) {
      const targetDescendants = getAllDescendantIds(draggedCategory.id, currentPage);
      if (targetDescendants.includes(targetCategory.id)) {
        targetCategory = null;  // 순환 종속 방지
      }
    }

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedCategory.parentId !== newParentId;

    // 다중 선택된 카테고리들도 함께 종속
    const categoriesToMove = selectedCategoryIds.includes(draggedCategory.id)
      ? [draggedCategory.id, ...selectedCategoryIds.filter(id => id !== draggedCategory.id)]
      : [draggedCategory.id];

    if (parentChanged) {
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          // 원래 위치 정보 가져오기 (드래그 시작 시 저장된 위치)
          const originalMemoPositions = dragStartMemoPositions.current.get(draggedCategory.id);
          const originalCategoryPositions = dragStartCategoryPositions.current.get(draggedCategory.id);

          // 총 이동량 계산 (드래그 시작 위치 → 드롭 위치)
          // draggedCategoryAreas에 저장된 원본 위치 사용 (드래그 중 업데이트된 position이 아닌)
          const cachedData = draggedCategoryAreas.current[draggedCategory.id];
          const originalCategoryPos = cachedData?.originalPosition || draggedCategory.position;
          const totalDeltaX = position.x - originalCategoryPos.x;
          const totalDeltaY = position.y - originalCategoryPos.y;

          // 부모 카테고리의 children 업데이트
          let updatedCategories = (p.categories || []).map(category => {
            // 드래그된 카테고리들의 parentId만 변경하고 위치는 드롭 위치로
            if (categoriesToMove.includes(category.id)) {
              // 드래그된 메인 카테고리는 드롭 위치(position) 사용
              if (category.id === draggedCategory.id) {
                return {
                  ...category,
                  parentId: newParentId,
                  position: position  // 드롭 위치 사용
                };
              } else {
                // 다중 선택된 다른 카테고리들은 원래 위치 + 총 이동량으로 계산
                if (originalCategoryPositions && originalCategoryPositions.has(category.id)) {
                  const originalPos = originalCategoryPositions.get(category.id);
                  if (originalPos) {
                    const newPos = {
                      x: originalPos.x + totalDeltaX,
                      y: originalPos.y + totalDeltaY
                    };
                    return {
                      ...category,
                      parentId: newParentId,
                      position: newPos
                    };
                  }
                }
                return {
                  ...category,
                  parentId: newParentId
                };
              }
            }

            // 하위 카테고리들은 원래 위치 + 총 이동량으로 계산
            if (originalCategoryPositions && originalCategoryPositions.has(category.id)) {
              const originalPos = originalCategoryPositions.get(category.id);
              if (originalPos) {
                const newPos = {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                };
                return {
                  ...category,
                  position: newPos
                };
              }
            }

            // 이전 부모들에서 제거 (다중 선택된 카테고리들 모두)
            if (categoriesToMove.some(catId => {
              const cat = p.categories?.find(c => c.id === catId);
              return cat?.parentId === category.id;
            })) {
              return {
                ...category,
                children: (category.children || []).filter(id => !categoriesToMove.includes(id))
              };
            }

            // 새 부모에 추가 (다중 선택된 카테고리들 모두)
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              const newChildren = [...currentChildren, ...categoriesToMove.filter(id => !currentChildren.includes(id))];
              return {
                ...category,
                children: newChildren,
                isExpanded: true  // 자동 확장
              };
            }

            return category;
          });

          // 하위 메모들은 원래 위치 + 총 이동량으로 계산
          let updatedMemos = p.memos.map(memo => {
            if (originalMemoPositions && originalMemoPositions.has(memo.id)) {
              const originalPos = originalMemoPositions.get(memo.id);
              if (originalPos) {
                const newPos = {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                };
                return {
                  ...memo,
                  position: newPos
                };
              }
            }
            return memo;
          });

          return {
            ...p,
            categories: updatedCategories,
            memos: updatedMemos
          };
        }
        return p;
      }));

      // Shift 드래그로 카테고리에 넣을 때만 펼침 (빼낼 때는 펼치지 않음)
      if (targetCategory && newParentId && !targetCategory.isExpanded) {
        toggleCategoryExpanded(targetCategory.id);
      }

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 카테고리 이동: ${draggedCategory.title} → ${targetName} (모든 하위 항목 포함)`);

      // 드롭 후 캐시 클리어 (중요!)
      clearCategoryCache(draggedCategory.id);

      // 부모 카테고리의 캐시도 클리어 (새 자식이 추가되었으므로 영역 재계산 필요)
      if (targetCategory) {
        clearCategoryCache(targetCategory.id);
      }

      // 이전 부모 카테고리의 캐시도 클리어 (자식이 제거되었으므로 영역 재계산 필요)
      if (draggedCategory.parentId) {
        clearCategoryCache(draggedCategory.parentId);
      }
    } else {
      // 같은 카테고리 내에서 위치만 변경 (종속 안 함)
      // 하지만 하위 메모와 카테고리들도 함께 이동해야 함!
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          // 원래 위치 정보 가져오기
          const originalMemoPositions = dragStartMemoPositions.current.get(draggedCategory.id);
          const originalCategoryPositions = dragStartCategoryPositions.current.get(draggedCategory.id);

          // 총 이동량 계산
          const cachedData = draggedCategoryAreas.current[draggedCategory.id];
          const originalCategoryPos = cachedData?.originalPosition || draggedCategory.position;
          const totalDeltaX = position.x - originalCategoryPos.x;
          const totalDeltaY = position.y - originalCategoryPos.y;

          // 하위 메모들도 함께 이동
          const updatedMemos = p.memos.map(memo => {
            if (originalMemoPositions && originalMemoPositions.has(memo.id)) {
              const originalPos = originalMemoPositions.get(memo.id);
              if (originalPos) {
                return {
                  ...memo,
                  position: {
                    x: originalPos.x + totalDeltaX,
                    y: originalPos.y + totalDeltaY
                  }
                };
              }
            }
            return memo;
          });

          // 하위 카테고리들도 함께 이동
          const updatedCategories = (p.categories || []).map(category => {
            if (category.id === draggedCategory.id) {
              return { ...category, position };
            }
            if (originalCategoryPositions && originalCategoryPositions.has(category.id)) {
              const originalPos = originalCategoryPositions.get(category.id);
              if (originalPos) {
                return {
                  ...category,
                  position: {
                    x: originalPos.x + totalDeltaX,
                    y: originalPos.y + totalDeltaY
                  }
                };
              }
            }
            return category;
          });

          return {
            ...p,
            memos: updatedMemos,
            categories: updatedCategories
          };
        }
        return p;
      }));
    }
  }, [
    pages,
    setPages,
    currentPageId,
    selectedCategoryIds,
    draggedCategoryAreas,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    toggleCategoryExpanded,
    saveCanvasState,
    clearCategoryCache,
    isOverlapping,
    getAllDescendantIds,
    findDeepestCategory
  ]);

  // Shift 드래그로 카테고리에 새 메모 추가
  const handleShiftDrop = useCallback((
    draggedMemo: MemoBlock,
    position: { x: number; y: number },
    currentPage: Page,
    cachedAreas?: {[categoryId: string]: any}
  ) => {
    // 카테고리 찾기
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };

    // 드래그 중인 메모를 제외한 페이지 데이터 생성
    const pageWithoutDraggingMemo = {
      ...currentPage,
      memos: currentPage.memos.filter(m => m.id !== draggedMemo.id)
    };

    // 카테고리 블록과 영역 모두 체크 - 겹치는 모든 카테고리 찾기
    const overlappingCategories = currentPage.categories?.filter(category => {
      // 1. 카테고리 블록과의 겹침 체크
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      if (isOverlapping(memoBounds, categoryBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      // 펼쳐진 카테고리만 영역 체크 (성능 최적화)
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용 (드래그 중인 메모 제외된 고정 영역)
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 메모를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingMemo);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(memoBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    const targetCategory = findDeepestCategory(overlappingCategories, currentPage);

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedMemo.parentId !== newParentId;

    if (parentChanged) {
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          // 원래 위치 정보 가져오기 (드래그 시작 시 저장된 위치)
          const originalPosition = draggedCategoryAreas.current[draggedMemo.id]?.originalPosition;

          // 부모 카테고리의 children 업데이트
          let updatedCategories = (p.categories || []).map(category => {
            // 이전 부모에서 제거
            if (category.id === draggedMemo.parentId) {
              return {
                ...category,
                children: (category.children || []).filter(id => id !== draggedMemo.id)
              };
            }

            // 새 부모에 추가
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              if (!currentChildren.includes(draggedMemo.id)) {
                return {
                  ...category,
                  children: [...currentChildren, draggedMemo.id],
                  isExpanded: true  // 자동 확장
                };
              }
            }

            return category;
          });

          return {
            ...p,
            categories: updatedCategories,
            memos: p.memos.map(m =>
              m.id === draggedMemo.id
                ? {
                    ...m,
                    parentId: newParentId,
                    position: originalPosition || m.position  // 원래 위치로 복원
                  }
                : m
            )
          };
        }
        return p;
      }));

      // Shift 드래그로 카테고리에 넣을 때만 펼침 (빼낼 때는 펼치지 않음)
      if (targetCategory && newParentId && !targetCategory.isExpanded) {
        toggleCategoryExpanded(targetCategory.id);
      }

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 메모 이동: ${draggedMemo.title} → ${targetName}`);

      // 드롭 후 캐시 클리어 (중요!)
      clearCategoryCache(draggedMemo.id);

      // 부모 카테고리의 캐시도 클리어 (새 자식이 추가되었으므로 영역 재계산 필요)
      if (targetCategory) {
        clearCategoryCache(targetCategory.id);
      }

      // 이전 부모 카테고리의 캐시도 클리어 (자식이 제거되었으므로 영역 재계산 필요)
      if (draggedMemo.parentId) {
        clearCategoryCache(draggedMemo.parentId);
      }
    } else {
      // 같은 카테고리 내에서 위치만 변경
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            memos: p.memos.map(m =>
              m.id === draggedMemo.id
                ? { ...m, position }
                : m
            )
          };
        }
        return p;
      }));
    }
  }, [
    pages,
    setPages,
    currentPageId,
    draggedCategoryAreas,
    toggleCategoryExpanded,
    saveCanvasState,
    clearCategoryCache,
    isOverlapping,
    findDeepestCategory
  ]);

  // 카테고리 영역에서의 Shift 드롭 처리
  const handleCategoryAreaShiftDrop = useCallback((
    category: CategoryBlock,
    position: { x: number; y: number }
  ) => {
    // 카테고리 영역 클릭은 기존 카테고리 드래그와 동일하게 처리
    // 실제로는 Canvas에서 이미 처리되고 있으므로 여기서는 별도 처리 불필요
  }, []);

  return {
    handleShiftDropCategory,
    handleShiftDrop,
    handleCategoryAreaShiftDrop
  };
};
