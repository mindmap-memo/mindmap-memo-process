import { CategoryBlock, MemoBlock, Page } from '../types';
import { calculateCategoryArea, CategoryArea, calculatePushDirection } from './categoryAreaUtils';
import { isParentChild } from './categoryHierarchyUtils';

export interface CollisionResult {
  updatedCategories: CategoryBlock[];
  updatedMemos: MemoBlock[];
}

// 충돌 가능 객체 타입 (메모 또는 영역)
interface CollidableObject {
  id: string;
  type: 'memo' | 'area';
  parentId: string | null | undefined;
  bounds: CategoryArea;
  originalMemo?: MemoBlock;
  originalCategory?: CategoryBlock;
}

/**
 * 통합 충돌 검사 시스템 - 같은 depth의 메모와 영역을 모두 처리
 *
 * @param movingId - 이동 중인 메모 또는 카테고리 ID
 * @param movingType - 'memo' 또는 'area'
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수
 * @param movingIds - 다중 선택된 모든 메모/카테고리 ID 배열 (선택사항)
 */
export function resolveUnifiedCollisions(
  movingId: string,
  movingType: 'memo' | 'area',
  page: Page,
  maxIterations: number = 10,
  movingIds?: string[]
): CollisionResult {
  let updatedMemos = [...page.memos];
  let updatedCategories = [...(page.categories || [])];

  // 이동 중인 객체 찾기
  const movingMemo = movingType === 'memo' ? updatedMemos.find(m => m.id === movingId) : null;
  const movingCategory = movingType === 'area' ? updatedCategories.find(c => c.id === movingId) : null;

  if (!movingMemo && !movingCategory) {
    return { updatedCategories, updatedMemos };
  }

  const movingParentId = movingMemo?.parentId ?? movingCategory?.parentId ?? null;

  // 같은 depth의 모든 충돌 가능 객체 수집
  const getCollidableObjects = (): CollidableObject[] => {
    const objects: CollidableObject[] = [];

    // 메모들 추가 (같은 parentId를 가진 메모만)
    updatedMemos.forEach(memo => {
      // null과 undefined를 동일하게 처리 (루트 레벨)
      const memoParent = memo.parentId ?? null;
      const movingParent = movingParentId ?? null;

      if (memoParent === movingParent) {
        const width = memo.size?.width || 200;
        const height = memo.size?.height || 95;
        objects.push({
          id: memo.id,
          type: 'memo',
          parentId: memo.parentId || undefined,
          bounds: {
            x: memo.position.x,
            y: memo.position.y,
            width,
            height
          },
          originalMemo: memo
        });
      }
    });

    // 영역들 추가 (같은 parentId를 가진 카테고리의 영역)
    updatedCategories.forEach(category => {
      // null과 undefined를 동일하게 처리 (루트 레벨)
      const categoryParent = category.parentId ?? null;
      const movingParent = movingParentId ?? null;

      // 같은 부모를 가진 카테고리만 (형제 카테고리)
      if (categoryParent === movingParent) {
        // expanded되고 자식이 있는 카테고리만 영역으로 추가 (블록은 제외)
        if (!category.isExpanded) return;

        // 자식이 있는지 확인
        const hasChildren = updatedMemos.some(m => m.parentId === category.id) ||
                           updatedCategories.some(c => c.parentId === category.id);

        if (!hasChildren) return; // 자식이 없으면 블록이므로 충돌 대상에서 제외

        const area = calculateCategoryArea(category, { ...page, memos: updatedMemos, categories: updatedCategories });
        if (area) {
          objects.push({
            id: category.id,
            type: 'area',
            parentId: category.parentId || undefined,
            bounds: area,
            originalCategory: category
          });
        }
      }
    });

    return objects;
  };

  // 우선순위 맵: 이동 중인 객체들이 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();

  // 다중 선택된 모든 요소들에게 최고 우선순위 부여
  if (movingIds && movingIds.length > 0) {
    movingIds.forEach(id => priorityMap.set(id, 0));
  } else {
    priorityMap.set(movingId, 0);
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const collidables = getCollidableObjects();
    const originalCollidables = [...collidables];

    for (const current of collidables) {
      // 이동 중인 객체들은 밀리지 않음 (다중 선택 포함)
      if (priorityMap.get(current.id) === 0) continue;

      const currentPriority = priorityMap.get(current.id) ?? Infinity;
      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 모든 다른 객체와 충돌 검사
      for (const other of originalCollidables) {
        if (current.id === other.id) continue;

        const otherPriority = priorityMap.get(other.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        // 충돌 검사
        const pushDirection = calculatePushDirection(other.bounds, current.bounds, other.id, current.id);

        if (pushDirection.x !== 0 || pushDirection.y !== 0) {
          hasCollision = true;

          if (otherPriority < highestPusherPriority) {
            totalPushX = pushDirection.x;
            totalPushY = pushDirection.y;
            highestPusherPriority = otherPriority;

            if (!priorityMap.has(current.id)) {
              priorityMap.set(current.id, otherPriority + 1);
            }
          }
        }
      }

      // 밀어내기 적용
      if (totalPushX !== 0 || totalPushY !== 0) {
        if (current.type === 'memo' && current.originalMemo) {
          updatedMemos = updatedMemos.map(memo =>
            memo.id === current.id
              ? { ...memo, position: { x: memo.position.x + totalPushX, y: memo.position.y + totalPushY } }
              : memo
          );
        } else if (current.type === 'area' && current.originalCategory) {
          // 카테고리 이동
          updatedCategories = updatedCategories.map(cat =>
            cat.id === current.id
              ? { ...cat, position: { x: cat.position.x + totalPushX, y: cat.position.y + totalPushY } }
              : cat
          );

          // 모든 하위 depth의 카테고리 ID 수집 (재귀)
          const getAllDescendantCategoryIds = (parentId: string): Set<string> => {
            const result = new Set<string>();
            const directChildren = updatedCategories.filter(cat => cat.parentId === parentId);

            directChildren.forEach(child => {
              result.add(child.id);
              const descendants = getAllDescendantCategoryIds(child.id);
              descendants.forEach(id => result.add(id));
            });

            return result;
          };

          const allDescendantIds = getAllDescendantCategoryIds(current.id);
          allDescendantIds.add(current.id); // 자기 자신도 포함

          // 하위 카테고리들도 함께 이동
          updatedCategories = updatedCategories.map(cat =>
            allDescendantIds.has(cat.id) && cat.id !== current.id
              ? { ...cat, position: { x: cat.position.x + totalPushX, y: cat.position.y + totalPushY } }
              : cat
          );

          // 모든 하위 depth의 메모들도 함께 이동
          updatedMemos = updatedMemos.map(memo => {
            if (memo.parentId && allDescendantIds.has(memo.parentId)) {
              return { ...memo, position: { x: memo.position.x + totalPushX, y: memo.position.y + totalPushY } };
            }
            return memo;
          });
        }
      }
    }

    if (!hasCollision) break;
  }

  return { updatedCategories, updatedMemos };
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

      // 부모가 있는 카테고리는 충돌 시 밀리지 않음 (부모와 함께 이동)
      if (currentCat.parentId) continue;

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

export interface MemoCollisionResult {
  memos: MemoBlock[];
  blockedByArea: boolean; // 이동 중인 메모가 영역에 막혔는지
}

/**
 * 메모블록-메모블록 충돌 검사 및 밀어내기 (같은 depth만)
 *
 * @param movingMemoId - 이동 중인 메모 ID (최고 우선순위)
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수 (기본 10)
 * @returns 충돌 처리 후 업데이트된 메모와 영역 차단 여부
 */
export function resolveMemoCollisions(
  movingMemoId: string,
  page: Page,
  maxIterations: number = 10
): MemoCollisionResult {
  let updatedMemos = [...page.memos];

  const movingMemo = page.memos.find(m => m.id === movingMemoId);
  if (!movingMemo) {
    return { memos: updatedMemos, blockedByArea: false };
  }

  // 같은 depth의 메모들만 찾기 (같은 parentId를 가진 메모)
  const sameLevelMemos = page.memos.filter(m =>
    m.id !== movingMemoId &&
    m.parentId === movingMemo.parentId
  );

  // 같은 레벨 메모가 없으면 충돌 검사 불필요
  if (sameLevelMemos.length === 0) {
    return { memos: updatedMemos, blockedByArea: false };
  }

  // 우선순위 맵: 이동 중인 메모가 최고 우선순위 (0)
  const priorityMap = new Map<string, number>();
  priorityMap.set(movingMemoId, 0);

  // 영역에 막혀서 이동 불가능한 메모 추적
  const blockedMemos = new Set<string>();
  let movingMemoBlocked = false; // 이동 중인 메모가 영역에 막혔는지

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;
    const processedInThisIteration = new Set<string>();

    // 원본 메모 배열 (이번 iteration 시작 시점)
    const originalMemos = [...updatedMemos];
    const newMemos = [...updatedMemos];

    // 우선순위를 가진 모든 메모가 영역에 막힌 메모와 충돌하는지 확인
    // 연쇄 충돌 확인: A가 B를 밀고, B가 C를 밀고, C가 영역에 막히면 A, B, C 모두 막힘
    const blockedMemoIds = Array.from(blockedMemos);
    const newlyBlockedMemos = new Set<string>();

    for (const memo of updatedMemos) {
      // 같은 레벨이 아닌 메모는 스킵
      if (memo.parentId !== movingMemo.parentId) continue;

      // 우선순위가 있는 메모만 확인 (밀리는 체인에 속한 메모)
      const memoPriority = priorityMap.get(memo.id);
      if (memoPriority === undefined) continue;

      // 이 메모가 영역에 막힌 메모와 충돌하는지 확인
      for (const blockedMemoId of blockedMemoIds) {
        const blockedMemo = updatedMemos.find(m => m.id === blockedMemoId);
        if (!blockedMemo) continue;

        const memoWidth = memo.size?.width || 200;
        const memoHeight = memo.size?.height || 95;
        const blockedWidth = blockedMemo.size?.width || 200;
        const blockedHeight = blockedMemo.size?.height || 95;

        const memoBounds = {
          left: memo.position.x,
          top: memo.position.y,
          right: memo.position.x + memoWidth,
          bottom: memo.position.y + memoHeight
        };

        const blockedBounds = {
          left: blockedMemo.position.x,
          top: blockedMemo.position.y,
          right: blockedMemo.position.x + blockedWidth,
          bottom: blockedMemo.position.y + blockedHeight
        };

        // 겹침 계산
        const overlapLeft = Math.max(memoBounds.left, blockedBounds.left);
        const overlapTop = Math.max(memoBounds.top, blockedBounds.top);
        const overlapRight = Math.min(memoBounds.right, blockedBounds.right);
        const overlapBottom = Math.min(memoBounds.bottom, blockedBounds.bottom);

        // 겹치면 이 메모도 막힘
        if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
          newlyBlockedMemos.add(memo.id);

          // 이 메모가 막혔으면, 이 메모가 밀고 있던 모든 메모(우선순위가 더 낮은)도 막아야 함
          for (const otherMemo of updatedMemos) {
            if (otherMemo.parentId !== movingMemo.parentId) continue;
            const otherPriority = priorityMap.get(otherMemo.id);
            if (otherPriority !== undefined && otherPriority > memoPriority) {
              // 이 메모가 밀고 있던 메모들 (우선순위가 낮은 = 숫자가 큰)
              newlyBlockedMemos.add(otherMemo.id);
            }
          }

          // 이동 중인 메모가 막힌 경우 표시
          if (memo.id === movingMemoId) {
            movingMemoBlocked = true;
          }
        }
      }
    }

    // 새로 막힌 메모들을 blockedMemos에 추가하고 우선순위 설정
    for (const memoId of Array.from(newlyBlockedMemos)) {
      blockedMemos.add(memoId);
      priorityMap.set(memoId, 0);
    }

    // 우선순위 낮은 메모부터 처리 (역순: D → C → B → A)
    // 이렇게 하면 D가 영역에 막혔을 때, C를 처리하기 전에 D가 blockedMemos에 들어감
    const memosWithPriority = newMemos
      .map((memo, index) => ({ memo, index, priority: priorityMap.get(memo.id) ?? Infinity }))
      .filter(item => item.memo.parentId === movingMemo.parentId) // 같은 레벨만
      .sort((a, b) => b.priority - a.priority); // 내림차순 정렬 (큰 숫자 먼저, Infinity 먼저)

    for (const { memo: currentMemo, index: i } of memosWithPriority) {

      // 이미 이번 iteration에서 처리된 메모는 스킵
      if (processedInThisIteration.has(currentMemo.id)) continue;

      // 영역에 막힌 메모는 밀리지 않음
      if (blockedMemos.has(currentMemo.id)) continue;

      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 충돌 검사는 원본 위치 기준 (중복 방지)
      for (const otherMemo of originalMemos) {
        if (currentMemo.id === otherMemo.id) continue;
        if (otherMemo.parentId !== movingMemo.parentId) continue; // 같은 레벨만

        // 우선순위 확인
        const currentPriority = priorityMap.get(currentMemo.id) ?? Infinity;
        const otherPriority = priorityMap.get(otherMemo.id) ?? Infinity;

        // 영역에 막힌 메모는 우선순위를 무시하고 항상 장애물처럼 작동
        const isOtherBlocked = blockedMemos.has(otherMemo.id);

        // 우선순위가 같거나 높으면 밀리지 않음 (단, blocked 메모는 예외)
        if (!isOtherBlocked && currentPriority <= otherPriority) continue;

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

        // 밀어낼 방향 계산 (겹침이 적은 쪽으로 밀기)
        let pushX = 0;
        let pushY = 0;

        if (overlapWidth < overlapHeight) {
          // X축 겹침이 적음 - X 방향으로 밀기
          // otherMemo가 currentMemo보다 왼쪽에 있으면 currentMemo를 오른쪽으로
          const direction = otherMemo.position.x < currentMemo.position.x ? 1 : -1;
          pushX = overlapWidth * direction;
        } else {
          // Y축 겹침이 적음 - Y 방향으로 밀기
          // otherMemo가 currentMemo보다 위에 있으면 currentMemo를 아래로
          const direction = otherMemo.position.y < currentMemo.position.y ? 1 : -1;
          pushY = overlapHeight * direction;
        }

        if (pushX !== 0 || pushY !== 0) {
          hasCollision = true;

          // blocked 메모와 충돌하면 이 메모도 즉시 blocked
          if (isOtherBlocked) {
            // blocked 메모를 밀 수 없으므로 이 메모도 blocked
            blockedMemos.add(currentMemo.id);
            priorityMap.set(currentMemo.id, 0);

            if (currentMemo.id === movingMemoId) {
              movingMemoBlocked = true;
            }

            // 더 이상 밀어내기 시도하지 않음
            totalPushX = 0;
            totalPushY = 0;
            break; // 충돌 검사 중단
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

        // 밀려난 위치가 다른 메모와 겹치는지 확인
        let memoCollision = false;
        const currentWidth = currentMemo.size?.width || 200;
        const currentHeight = currentMemo.size?.height || 95;

        for (const otherMemo of updatedMemos) {
          if (otherMemo.id === currentMemo.id) continue;
          if (otherMemo.parentId !== movingMemo.parentId) continue; // 같은 레벨만

          const otherWidth = otherMemo.size?.width || 200;
          const otherHeight = otherMemo.size?.height || 95;

          const newBounds = {
            left: newPosition.x,
            top: newPosition.y,
            right: newPosition.x + currentWidth,
            bottom: newPosition.y + currentHeight
          };

          const otherBounds = {
            left: otherMemo.position.x,
            top: otherMemo.position.y,
            right: otherMemo.position.x + otherWidth,
            bottom: otherMemo.position.y + otherHeight
          };

          const overlapLeft = Math.max(newBounds.left, otherBounds.left);
          const overlapTop = Math.max(newBounds.top, otherBounds.top);
          const overlapRight = Math.min(newBounds.right, otherBounds.right);
          const overlapBottom = Math.min(newBounds.bottom, otherBounds.bottom);

          if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
            memoCollision = true;
            break;
          }
        }

        // 영역 또는 메모와 충돌하면 밀어내기 중단
        if (areaCollision.blocked || memoCollision) {
          // 막혔으므로 밀지 않음
          blockedMemos.add(currentMemo.id);
          priorityMap.set(currentMemo.id, 0);

          if (currentMemo.id === movingMemoId) {
            movingMemoBlocked = true;
          }
        } else {
          // 충돌하지 않으면 밀어내기 적용
          newMemos[i] = {
            ...currentMemo,
            position: newPosition
          };

          processedInThisIteration.add(currentMemo.id);
        }
      }
    }

    updatedMemos = newMemos;

    // 충돌이 없으면 종료
    if (!hasCollision) break;
  }

  return {
    memos: updatedMemos,
    blockedByArea: movingMemoBlocked
  };
}

/**
 * 메모블록이 영역과 충돌했는지 확인 (같은 depth만)
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
  if (!memo) return { blocked: false };

  const memoWidth = memo.size?.width || 200;
  const memoHeight = memo.size?.height || 95;

  const memoBounds = {
    left: memo.position.x,
    top: memo.position.y,
    right: memo.position.x + memoWidth,
    bottom: memo.position.y + memoHeight
  };

  // 카테고리 영역과 충돌 검사 (같은 depth만 - 같은 parentId)
  const categories = page.categories || [];

  for (const category of categories) {
    // 같은 depth가 아닌 카테고리는 스킵
    if (category.parentId !== memo.parentId) continue;

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
      const w = cat.size?.width || 200;
      const h = cat.size?.height || 80;
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

      const currentWidth = currentMemo.size?.width || 200;
      const currentHeight = currentMemo.size?.height || 95;

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

        const otherWidth = otherOriginal.size?.width || 200;
        const otherHeight = otherOriginal.size?.height || 95;

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
        const movingWidth = movingCurrent.size?.width || 200;
        const movingHeight = movingCurrent.size?.height || 95;

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
      const w = childArea.size?.width || 200;
      const h = childArea.size?.height || 80;
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

    const memoWidth = currentMovingMemo.size?.width || 200;
    const memoHeight = currentMovingMemo.size?.height || 95;

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
