import { Page } from '../../types';
import { calculateCategoryArea } from '../categoryAreaUtils';
import { isParentChild } from '../categoryHierarchyUtils';
import { calculatePushDirection } from '../categoryAreaUtils';
import { CollisionResult } from './types';
import { getMemoSize } from '../constants';

/**
 * 우선순위 기반 카테고리 영역 충돌 검사 및 밀어내기
 *
 * @param movingCategoryId - 이동 중인 카테고리 ID (최고 우선순위)
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @param frameDelta - 프레임 간 이동 거리 (부드러운 밀어내기용)
 * @returns 충돌 처리 후 업데이트된 카테고리와 메모
 */
export function resolveAreaCollisions(
  movingCategoryId: string,
  page: Page,
  maxIterations: number = 10,
  frameDelta?: { x: number; y: number }
): CollisionResult {
  let updatedCategories = [...(page.categories || [])];
  let updatedMemos = [...page.memos];

  // 이동 중인 카테고리 찾기
  const targetMovingCategory = updatedCategories.find(cat => cat.id === movingCategoryId);
  if (!targetMovingCategory) {
    return { updatedCategories, updatedMemos };
  }

  // 이동 중인 카테고리의 부모 ID (null 과 undefined를 동일하게 처리)
  const movingParentId = targetMovingCategory.parentId ?? null;

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

      // 같은 부모를 가진 형제 카테고리만 충돌 검사 대상 (null과 undefined 동일하게 처리)
      const currentParentId = currentCat.parentId ?? null;
      if (currentParentId !== movingParentId) continue;

      // 이미 이번 iteration에서 처리된 카테고리는 스킵
      if (processedInThisIteration.has(currentCat.id)) continue;

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 충돌 검사는 원본 위치 기준 (중복 방지)
      for (const otherCategory of originalCategories) {
        if (currentCat.id === otherCategory.id) continue;

        // 부모-자식 관계인 경우 충돌 무시 (예외 처리)
        if (isParentChild(currentCat.id, otherCategory.id, originalCategories)) {
          continue;
        }

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

        // 밀어낼 방향과 거리 계산 (otherArea가 밀고, currentArea가 밀림)
        const pushDirection = calculatePushDirection(otherArea, currentArea, otherCategory.id, currentCat.id);

        if (pushDirection.x !== 0 || pushDirection.y !== 0) {
          hasCollision = true;

          // 가장 우선순위가 높은 밀어내는 영역만 적용
          if (otherPriority < highestPusherPriority) {
            if (frameDelta) {
              // 프레임 기반 밀어내기: frameDelta만큼만 밀고 종료 (부드러운 이동)
              const pushDirX = pushDirection.x !== 0 ? Math.sign(pushDirection.x) : 0;
              const pushDirY = pushDirection.y !== 0 ? Math.sign(pushDirection.y) : 0;

              // frameDelta의 절대값을 사용하되, 겹친 거리를 초과하지 않도록 제한
              const frameDeltaX = Math.abs(frameDelta.x);
              const frameDeltaY = Math.abs(frameDelta.y);
              const overlapX = Math.abs(pushDirection.x);
              const overlapY = Math.abs(pushDirection.y);

              totalPushX = pushDirX * Math.min(frameDeltaX, overlapX);
              totalPushY = pushDirY * Math.min(frameDeltaY, overlapY);
            } else {
              // 겹침 기반 밀어내기: 충돌이 완전히 해소될 때까지 (기존 동작)
              totalPushX = pushDirection.x;
              totalPushY = pushDirection.y;
            }
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

        // 하위 카테고리들도 함께 이동 (재귀적으로 모든 하위 카테고리 이동)
        const moveChildCategories = (parentId: string, pushX: number, pushY: number) => {
          for (let j = 0; j < newCategories.length; j++) {
            if (newCategories[j].parentId === parentId) {
              newCategories[j] = {
                ...newCategories[j],
                position: {
                  x: newCategories[j].position.x + pushX,
                  y: newCategories[j].position.y + pushY
                }
              };
              // 재귀적으로 하위의 하위 카테고리도 이동
              moveChildCategories(newCategories[j].id, pushX, pushY);
            }
          }
        };
        moveChildCategories(currentCat.id, totalPushX, totalPushY);

        // 이번 iteration에서 처리 완료 표시
        processedInThisIteration.add(currentCat.id);
      }
    }

    updatedCategories = newCategories;

    // 충돌이 없으면 종료
    if (!hasCollision) break;
  }

  // 영역-메모블록 충돌 처리: 영역이 모든 메모블록을 밀어냄
  const movingCategory = updatedCategories.find(cat => cat.id === movingCategoryId);
  if (movingCategory) {
    const movingArea = calculateCategoryArea(movingCategory, { ...page, categories: updatedCategories, memos: updatedMemos });

    if (movingArea) {
      // 모든 메모를 대상으로 충돌 검사 (depth 무관)
      updatedMemos = updatedMemos.map(memo => {
        // 이 카테고리의 자식 메모는 제외 (내부 메모는 밀지 않음)
        if (memo.parentId === movingCategoryId) return memo;

        // 이 카테고리의 하위 카테고리들의 자식 메모도 제외
        const isDescendantMemo = (memoParentId: string | null | undefined): boolean => {
          if (!memoParentId) return false;
          if (memoParentId === movingCategoryId) return true;

          const parentCat = updatedCategories.find(c => c.id === memoParentId);
          if (!parentCat) return false;

          return isDescendantMemo(parentCat.parentId);
        };

        if (isDescendantMemo(memo.parentId)) return memo;

        const { width: memoWidth, height: memoHeight } = getMemoSize(memo.size);

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

        // 밀어낼 방향 계산 (영역-영역 충돌과 동일한 로직 사용)
        const memoBoundsArea = {
          x: memoBounds.left,
          y: memoBounds.top,
          width: memoBounds.right - memoBounds.left,
          height: memoBounds.bottom - memoBounds.top
        };

        const areaBoundsArea = {
          x: areaBounds.left,
          y: areaBounds.top,
          width: areaBounds.right - areaBounds.left,
          height: areaBounds.bottom - areaBounds.top
        };

        // calculatePushDirection 사용 (영역이 메모를 밀어냄)
        const pushDirection = calculatePushDirection(areaBoundsArea, memoBoundsArea, movingCategoryId, memo.id);

        const pushX = pushDirection.x;
        const pushY = pushDirection.y;

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
