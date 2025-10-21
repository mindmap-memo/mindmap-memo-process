import { useCallback } from 'react';
import { CategoryBlock, Page, MemoBlock, CanvasActionType } from '../types';
import { calculateCategoryArea, centerCanvasOnPosition } from '../utils/categoryAreaUtils';
import { resolveAreaCollisions } from '../utils/collisionUtils';
import { createCategory as createCategoryApi } from '../utils/api';

/**
 * useCategoryHandlers
 *
 * 카테고리 관련 CRUD 및 관리 핸들러를 제공하는 커스텀 훅입니다.
 *
 * **관리하는 기능:**
 * - 카테고리 추가/수정/삭제
 * - 카테고리 확장/축소
 * - 카테고리 위치/크기 업데이트
 * - 카테고리-아이템 간 부모-자식 관계 설정
 *
 * @param props - pages, setPages, currentPageId 등
 * @returns 카테고리 관련 핸들러 함수들
 */

interface UseCategoryHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  canvasScale: number;
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  saveCanvasState?: (actionType: CanvasActionType, description: string) => void;
}

export const useCategoryHandlers = (props: UseCategoryHandlersProps) => {
  const {
    pages,
    setPages,
    currentPageId,
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth,
    canvasScale,
    setCanvasOffset,
    saveCanvasState
  } = props;

  /**
   * 카테고리 추가
   * 영역과 겹치지 않는 위치를 자동으로 찾아 배치
   */
  const addCategory = useCallback(async (position?: { x: number; y: number }) => {
    const originalPosition = position || { x: 300, y: 200 };
    let newPosition = { ...originalPosition };

    // 영역과 겹치지 않는 위치 찾기
    if (position) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage?.categories) {
        // 새 카테고리의 실제 영역 크기 (최소 크기)
        const newCategoryWidth = 400;
        const newCategoryHeight = 250;
        let isOverlapping = true;
        let adjustedY = newPosition.y;
        const moveStep = 300; // 충분히 밀어내기 위한 이동 거리

        while (isOverlapping && adjustedY > -2000) {
          isOverlapping = false;

          for (const category of currentPage.categories) {
            if (category.isExpanded) {
              const area = calculateCategoryArea(category, currentPage);
              if (area) {
                // 새 카테고리 영역과 기존 영역이 겹치는지 확인
                const newCatLeft = newPosition.x;
                const newCatRight = newPosition.x + newCategoryWidth;
                const newCatTop = adjustedY;
                const newCatBottom = adjustedY + newCategoryHeight;

                const areaLeft = area.x;
                const areaRight = area.x + area.width;
                const areaTop = area.y;
                const areaBottom = area.y + area.height;

                // 겹침 여유 공간 추가 (20px 간격)
                const margin = 20;
                if (!(newCatRight + margin < areaLeft || newCatLeft - margin > areaRight ||
                      newCatBottom + margin < areaTop || newCatTop - margin > areaBottom)) {
                  // 겹침 - 위로 충분히 이동
                  isOverlapping = true;
                  adjustedY -= moveStep;
                  break;
                }
              }
            }
          }
        }

        newPosition = { x: newPosition.x, y: adjustedY };
      }
    }

    const newCategory: CategoryBlock = {
      id: `category-${Date.now()}`,
      title: 'New Category',
      tags: [],
      connections: [],
      position: newPosition,
      originalPosition: newPosition, // 초기 위치 저장
      isExpanded: true,
      children: []
    };

    // 즉시 UI 업데이트 (낙관적 업데이트)
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, categories: [...(page.categories || []), newCategory] }
        : page
    ));

    // 백그라운드에서 데이터베이스 저장 (비동기, 실패해도 무시)
    createCategoryApi({
      ...newCategory,
      pageId: currentPageId
    }).catch(error => {
      console.warn('카테고리 생성 DB 저장 실패 (UI는 정상 동작):', error);
    });

    // 위치가 변경된 경우 캔버스를 새 위치로 자동 이동
    if (position && (newPosition.x !== originalPosition.x || newPosition.y !== originalPosition.y)) {
      // 카테고리의 중심점 계산 (블록 중심이 화면 중앙에 오도록)
      const categoryCenterX = newPosition.x + 100; // 카테고리 너비의 절반
      const categoryCenterY = newPosition.y + 30; // 카테고리 높이의 절반

      // 캔버스 크기 (윈도우 크기 기준, 좌우 패널 제외)
      const canvasWidth = window.innerWidth - (leftPanelWidth + (rightPanelOpen ? rightPanelWidth : 0));
      const canvasHeight = window.innerHeight;

      const newOffset = centerCanvasOnPosition(
        { x: categoryCenterX, y: categoryCenterY },
        canvasWidth,
        canvasHeight,
        canvasScale
      );

      setCanvasOffset(newOffset);
    }

    // Save canvas state for undo/redo
    if (saveCanvasState) {
      setTimeout(() => saveCanvasState('category_create', `카테고리 생성: ${newCategory.title}`), 0);
    }
  }, [pages, currentPageId, leftPanelWidth, rightPanelOpen, rightPanelWidth, canvasScale, setPages, setCanvasOffset, saveCanvasState]);

  /**
   * 카테고리 업데이트
   */
  const updateCategory = useCallback((category: CategoryBlock) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(cat =>
              cat.id === category.id
                ? category
                : cat
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 카테고리 삭제
   * 자식 요소들을 최상위 레벨로 이동
   */
  const deleteCategory = useCallback((categoryId: string) => {
    // 삭제된 카테고리의 제목 가져오기
    const deletedCategory = pages.find(p => p.id === currentPageId)?.categories?.find(c => c.id === categoryId);
    const categoryTitle = deletedCategory?.title || '카테고리';

    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        const categoryToDelete = (page.categories || []).find(c => c.id === categoryId);
        if (categoryToDelete) {
          // Move children to top level
          const updatedMemos = page.memos.map(memo => ({
            ...memo,
            parentId: memo.parentId === categoryId ? undefined : memo.parentId,
            connections: memo.connections.filter(connId => connId !== categoryId) // 삭제된 카테고리로의 연결 제거
          }));
          const updatedCategories = (page.categories || [])
            .filter(c => c.id !== categoryId)
            .map(c => ({
              ...c,
              parentId: c.parentId === categoryId ? undefined : c.parentId,
              connections: c.connections.filter(connId => connId !== categoryId), // 삭제된 카테고리로의 연결 제거
              children: c.children.filter(childId => childId !== categoryId) // 자식 목록에서도 제거
            }));

          // 단축 이동 목록에서 삭제된 카테고리 제거 (페이지별)
          const updatedQuickNavItems = (page.quickNavItems || []).filter(item => item.targetId !== categoryId);

          return {
            ...page,
            memos: updatedMemos,
            categories: updatedCategories,
            quickNavItems: updatedQuickNavItems
          };
        }
      }
      return page;
    }));

    // 실행 취소를 위한 상태 저장
    if (saveCanvasState) {
      setTimeout(() => saveCanvasState('category_delete', `카테고리 삭제: ${categoryTitle}`), 0);
    }
  }, [pages, currentPageId, setPages, saveCanvasState]);

  /**
   * 카테고리 확장/축소 토글
   * 하위 카테고리도 함께 확장/축소
   */
  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const targetCategory = page.categories?.find(c => c.id === categoryId);
      if (!targetCategory) return page;

      const newExpandedState = !targetCategory.isExpanded;

      // 모든 하위 카테고리 ID 수집 (재귀적으로)
      const getAllDescendantCategoryIds = (catId: string): string[] => {
        const childCategories = (page.categories || []).filter(c => c.parentId === catId);
        return childCategories.flatMap(child => [child.id, ...getAllDescendantCategoryIds(child.id)]);
      };

      const descendantIds = getAllDescendantCategoryIds(categoryId);
      const affectedIds = [categoryId, ...descendantIds];

      let updatedPage = {
        ...page,
        categories: (page.categories || []).map(category =>
          affectedIds.includes(category.id)
            ? { ...category, isExpanded: newExpandedState }
            : category
        )
      };

      // 확장될 때만 충돌 검사 실행 (축소할 때는 충돌 없음)
      if (newExpandedState) {
        // 영역이 생성되므로 충돌 검사
        for (const catId of affectedIds) {
          const result = resolveAreaCollisions(catId, updatedPage);
          updatedPage = {
            ...updatedPage,
            categories: result.updatedCategories,
            memos: result.updatedMemos
          };
        }
      }

      return updatedPage;
    }));
  }, [currentPageId, setPages]);

  /**
   * 카테고리 크기 업데이트
   */
  const updateCategorySize = useCallback((categoryId: string, size: { width: number; height: number }) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(category =>
              category.id === categoryId
                ? { ...category, size }
                : category
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 아이템을 카테고리로 이동 (또는 최상위 레벨로)
   * 메모 또는 카테고리를 다른 카테고리의 자식으로 설정
   */
  const moveToCategory = useCallback((itemId: string, categoryId: string | null) => {
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        // Determine if item is memo or category
        const isMemo = page.memos.some(memo => memo.id === itemId);
        const isCategory = (page.categories || []).some(cat => cat.id === itemId);

        if (isMemo) {
          const targetCategory = categoryId ? (page.categories || []).find(cat => cat.id === categoryId) : null;

          const updatedMemos = page.memos.map(memo => {
            if (memo.id === itemId) {
              let newPosition = memo.position;

              // 카테고리에 종속시킬 때 위치를 카테고리 블록 아래로 조정
              if (categoryId && targetCategory) {
                newPosition = {
                  x: targetCategory.position.x + 30,
                  y: targetCategory.position.y + 200
                };
              }

              return { ...memo, parentId: categoryId || undefined, position: newPosition };
            }
            return memo;
          });

          // Update category children arrays
          const updatedCategories = (page.categories || []).map(cat => {
            // Remove from all categories first
            let newChildren = cat.children.filter(id => id !== itemId);
            // Add to target category
            if (cat.id === categoryId && !newChildren.includes(itemId)) {
              newChildren = [...newChildren, itemId];
            }
            return { ...cat, children: newChildren };
          });

          // 영역 크기가 변경되었으므로 충돌 검사 실행
          let updatedPage = { ...page, memos: updatedMemos, categories: updatedCategories };

          // 변경된 카테고리(들)에 대해 충돌 검사
          const affectedCategoryIds: string[] = [];
          if (categoryId) affectedCategoryIds.push(categoryId);

          // 이전 부모 카테고리도 영향 받음
          const memo = page.memos.find(m => m.id === itemId);
          if (memo?.parentId) affectedCategoryIds.push(memo.parentId);

          for (const catId of affectedCategoryIds) {
            const category = updatedPage.categories?.find(c => c.id === catId);
            if (category?.isExpanded) {
              const result = resolveAreaCollisions(catId, updatedPage);
              updatedPage = {
                ...updatedPage,
                categories: result.updatedCategories,
                memos: result.updatedMemos
              };
            }
          }

          return updatedPage;
        }

        if (isCategory) {
          const updatedCategories = (page.categories || []).map(cat => {
            // Update the moved category's parentId
            if (cat.id === itemId) {
              return { ...cat, parentId: categoryId || undefined };
            }

            // Remove from all categories' children
            let newChildren = cat.children.filter(id => id !== itemId);

            // Add to target category's children
            if (cat.id === categoryId && !newChildren.includes(itemId)) {
              newChildren = [...newChildren, itemId];
            }

            return { ...cat, children: newChildren };
          });

          // 영역 크기가 변경되었으므로 충돌 검사 실행
          let updatedPage = { ...page, categories: updatedCategories };

          // 변경된 카테고리(들)에 대해 충돌 검사
          const affectedCategoryIds: string[] = [];
          if (categoryId) affectedCategoryIds.push(categoryId);

          // 이전 부모 카테고리도 영향 받음
          const category = page.categories?.find(c => c.id === itemId);
          if (category?.parentId) affectedCategoryIds.push(category.parentId);

          for (const catId of affectedCategoryIds) {
            const cat = updatedPage.categories?.find(c => c.id === catId);
            if (cat?.isExpanded) {
              const result = resolveAreaCollisions(catId, updatedPage);
              updatedPage = {
                ...updatedPage,
                categories: result.updatedCategories,
                memos: result.updatedMemos
              };
            }
          }

          return updatedPage;
        }
      }
      return page;
    }));
  }, [currentPageId, setPages]);

  return {
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryExpanded,
    updateCategorySize,
    moveToCategory
  };
};
