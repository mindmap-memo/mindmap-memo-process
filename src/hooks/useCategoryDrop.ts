import { useCallback } from 'react';
import { Page, CategoryBlock, MemoBlock } from '../types';
import { calculateCategoryArea, CategoryArea } from '../utils/categoryAreaUtils';

/**
 * useCategoryDrop
 *
 * 카테고리 드롭 감지 로직을 관리하는 커스텀 훅입니다.
 * 메모나 카테고리를 드래그하여 놓았을 때 카테고리 블록/영역과의 겹침을 감지하고 처리합니다.
 *
 * **관리하는 기능:**
 * - 메모 드롭 시 카테고리 블록 겹침 감지
 * - 카테고리 드롭 시 카테고리 블록 겹침 감지
 * - Shift 드래그 모드 처리
 * - 카테고리 영역 이탈 감지 (타이머 기반)
 *
 * @param props - pages, handlers, state
 * @returns 카테고리 드롭 감지 함수들
 */

interface UseCategoryDropProps {
  pages: Page[];
  currentPageId: string;
  isShiftPressedRef: React.MutableRefObject<boolean>;
  shiftDropProcessedMemos: React.MutableRefObject<Set<string>>;
  lastDragTime: React.MutableRefObject<Map<string, number>>;
  lastDragPosition: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  categoryExitTimers: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
  shiftDragAreaCache: React.MutableRefObject<Map<string, CategoryArea>>;
  handleShiftDrop: (memo: MemoBlock, position: { x: number; y: number }, currentPage: Page, areaCache: Map<string, CategoryArea>) => void;
  handleShiftDropCategory: (category: CategoryBlock, position: { x: number; y: number }, currentPage: Page, areaCache: Map<string, CategoryArea>) => void;
  moveToCategory: (memoId: string, categoryId: string | null) => void;
  pushAwayConflictingMemos: (area: CategoryArea, categoryId: string, currentPage: Page) => void;
}

