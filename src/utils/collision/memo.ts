import { Page } from '../../types';
import { calculateCategoryArea } from '../categoryAreaUtils';
import { MemoCollisionResult } from './types';
import { getMemoSize } from '../constants';

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

        const { width: memoWidth, height: memoHeight } = getMemoSize(memo.size);
        const { width: blockedWidth, height: blockedHeight } = getMemoSize(blockedMemo.size);

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
        const { width: currentWidth, height: currentHeight } = getMemoSize(currentMemo.size);
        const { width: otherWidth, height: otherHeight } = getMemoSize(otherMemo.size);

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
        const { width: currentWidth, height: currentHeight } = getMemoSize(currentMemo.size);

        for (const otherMemo of updatedMemos) {
          if (otherMemo.id === currentMemo.id) continue;
          if (otherMemo.parentId !== movingMemo.parentId) continue; // 같은 레벨만

          const { width: otherWidth, height: otherHeight } = getMemoSize(otherMemo.size);

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

  const { width: memoWidth, height: memoHeight } = getMemoSize(memo.size);

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
