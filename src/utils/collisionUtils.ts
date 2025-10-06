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

    updatedCategories = updatedCategories.map(currentCat => {
      // 이동 중인 카테고리는 밀리지 않음
      if (currentCat.id === movingCategoryId) return currentCat;

      let resultCategory = { ...currentCat };
      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      updatedCategories.forEach(otherCategory => {
        if (currentCat.id === otherCategory.id) return;

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentCat.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherCategory.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) return;

        // 영역 계산 (업데이트된 위치 기준)
        const tempPage = { ...page, memos: updatedMemos, categories: updatedCategories };
        const currentArea = calculateCategoryArea(currentCat, tempPage);
        const otherArea = calculateCategoryArea(otherCategory, tempPage);

        if (!currentArea || !otherArea) return;

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
      });

      // 밀어내기 적용
      if (totalPushX !== 0 || totalPushY !== 0) {
        resultCategory = {
          ...resultCategory,
          position: {
            x: resultCategory.position.x + totalPushX,
            y: resultCategory.position.y + totalPushY
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
      }

      return resultCategory;
    });

    // 충돌이 없으면 종료
    if (!hasCollision) break;
  }

  return {
    updatedCategories,
    updatedMemos
  };
}