export const useCategoryDrop = ({
  pages,
  currentPageId,
  isShiftPressedRef,
  shiftDropProcessedMemos,
  lastDragTime,
  lastDragPosition,
  categoryExitTimers,
  shiftDragAreaCache,
  handleShiftDrop,
  handleShiftDropCategory,
  moveToCategory,
  pushAwayConflictingMemos
}: UseCategoryDropProps) => {
  /**
   * 겹침 감지 함수 (여백 포함)
   */
  const isOverlapping = useCallback((bounds1: any, bounds2: any, margin = 20) => {
    return !(bounds1.right + margin < bounds2.left ||
             bounds1.left - margin > bounds2.right ||
             bounds1.bottom + margin < bounds2.top ||
             bounds1.top - margin > bounds2.bottom);
  }, []);

  /**
   * 카테고리 드래그 완료 시 카테고리 블록 겹침 감지 (Shift 드래그)
   */
  const detectCategoryDropForCategory = useCallback((categoryId: string, position: { x: number; y: number }) => {
    const isShiftPressed = isShiftPressedRef.current;

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedCategory = currentPage.categories.find(c => c.id === categoryId);
    if (!draggedCategory) {
      return;
    }

    // Shift 키가 눌려있으면 카테고리-카테고리 종속 모드
    if (isShiftPressed) {
      handleShiftDropCategory(draggedCategory, position, currentPage, shiftDragAreaCache.current);
    }
  }, [pages, currentPageId, isShiftPressedRef, shiftDragAreaCache, handleShiftDropCategory]);

  /**
   * 드래그 완료 시 카테고리 블록 겹침 감지
   */
  const detectCategoryOnDrop = useCallback((memoId: string, position: { x: number; y: number }) => {
    const isShiftPressed = isShiftPressedRef.current;

    // Shift 드래그로 이미 처리된 메모면 중복 처리 방지
    if (shiftDropProcessedMemos.current.has(memoId)) {
      return;
    }

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedMemo = currentPage.memos.find(m => m.id === memoId);
    if (!draggedMemo) {
      return;
    }

    // Shift 키가 눌려있으면 새 메모 복사 모드
    if (isShiftPressed) {
      handleShiftDrop(draggedMemo, position, currentPage, shiftDragAreaCache.current);
      return;
    }

    // 드래그 속도 계산을 위한 시간과 위치 추적
    const now = Date.now();
    const lastTime = lastDragTime.current.get(memoId) || now;
    const lastPos = lastDragPosition.current.get(memoId) || position;
    const timeDelta = now - lastTime;
    const distance = Math.sqrt(
      Math.pow(position.x - lastPos.x, 2) + Math.pow(position.y - lastPos.y, 2)
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // 현재 위치와 시간 업데이트
    lastDragTime.current.set(memoId, now);
    lastDragPosition.current.set(memoId, position);

    // 드래그된 메모의 경계 박스 계산
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };

    const targetCategory = currentPage.categories.find(category => {
      // 카테고리의 경계 박스 계산
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      const overlapping = isOverlapping(memoBounds, categoryBounds, 20);

      return overlapping;
    });

    if (targetCategory) {
      // 같은 카테고리로 이동하려는 경우 - 실제 겹침이므로 정상적인 카테고리 내 이동
      if (draggedMemo.parentId === targetCategory.id) {
        return;
      }

      // 다른 카테고리로 이동하는 경우 - 방지 (자식 메모는 자동 이동 금지)
      if (draggedMemo.parentId && draggedMemo.parentId !== targetCategory.id) {
        // 자식 메모가 다른 카테고리와 겹치면 밀어내기만 수행하고 이동은 금지
        const categoryArea = calculateCategoryArea(targetCategory, currentPage);
        if (categoryArea) {
          pushAwayConflictingMemos(categoryArea, targetCategory.id, currentPage);
        }
        return; // 이동 중단
      }

      // 메모를 카테고리에 자동으로 추가
      moveToCategory(memoId, targetCategory.id);
      return;
    } else {
      // 카테고리 블록과 겹치지 않았을 때
      if (draggedMemo.parentId) {
        // 현재 소속된 카테고리의 영역에서도 벗어났는지 확인
        const currentCategory = currentPage.categories.find(cat => cat.id === draggedMemo.parentId);

        if (currentCategory) {
          // 현재 카테고리의 실제 영역 계산 (하위 메모들 포함)
          const childMemos = currentPage.memos.filter(memo => memo.parentId === currentCategory.id);

          const categoryWidth = currentCategory.size?.width || 200;
          const categoryHeight = currentCategory.size?.height || 80;

          let minX = currentCategory.position.x;
          let minY = currentCategory.position.y;
          let maxX = currentCategory.position.x + categoryWidth;
          let maxY = currentCategory.position.y + categoryHeight;

          // 하위 메모들의 경계 포함
          childMemos.forEach(memo => {
            const memoWidth = memo.size?.width || 200;
            const memoHeight = memo.size?.height || 95;
            minX = Math.min(minX, memo.position.x);
            minY = Math.min(minY, memo.position.y);
            maxX = Math.max(maxX, memo.position.x + memoWidth);
            maxY = Math.max(maxY, memo.position.y + memoHeight);
          });

          // 적절한 패딩 적용 (빠른 드래그 시 영역 이탈 방지하되 너무 크지 않게)
          const padding = 70;
          const categoryAreaBounds = {
            left: minX - padding,
            top: minY - padding,
            right: maxX + padding,
            bottom: maxY + padding
          };

          // 현재 카테고리 영역과 겹치는지 확인
          const stillInArea = isOverlapping(memoBounds, categoryAreaBounds, 0);

          if (!stillInArea) {
            // 빠른 드래그 시 안정화: 속도가 높으면 지연 처리
            const velocityThreshold = 1.0; // px/ms
            const exitDelay = velocity > velocityThreshold ? 300 : 100; // ms

            // 기존 타이머가 있으면 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            // 지연 후 카테고리에서 빼내기
            const timer = setTimeout(() => {
              // 지연 시간 후 다시 위치 확인
              const currentMemo = pages.find(p => p.id === currentPageId)?.memos.find(m => m.id === memoId);
              if (!currentMemo || !currentMemo.parentId) {
                categoryExitTimers.current.delete(memoId);
                return;
              }

              // 최종 위치에서 다시 영역 체크
              const currentMemoWidth = currentMemo.size?.width || 200;
              const currentMemoHeight = currentMemo.size?.height || 95;
              const currentMemoBounds = {
                left: currentMemo.position.x,
                top: currentMemo.position.y,
                right: currentMemo.position.x + currentMemoWidth,
                bottom: currentMemo.position.y + currentMemoHeight
              };

              const finalStillInArea = isOverlapping(currentMemoBounds, categoryAreaBounds, 0);

              if (!finalStillInArea) {
                moveToCategory(memoId, null);
              }

              categoryExitTimers.current.delete(memoId);
            }, exitDelay);

            categoryExitTimers.current.set(memoId, timer);
          } else {
            // 영역 내에 있으면 기존 타이머 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
              categoryExitTimers.current.delete(memoId);
            }
          }
        }
      }
    }
  }, [
    pages,
    currentPageId,
    isShiftPressedRef,
    shiftDropProcessedMemos,
    lastDragTime,
    lastDragPosition,
    categoryExitTimers,
    shiftDragAreaCache,
    handleShiftDrop,
    moveToCategory,
    pushAwayConflictingMemos,
    isOverlapping
  ]);

  return {
    detectCategoryOnDrop,
    detectCategoryDropForCategory
  };
};
