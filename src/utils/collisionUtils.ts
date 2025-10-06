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

  return {
    updatedCategories,
    updatedMemos
  };
}
