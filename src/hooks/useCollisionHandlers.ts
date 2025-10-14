import { useCallback, useRef } from 'react';
import { Page, CategoryBlock } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';

interface UseCollisionHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
}

interface UseCollisionHandlersReturn {
  pushAwayConflictingMemos: (
    categoryArea: { x: number; y: number; width: number; height: number },
    categoryId: string,
    page: Page
  ) => void;
  pushAwayConflictingCategories: (
    movingCategoryId: string,
    movingCategoryArea: { x: number; y: number; width: number; height: number },
    page: Page
  ) => void;
  pushAwayConflictingBlocks: (
    categoryArea: { x: number; y: number; width: number; height: number },
    categoryId: string,
    page: Page
  ) => void;
  collisionCheckTimers: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
  lastCollisionCheck: React.MutableRefObject<Map<string, number>>;
  collisionCheckCount: React.MutableRefObject<Map<string, number>>;
}

/**
 * 충돌 검사 및 해결 로직을 관리하는 커스텀 훅
 *
 * 이 훅은 다음 기능을 제공합니다:
 * - 카테고리 영역과 메모 블록 간의 충돌 감지 및 밀어내기
 * - 카테고리 영역 간의 충돌 감지 및 밀어내기
 * - 통합 충돌 검사 및 해결 (메모 + 카테고리)
 * - 충돌 검사 횟수 제한 (무한 루프 방지)
 */
