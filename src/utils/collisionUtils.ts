import { CategoryBlock, MemoBlock, Page } from '../types';
import { calculateCategoryArea, CategoryArea, calculatePushDirection } from './categoryAreaUtils';

export interface CollisionResult {
  updatedCategories: CategoryBlock[];
  updatedMemos: MemoBlock[];
}

/**
 * 우선순위 기반 카테고리 영역 충돌 검사 및 밀어내기
 *
 * @param movingCategoryId - 이동 중인 카테고리 ID (최고 우선순위)
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 카테고리와 메모
 */
export function resolveAreaCollisions(
  movingCategoryId: string,
  page: Page,
  maxIterations: number = 10
): CollisionResult {
  let updatedCategories = [...(page.categories || [])];
  let updatedMemos = [...page.memos];

  // 우선순위 맵: 이동 중인 카테고리가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingCategoryId, 0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 카테고리 배열 (이번 iteration 시작 시점)
    const originalCategories = [...updatedCategories];
    const newCategories = [...updatedCategories];

    for (let i = 0; i < newCategories.length; i++) {
      const currentCat = newCategories[i];

      // 이동 중인 카테고리는 밀리지 않음
      if (currentCat.id === movingCategoryId) continue;

      // 이미 이번 iteration에서 처리된 카테고리는 스킵
      if (processedInThisIteration.has(currentCat.id)) continue;

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 충돌 검사는 원본 위치 기준 (중복 방지)
      for (const otherCategory of originalCategories) {
        if (currentCat.id === otherCategory.id) continue;

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentCat.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherCategory.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        // 영역 계산 (currentCat는 최신, otherCategory는 원본 위치)
        const tempPageCurrent = { ...page, memos: updatedMemos, categories: newCategories };
        const tempPageOther = { ...page, memos: updatedMemos, categories: originalCategories };
        const currentArea = calculateCategoryArea(currentCat, tempPageCurrent);
        const otherArea = calculateCategoryArea(otherCategory, tempPageOther);

        if (!currentArea || !otherArea) continue;

        // 밀어낼 방향과 거리 계산
        const pushDirection = calculatePushDirection(currentArea, otherArea);

        if (pushDirection.x !== 0 || pushDirection.y !== 0) {
          hasCollision = true;

          // 가장 우선순위가 높은 밀어내는 영역만 적용
          if (otherPriority < highestPusherPriority) {
            totalPushX = pushDirection.x;
            totalPushY = pushDirection.y;
            highestPusherPriority = otherPriority;

            // 우선순위 업데이트: 밀린 카테고리는 밀어낸 카테고리보다 1 낮은 우선순위
            if (!priorityMap.has(currentCat.id)) {
              priorityMap.set(currentCat.id, otherPriority + 1);
            }
          }
        }
      }

      // 밀어내기 적용 (즉시 배열 업데이트)
      if (totalPushX !== 0 || totalPushY !== 0) {
        newCategories[i] = {
          ...currentCat,
          position: {
            x: currentCat.position.x + totalPushX,
            y: currentCat.position.y + totalPushY
          }
        };

        // 하위 메모들도 함께 이동
        updatedMemos = updatedMemos.map(memo =>
          memo.parentId === currentCat.id
            ? {
                ...memo,
                position: {
                  x: memo.position.x + totalPushX,
                  y: memo.position.y + totalPushY
                }
              }
            : memo
        );

        // 이번 iteration에서 처리 완료 표시
        processedInThisIteration.add(currentCat.id);
      }
    }

    updatedCategories = newCategories;

    // 충돌이 없으면 종료
    if (!hasCollision) break;
  }

  // 영역-메모블록 충돌 처리: 영역이 부모가 없는 메모블록을 밀어냄
  const movingCategory = updatedCategories.find(cat => cat.id === movingCategoryId);
  if (movingCategory) {
    const movingArea = calculateCategoryArea(movingCategory, { ...page, categories: updatedCategories, memos: updatedMemos });

    if (movingArea) {
      // 부모가 없는 메모들만 대상
      updatedMemos = updatedMemos.map(memo => {
        if (memo.parentId) return memo; // 자식 메모는 제외

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

        const overlapWidth = overlapRight - overlapLeft;
        const overlapHeight = overlapBottom - overlapTop;

        // 밀어낼 방향 계산
        let pushX = 0;
        let pushY = 0;

        if (overlapWidth < overlapHeight) {
          const memoCenterX = (memoBounds.left + memoBounds.right) / 2;
          const areaCenterX = (areaBounds.left + areaBounds.right) / 2;
          pushX = memoCenterX < areaCenterX ? -overlapWidth : overlapWidth;
        } else {
          const memoCenterY = (memoBounds.top + memoBounds.bottom) / 2;
          const areaCenterY = (areaBounds.top + areaBounds.bottom) / 2;
          pushY = memoCenterY < areaCenterY ? -overlapHeight : overlapHeight;
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

  return {
    updatedCategories,
    updatedMemos
  };
}

/**
 * 메모블록-메모블록 충돌 검사 및 밀어내기 (영역-영역 충돌 로직과 동일)
 *
 * @param movingMemoId - 이동 중인 메모 ID (최고 우선순위)
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 메모
 */
export function resolveMemoCollisions(
  movingMemoId: string,
  page: Page,
  maxIterations: number = 10
): MemoBlock[] {
  let updatedMemos = [...page.memos];

  // 우선순위 맵: 이동 중인 메모가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingMemoId, 0);

  // 각 메모의 밀림 방향 고정 (처음 결정된 방향 유지)
  const pushDirections = new Map<string, 'horizontal' | 'vertical'>();

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 메모 배열 (이번 iteration 시작 시점)
    const originalMemos = [...updatedMemos];
    const newMemos = [...updatedMemos];

    for (let i = 0; i < newMemos.length; i++) {
      const currentMemo = newMemos[i];

      // 부모가 있는 메모는 제외
      if (currentMemo.parentId) continue;

      // 이동 중인 메모는 밀리지 않음
      if (currentMemo.id === movingMemoId) continue;

      // 이미 이번 iteration에서 처리된 메모는 스킵
      if (processedInThisIteration.has(currentMemo.id)) continue;

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 충돌 검사는 원본 위치 기준 (중복 방지)
      for (const otherMemo of originalMemos) {
        if (currentMemo.id === otherMemo.id) continue;
        if (otherMemo.parentId) continue;

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentMemo.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherMemo.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        // 메모 바운드 계산
        const currentWidth = currentMemo.size?.width || 200;
        const currentHeight = currentMemo.size?.height || 95;
        const otherWidth = otherMemo.size?.width || 200;
        const otherHeight = otherMemo.size?.height || 95;

        const currentBounds = {
          left: currentMemo.position.x,
          top: currentMemo.position.y,
          right: currentMemo.position.x + currentWidth,
          bottom: currentMemo.position.y + currentHeight
        };

        const otherBounds = {
          left: otherMemo.position.x,
          top: otherMemo.position.y,
          right: otherMemo.position.x + otherWidth,
          bottom: otherMemo.position.y + otherHeight
        };

        // 겹침 계산
        const overlapLeft = Math.max(currentBounds.left, otherBounds.left);
        const overlapTop = Math.max(currentBounds.top, otherBounds.top);
        const overlapRight = Math.min(currentBounds.right, otherBounds.right);
        const overlapBottom = Math.min(currentBounds.bottom, otherBounds.bottom);

        if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) continue;

        const overlapWidth = overlapRight - overlapLeft;
        const overlapHeight = overlapBottom - overlapTop;

        // 밀어낼 방향 계산 (짧은 쪽 방향으로만 밀기)
        let pushX = 0;
        let pushY = 0;

        if (overlapWidth < overlapHeight) {
          // 가로 방향으로만 밀기
          pushX = currentMemo.position.x < otherMemo.position.x ? -overlapWidth : overlapWidth;
        } else {
          // 세로 방향으로만 밀기
          pushY = currentMemo.position.y < otherMemo.position.y ? -overlapHeight : overlapHeight;
        }

        if (pushX !== 0 || pushY !== 0) {
          hasCollision = true;

          // 가장 우선순위가 높은 밀어내는 메모만 적용
          if (otherPriority < highestPusherPriority) {
            totalPushX = pushX;
            totalPushY = pushY;
            highestPusherPriority = otherPriority;

            // 우선순위 업데이트
            if (!priorityMap.has(currentMemo.id)) {
              priorityMap.set(currentMemo.id, otherPriority + 1);
            }
          }
        }
      }

      // 밀어내기 적용
      if (totalPushX !== 0 || totalPushY !== 0) {
        const newPosition = {
          x: currentMemo.position.x + totalPushX,
          y: currentMemo.position.y + totalPushY
        };

        // 밀려난 위치가 영역과 충돌하는지 확인
        const testPage = {
          ...page,
          memos: updatedMemos.map(m => m.id === currentMemo.id ? { ...m, position: newPosition } : m)
        };

        const areaCollision = checkMemoAreaCollision(currentMemo.id, testPage);

        // 영역과 충돌하지 않을 때만 밀어내기 적용
        if (!areaCollision.blocked) {
          newMemos[i] = {
            ...currentMemo,
            position: newPosition
          };

          processedInThisIteration.add(currentMemo.id);
        }
        // 영역에 막히면 밀지 않음 (그대로 유지)
      }
    }

    updatedMemos = newMemos;

    // 충돌이 없으면 종료
    if (!hasCollision) break;
  }

  return updatedMemos;
}

/**
 * 메모블록이 영역과 충돌했는지 확인
 *
 * @param memoId - 메모 ID
 * @param page - 현재 페이지
 * @returns 충돌 여부 { blocked: true/false }
 */
export function checkMemoAreaCollision(
  memoId: string,
  page: Page
): { blocked: boolean; restrictedDirections?: { left: boolean; right: boolean; up: boolean; down: boolean } } {
  const memo = page.memos.find(m => m.id === memoId);
  if (!memo || memo.parentId) return { blocked: false }; // 부모가 있는 메모는 제외

  const memoWidth = memo.size?.width || 200;
  const memoHeight = memo.size?.height || 95;

  const memoBounds = {
    left: memo.position.x,
    top: memo.position.y,
    right: memo.position.x + memoWidth,
    bottom: memo.position.y + memoHeight
  };

  // 카테고리 영역과 충돌 검사
  const categories = page.categories || [];

  for (const category of categories) {
    const categoryArea = calculateCategoryArea(category, page);
    if (!categoryArea) continue;

    const areaBounds = {
      left: categoryArea.x,
      top: categoryArea.y,
      right: categoryArea.x + categoryArea.width,
      bottom: categoryArea.y + categoryArea.height
    };

    // 겹침 계산
    const overlapLeft = Math.max(memoBounds.left, areaBounds.left);
    const overlapTop = Math.max(memoBounds.top, areaBounds.top);
    const overlapRight = Math.min(memoBounds.right, areaBounds.right);
    const overlapBottom = Math.min(memoBounds.bottom, areaBounds.bottom);

    // 겹침이 있는지 확인
    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      return { blocked: true };
    }
  }

  return { blocked: false };
}
