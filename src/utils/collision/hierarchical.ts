import { CategoryBlock, MemoBlock, Page } from '../../types';
import { calculateCategoryArea, CategoryArea, calculatePushDirection } from '../categoryAreaUtils';
import { getMemoSize, getCategorySize } from '../constants';

/**
 * 영역 내 계층 충돌 검사 (같은 부모의 같은 depth 영역끼리 충돌)
 *
 * @param movingCategoryId - 이동 중인 카테고리 ID
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 카테고리와 메모
 */
export function resolveHierarchicalCollisions(
  movingCategoryId: string,
  page: Page,
  maxIterations: number = 10
): { updatedCategories: CategoryBlock[]; updatedMemos: MemoBlock[] } {
  let updatedCategories = [...(page.categories || [])];
  let updatedMemos = [...page.memos];

  const movingCategory = page.categories?.find(cat => cat.id === movingCategoryId);
  if (!movingCategory) return { updatedCategories, updatedMemos };

  // 이동 중인 카테고리의 부모와 같은 부모를 가진 형제 카테고리들 찾기
  const siblings = page.categories?.filter(cat =>
    cat.id !== movingCategoryId &&
    cat.parentId === movingCategory.parentId
  ) || [];

  // 원본 페이지 상태에서 영역들을 미리 계산 (크기 고정)
  const fixedAreas = new Map<string, { area: CategoryArea; offset: { x: number; y: number } }>();

  // 모든 형제 카테고리의 원본 영역과 오프셋 계산
  for (const cat of [movingCategory, ...siblings]) {
    let area = calculateCategoryArea(cat, page);
    if (!area) {
      const { width: w, height: h } = getCategorySize(cat.size);
      area = {
        x: cat.position.x,
        y: cat.position.y,
        width: w,
        height: h
      };
    }
    fixedAreas.set(cat.id, {
      area,
      offset: {
        x: area.x - cat.position.x,
        y: area.y - cat.position.y
      }
    });
  }

  // 우선순위 맵: 이동 중인 카테고리가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingCategoryId, 0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 카테고리 배열 (이번 iteration 시작 시점)
    const originalCategories = [...updatedCategories];
    const newCategories = [...updatedCategories];

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      const currentCat = newCategories.find(cat => cat.id === sibling.id);
      if (!currentCat) continue;

      // 이미 이번 iteration에서 처리된 카테고리는 스킵
      if (processedInThisIteration.has(currentCat.id)) continue;

      const currentFixed = fixedAreas.get(currentCat.id);
      if (!currentFixed) continue;

      // 현재 카테고리 영역 (크기 고정, 위치만 업데이트)
      const currentArea: CategoryArea = {
        x: currentCat.position.x + currentFixed.offset.x,
        y: currentCat.position.y + currentFixed.offset.y,
        width: currentFixed.area.width,
        height: currentFixed.area.height
      };

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 모든 형제들과 충돌 검사
      for (const otherSibling of siblings) {
        if (currentCat.id === otherSibling.id) continue;

        // otherSibling은 원본 위치 기준 (originalCategories)
        const otherOriginal = originalCategories.find(cat => cat.id === otherSibling.id);
        if (!otherOriginal) continue;

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentCat.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherSibling.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        const otherFixed = fixedAreas.get(otherSibling.id);
        if (!otherFixed) continue;

        // 다른 형제 영역 (원본 위치 기준, 크기 고정)
        const otherArea: CategoryArea = {
          x: otherOriginal.position.x + otherFixed.offset.x,
          y: otherOriginal.position.y + otherFixed.offset.y,
          width: otherFixed.area.width,
          height: otherFixed.area.height
        };

        // 밀어낼 방향과 거리 계산 (otherArea가 밀고, currentArea가 밀림)
        const pushDirection = calculatePushDirection(otherArea, currentArea, otherSibling.id, currentCat.id);

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

      // 이동 중인 카테고리와도 충돌 검사
      const movingCurrent = newCategories.find(cat => cat.id === movingCategoryId);
      if (movingCurrent) {
        const movingFixed = fixedAreas.get(movingCategoryId);
        if (movingFixed) {
          const movingArea: CategoryArea = {
            x: movingCurrent.position.x + movingFixed.offset.x,
            y: movingCurrent.position.y + movingFixed.offset.y,
            width: movingFixed.area.width,
            height: movingFixed.area.height
          };

          const pushDirection = calculatePushDirection(movingArea, currentArea, movingCategoryId, currentCat.id);

          if (pushDirection.x !== 0 || pushDirection.y !== 0) {
            hasCollision = true;
            const movingPriority = 0;

            if (movingPriority < highestPusherPriority) {
              totalPushX = pushDirection.x;
              totalPushY = pushDirection.y;
              highestPusherPriority = movingPriority;

              if (!priorityMap.has(currentCat.id)) {
                priorityMap.set(currentCat.id, movingPriority + 1);
              }
            }
          }
        }
      }

      // 밀어내기 적용
      if (totalPushX !== 0 || totalPushY !== 0) {
        const catIndex = newCategories.findIndex(cat => cat.id === currentCat.id);
        if (catIndex !== -1) {
          newCategories[catIndex] = {
            ...newCategories[catIndex],
            position: {
              x: newCategories[catIndex].position.x + totalPushX,
              y: newCategories[catIndex].position.y + totalPushY
            }
          };

          // 하위 카테고리들도 함께 이동 (재귀적으로 모든 하위 카테고리)
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
                // 재귀: 하위의 하위 카테고리도 이동
                moveChildCategories(newCategories[j].id, pushX, pushY);
              }
            }
          };
          moveChildCategories(currentCat.id, totalPushX, totalPushY);

          // 모든 하위 메모들도 함께 이동 (직계 + 모든 depth의 하위 메모)
          const moveChildMemos = (parentId: string, pushX: number, pushY: number) => {
            updatedMemos = updatedMemos.map(memo => {
              if (memo.parentId === parentId) {
                return {
                  ...memo,
                  position: {
                    x: memo.position.x + pushX,
                    y: memo.position.y + pushY
                  }
                };
              }
              return memo;
            });

            // 하위 카테고리의 메모들도 재귀적으로 이동
            for (const childCat of newCategories) {
              if (childCat.parentId === parentId) {
                moveChildMemos(childCat.id, pushX, pushY);
              }
            }
          };
          moveChildMemos(currentCat.id, totalPushX, totalPushY);

          processedInThisIteration.add(currentCat.id);
        }
      }
    }

    updatedCategories = newCategories;

    if (!hasCollision) break;
  }

  return { updatedCategories, updatedMemos };
}