export const useCollisionHandlers = ({
  pages,
  setPages,
  currentPageId
}: UseCollisionHandlersProps): UseCollisionHandlersReturn => {
  // 충돌 검사 디바운스를 위한 상태
  const collisionCheckTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCollisionCheck = useRef<Map<string, number>>(new Map());
  const collisionCheckCount = useRef<Map<string, number>>(new Map()); // 충돌 검사 횟수 추적

  // 충돌하는 메모블록 밀어내기 함수
  const pushAwayConflictingMemos = useCallback((
    categoryArea: { x: number; y: number; width: number; height: number },
    categoryId: string,
    page: Page
  ) => {
    const conflictingMemos = page.memos.filter(memo => {
      // 현재 카테고리에 속한 메모는 제외 (이미 올바른 위치에 있음)
      if (memo.parentId === categoryId) {
        return false;
      }

      // 메모와 카테고리 영역의 충돌 검사
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      const memoBounds = {
        left: memo.position.x,
        top: memo.position.y,
        right: memo.position.x + memoWidth,
        bottom: memo.position.y + memoHeight
      };

      const areaBounds = {
        left: categoryArea.x,
        top: categoryArea.y,
        right: categoryArea.x + categoryArea.width,
        bottom: categoryArea.y + categoryArea.height
      };

      // 실제 겹침 여부 확인 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(memoBounds.right <= areaBounds.left ||
                              memoBounds.left >= areaBounds.right ||
                              memoBounds.bottom <= areaBounds.top ||
                              memoBounds.top >= areaBounds.bottom);

      return isOverlapping;
    });

    // 충돌하는 메모들을 영역 밖으로 밀어내기 (겹침 영역 기반)
    conflictingMemos.forEach(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;

      const memoBounds = {
        left: memo.position.x,
        top: memo.position.y,
        right: memo.position.x + memoWidth,
        bottom: memo.position.y + memoHeight
      };

      const areaBounds = {
        left: categoryArea.x,
        top: categoryArea.y,
        right: categoryArea.x + categoryArea.width,
        bottom: categoryArea.y + categoryArea.height
      };

      // 겹침 영역 계산
      const overlapLeft = Math.max(memoBounds.left, areaBounds.left);
      const overlapTop = Math.max(memoBounds.top, areaBounds.top);
      const overlapRight = Math.min(memoBounds.right, areaBounds.right);
      const overlapBottom = Math.min(memoBounds.bottom, areaBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;

      let newX = memo.position.x;
      let newY = memo.position.y;
      const safetyMargin = 5; // 최소 여백

      // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
      if (overlapWidth <= overlapHeight) {
        // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterX = memo.position.x + memoWidth / 2;
        const areaCenterX = categoryArea.x + categoryArea.width / 2;

        if (memoCenterX > areaCenterX) {
          // 오른쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x + overlapWidth + safetyMargin;
        } else {
          // 왼쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x - overlapWidth - safetyMargin;
        }
      } else {
        // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterY = memo.position.y + memoHeight / 2;
        const areaCenterY = categoryArea.y + categoryArea.height / 2;

        if (memoCenterY > areaCenterY) {
          // 아래쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y + overlapHeight + safetyMargin;
        } else {
          // 위쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y - overlapHeight - safetyMargin;
        }
      }

      const newPosition = { x: newX, y: newY };

      // 즉시 상태 업데이트
      setPages(prevPages => prevPages.map(p =>
        p.id === currentPageId
          ? {
              ...p,
              memos: p.memos.map(m =>
                m.id === memo.id
                  ? { ...m, position: newPosition }
                  : m
              )
            }
          : p
      ));
    });
  }, [currentPageId, setPages]);

  // 충돌하는 카테고리 영역 밀어내기 함수
  const pushAwayConflictingCategories = useCallback((
    movingCategoryId: string,
    movingCategoryArea: { x: number; y: number; width: number; height: number },
    page: Page
  ) => {
    // 카테고리 배열이 없으면 빈 배열로 초기화
    const categories = page.categories || [];
    if (categories.length === 0) {
      return;
    }

    const conflictingCategories = categories.filter(category => {
      if (category.id === movingCategoryId) return false;
      if (category.parentId === movingCategoryId || movingCategoryId === category.parentId) return false;

      const otherArea = calculateCategoryArea(category, page);
      if (!otherArea) {
        return false;
      }

      // 실제 영역 간 충돌 검사 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(movingCategoryArea.x + movingCategoryArea.width <= otherArea.x ||
                              movingCategoryArea.x >= otherArea.x + otherArea.width ||
                              movingCategoryArea.y + movingCategoryArea.height <= otherArea.y ||
                              movingCategoryArea.y >= otherArea.y + otherArea.height);

      return isOverlapping;
    });

    // 충돌하는 카테고리들과 그 하위 요소들을 밀어내기
    conflictingCategories.forEach(category => {
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;

      const movingCenterX = movingCategoryArea.x + movingCategoryArea.width / 2;
      const movingCenterY = movingCategoryArea.y + movingCategoryArea.height / 2;
      const categoryCenterX = category.position.x + categoryWidth / 2;
      const categoryCenterY = category.position.y + categoryHeight / 2;

      const deltaX = categoryCenterX - movingCenterX;
      const deltaY = categoryCenterY - movingCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let offsetX: number, offsetY: number;

      // 겹침 영역 기반 밀어내기 계산
      const movingBounds = {
        left: movingCategoryArea.x,
        top: movingCategoryArea.y,
        right: movingCategoryArea.x + movingCategoryArea.width,
        bottom: movingCategoryArea.y + movingCategoryArea.height
      };

      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      // 겹침 영역 계산
      const overlapLeft = Math.max(movingBounds.left, categoryBounds.left);
      const overlapTop = Math.max(movingBounds.top, categoryBounds.top);
      const overlapRight = Math.min(movingBounds.right, categoryBounds.right);
      const overlapBottom = Math.min(movingBounds.bottom, categoryBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;

      const safetyMargin = 10; // 최소 여백

      if (distance === 0) {
        // 중심이 같은 경우 오른쪽으로 밀어내기
        offsetX = movingCategoryArea.width + safetyMargin;
        offsetY = 0;
      } else {
        // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
        if (overlapWidth <= overlapHeight) {
          // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterX > movingCenterX) {
            // 오른쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = overlapWidth + safetyMargin;
            offsetY = 0;
          } else {
            // 왼쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = -(overlapWidth + safetyMargin);
            offsetY = 0;
          }
        } else {
          // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterY > movingCenterY) {
            // 아래쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = overlapHeight + safetyMargin;
          } else {
            // 위쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = -(overlapHeight + safetyMargin);
          }
        }
      }

      const newCategoryPosition = {
        x: category.position.x + offsetX,
        y: category.position.y + offsetY
      };

      // 카테고리와 하위 요소들을 함께 이동 (즉시 상태 업데이트)
      setPages(prevPages => prevPages.map(page => {
        if (page.id !== currentPageId) return page;

        // 하위 메모들도 함께 이동
        const updatedMemos = page.memos.map(memo =>
          memo.parentId === category.id
            ? {
                ...memo,
                position: {
                  x: memo.position.x + offsetX,
                  y: memo.position.y + offsetY
                }
              }
            : memo
        );

        // 하위 카테고리들도 함께 이동
        const updatedCategories = (page.categories || []).map(cat =>
          cat.id === category.id
            ? { ...cat, position: newCategoryPosition }
            : cat.parentId === category.id
            ? {
                ...cat,
                position: {
                  x: cat.position.x + offsetX,
                  y: cat.position.y + offsetY
                }
              }
            : cat
        );

        return {
          ...page,
          memos: updatedMemos,
          categories: updatedCategories
        };
      }));
    });
  }, [currentPageId, setPages]);

  // 통합 충돌 감지 및 밀어내기 함수 (10번 제한)
  const pushAwayConflictingBlocks = useCallback((
    categoryArea: { x: number; y: number; width: number; height: number },
    categoryId: string,
    page: Page
  ) => {
    // 10번 제한 안전장치
    const currentCount = collisionCheckCount.current.get(categoryId) || 0;
    if (currentCount >= 10) {
      return;
    }
    collisionCheckCount.current.set(categoryId, currentCount + 1);

    // 무한 충돌 방지 - 최근 1초 내에 충돌 검사를 했으면 스킵
    const now = Date.now();
    const lastCheck = lastCollisionCheck.current.get(categoryId) || 0;
    if (now - lastCheck < 1000) {
      return;
    }
    lastCollisionCheck.current.set(categoryId, now);

    // 10초 후 카운터 리셋
    setTimeout(() => {
      collisionCheckCount.current.set(categoryId, 0);
    }, 10000);

    // 1. 먼저 다른 카테고리 영역과의 충돌 검사 및 해결
    pushAwayConflictingCategories(categoryId, categoryArea, page);

    // 2. 그 다음 메모블록과의 충돌 검사 및 해결
    pushAwayConflictingMemos(categoryArea, categoryId, page);
  }, [pushAwayConflictingCategories, pushAwayConflictingMemos]);

  return {
    pushAwayConflictingMemos,
    pushAwayConflictingCategories,
    pushAwayConflictingBlocks,
    collisionCheckTimers,
    lastCollisionCheck,
    collisionCheckCount
  };
};