/**
 * 같은 부모를 가진 메모끼리 충돌 검사
 *
 * @param movingMemoId - 이동 중인 메모 ID
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 메모
 */
export function resolveSiblingMemoCollisions(
  movingMemoId: string,
  page: Page,
  maxIterations: number = 10
): MemoBlock[] {
  let updatedMemos = [...page.memos];

  const movingMemo = page.memos.find(m => m.id === movingMemoId);
  if (!movingMemo || !movingMemo.parentId) {
    return updatedMemos; // 부모가 없으면 충돌 검사 안함
  }

  // 같은 부모를 가진 형제 메모들 찾기
  const siblings = page.memos.filter(m =>
    m.id !== movingMemoId &&
    m.parentId === movingMemo.parentId
  );

  // 우선순위 맵: 이동 중인 메모가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingMemoId, 0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 메모 배열 (이번 iteration 시작 시점)
    const originalMemos = [...updatedMemos];
    const newMemos = [...updatedMemos];

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      const currentMemo = newMemos.find(m => m.id === sibling.id);
      if (!currentMemo) continue;

      // 이미 이번 iteration에서 처리된 메모는 스킵
      if (processedInThisIteration.has(currentMemo.id)) continue;

      const { width: currentWidth, height: currentHeight } = getMemoSize(currentMemo.size);

      const currentBounds = {
        left: currentMemo.position.x,
        top: currentMemo.position.y,
        right: currentMemo.position.x + currentWidth,
        bottom: currentMemo.position.y + currentHeight
      };

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 모든 형제들과 충돌 검사 (원본 위치 기준)
      for (const otherSibling of siblings) {
        if (currentMemo.id === otherSibling.id) continue;

        const otherOriginal = originalMemos.find(m => m.id === otherSibling.id);
        if (!otherOriginal) continue;

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentMemo.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherSibling.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        const { width: otherWidth, height: otherHeight } = getMemoSize(otherOriginal.size);

        const otherBounds = {
          left: otherOriginal.position.x,
          top: otherOriginal.position.y,
          right: otherOriginal.position.x + otherWidth,
          bottom: otherOriginal.position.y + otherHeight
        };

        // 겹침 계산
        const overlapLeft = Math.max(currentBounds.left, otherBounds.left);
        const overlapTop = Math.max(currentBounds.top, otherBounds.top);
        const overlapRight = Math.min(currentBounds.right, otherBounds.right);
        const overlapBottom = Math.min(currentBounds.bottom, otherBounds.bottom);

        if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) continue;

        const overlapWidth = overlapRight - overlapLeft;
        const overlapHeight = overlapBottom - overlapTop;

        hasCollision = true;

        let pushX = 0;
        let pushY = 0;

        if (overlapWidth < overlapHeight) {
          // X축 겹침이 적음 - X 방향으로 밀기
          const direction = otherOriginal.position.x < currentMemo.position.x ? 1 : -1;
          pushX = overlapWidth * direction;
        } else {
          // Y축 겹침이 적음 - Y 방향으로 밀기
          const direction = otherOriginal.position.y < currentMemo.position.y ? 1 : -1;
          pushY = overlapHeight * direction;
        }

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

      // 이동 중인 메모와도 충돌 검사
      const movingCurrent = newMemos.find(m => m.id === movingMemoId);
      if (movingCurrent && movingCurrent.id !== currentMemo.id) {
        const { width: movingWidth, height: movingHeight } = getMemoSize(movingCurrent.size);

        const movingBounds = {
          left: movingCurrent.position.x,
          top: movingCurrent.position.y,
          right: movingCurrent.position.x + movingWidth,
          bottom: movingCurrent.position.y + movingHeight
        };

        const overlapLeft = Math.max(currentBounds.left, movingBounds.left);
        const overlapTop = Math.max(currentBounds.top, movingBounds.top);
        const overlapRight = Math.min(currentBounds.right, movingBounds.right);
        const overlapBottom = Math.min(currentBounds.bottom, movingBounds.bottom);

        if (!(overlapLeft >= overlapRight || overlapTop >= overlapBottom)) {
          const overlapWidth = overlapRight - overlapLeft;
          const overlapHeight = overlapBottom - overlapTop;

          hasCollision = true;

          let pushX = 0;
          let pushY = 0;

          if (overlapWidth < overlapHeight) {
            // X축 겹침이 적음 - X 방향으로 밀기
            const direction = movingCurrent.position.x < currentMemo.position.x ? 1 : -1;
            pushX = overlapWidth * direction;
          } else {
            // Y축 겹침이 적음 - Y 방향으로 밀기
            const direction = movingCurrent.position.y < currentMemo.position.y ? 1 : -1;
            pushY = overlapHeight * direction;
          }

          const movingPriority = 0;
          if (movingPriority < highestPusherPriority) {
            totalPushX = pushX;
            totalPushY = pushY;
            highestPusherPriority = movingPriority;

            if (!priorityMap.has(currentMemo.id)) {
              priorityMap.set(currentMemo.id, movingPriority + 1);
            }
          }
        }
      }

      // 밀어내기 적용
      if (totalPushX !== 0 || totalPushY !== 0) {
        const memoIndex = newMemos.findIndex(m => m.id === currentMemo.id);
        if (memoIndex !== -1) {
          newMemos[memoIndex] = {
            ...newMemos[memoIndex],
            position: {
              x: newMemos[memoIndex].position.x + totalPushX,
              y: newMemos[memoIndex].position.y + totalPushY
            }
          };

          processedInThisIteration.add(currentMemo.id);
        }
      }
    }

    updatedMemos = newMemos;

    if (!hasCollision) break;
  }

  return updatedMemos;
}

/**
 * 메모와 직계 자식 영역 간 충돌 검사
 *
 * @param movingMemoId - 이동 중인 메모 ID
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 메모와 카테고리
 */
export function resolveMemoChildAreaCollisions(
  movingMemoId: string,
  page: Page,
  maxIterations: number = 10
): { memos: MemoBlock[]; categories: CategoryBlock[] } {
  let updatedMemos = [...page.memos];
  let updatedCategories = [...(page.categories || [])];

  const movingMemo = page.memos.find(m => m.id === movingMemoId);
  if (!movingMemo || !movingMemo.parentId) {
    return { memos: updatedMemos, categories: updatedCategories };
  }

  // 메모가 속한 영역의 직계 자식 영역들 찾기
  const childAreas = page.categories?.filter(cat => cat.parentId === movingMemo.parentId) || [];

  // 원본 페이지 상태에서 자식 영역들을 미리 계산 (크기 고정)
  const fixedChildAreas = new Map<string, { area: CategoryArea; offset: { x: number; y: number } }>();

  for (const childArea of childAreas) {
    let area = calculateCategoryArea(childArea, page);
    if (!area) {
      const { width: w, height: h } = getCategorySize(childArea.size);
      area = {
        x: childArea.position.x,
        y: childArea.position.y,
        width: w,
        height: h
      };
    }
    fixedChildAreas.set(childArea.id, {
      area,
      offset: {
        x: area.x - childArea.position.x,
        y: area.y - childArea.position.y
      }
    });
  }

  // 우선순위 맵: 이동 중인 메모가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingMemoId, 0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 카테고리 배열 (이번 iteration 시작 시점)
    const originalCategories = [...updatedCategories];
    const newCategories = [...updatedCategories];

    const currentMovingMemo = updatedMemos.find(m => m.id === movingMemoId);
    if (!currentMovingMemo) break;

    const { width: memoWidth, height: memoHeight } = getMemoSize(currentMovingMemo.size);

    const memoArea: CategoryArea = {
      x: currentMovingMemo.position.x,
      y: currentMovingMemo.position.y,
      width: memoWidth,
      height: memoHeight
    };

    for (let i = 0; i < childAreas.length; i++) {
      const childArea = childAreas[i];
      const currentChildArea = newCategories.find(cat => cat.id === childArea.id);
      if (!currentChildArea) continue;

      // 이미 이번 iteration에서 처리된 영역은 스킵
      if (processedInThisIteration.has(currentChildArea.id)) continue;

      const childFixed = fixedChildAreas.get(childArea.id);
      if (!childFixed) continue;

      // 자식 영역 (현재 위치, 크기 고정)
      const currentArea: CategoryArea = {
        x: currentChildArea.position.x + childFixed.offset.x,
        y: currentChildArea.position.y + childFixed.offset.y,
        width: childFixed.area.width,
        height: childFixed.area.height
      };

      // 밀어낼 방향과 거리 계산 (memoArea가 밀고, currentArea가 밀림)
      const pushDirection = calculatePushDirection(memoArea, currentArea, movingMemoId, childArea.id);

      if (pushDirection.x !== 0 || pushDirection.y !== 0) {
        hasCollision = true;

        const catIndex = newCategories.findIndex(cat => cat.id === childArea.id);
        if (catIndex !== -1) {
          // 자식 영역 이동
          newCategories[catIndex] = {
            ...newCategories[catIndex],
            position: {
              x: newCategories[catIndex].position.x + pushDirection.x,
              y: newCategories[catIndex].position.y + pushDirection.y
            }
          };

          // 하위 카테고리들도 함께 이동 (재귀적으로 모든 하위 카테고리)
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
                moveChildCategories(newCategories[j].id, pushX, pushY);
              }
            }
          };
          moveChildCategories(childArea.id, pushDirection.x, pushDirection.y);

          // 모든 하위 메모들도 함께 이동 (직계 + 모든 depth의 하위 메모)
          const moveChildMemos = (parentId: string, pushX: number, pushY: number) => {
            updatedMemos = updatedMemos.map(memo => {
              if (memo.parentId === parentId) {
                return {
                  ...memo,
                  position: {
                    x: memo.position.x + pushX,
                    y: memo.position.y + pushY
                  }
                };
              }
              return memo;
            });

            // 하위 카테고리의 메모들도 재귀적으로 이동
            for (const childCat of newCategories) {
              if (childCat.parentId === parentId) {
                moveChildMemos(childCat.id, pushX, pushY);
              }
            }
          };
          moveChildMemos(childArea.id, pushDirection.x, pushDirection.y);

          processedInThisIteration.add(childArea.id);
        }
      }
    }

    updatedCategories = newCategories;

    if (!hasCollision) break;
  }

  return { memos: updatedMemos, categories: updatedCategories };
}
