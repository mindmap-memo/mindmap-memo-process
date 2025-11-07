import { Page, CategoryBlock } from '../../types';
import { calculateCategoryArea, CategoryArea, calculatePushDirection } from '../categoryAreaUtils';
import { CollisionResult, CollidableObject } from './types';
import { getMemoSize } from '../constants';

/**
 * 통합 충돌 검사 시스템 - 같은 depth의 메모와 영역을 모두 처리
 *
 * @param movingId - 이동 중인 메모 또는 카테고리 ID
 * @param movingType - 'memo' 또는 'area'
 * @param page - 현재 페이지
 * @param maxIterations - 최대 반복 횟수
 * @param movingIds - 다중 선택된 모든 메모/카테고리 ID 배열 (선택사항)
 * @param frameDelta - 이동 중인 객체의 프레임 간 이동 거리 (충돌 당한 객체가 같은 속도로 밀려나도록)
 * @param isLongPressActive - 롱프레스 활성화 여부 (true일 경우 충돌 판정 스킵)
 */
export function resolveUnifiedCollisions(
  movingId: string,
  movingType: 'memo' | 'area',
  page: Page,
  maxIterations: number = 10,
  movingIds?: string[],
  frameDelta?: { x: number; y: number },
  isLongPressActive?: boolean
): CollisionResult {
  console.log('[resolveUnifiedCollisions] 호출됨:', {
    movingId,
    movingType,
    maxIterations,
    movingIds,
    frameDelta,
    isLongPressActive,
    categoriesCount: page.categories?.length,
    memosCount: page.memos.length
  });

  // 롱프레스 활성화 시 충돌 판정 스킵
  if (isLongPressActive) {
    console.log('[resolveUnifiedCollisions] 롱프레스 활성화 - 충돌 판정 스킵');
    return {
      updatedCategories: [...(page.categories || [])],
      updatedMemos: [...page.memos]
    };
  }

  let updatedMemos = [...page.memos];
  let updatedCategories = [...(page.categories || [])];

  // 이동 중인 객체 찾기
  const movingMemo = movingType === 'memo' ? updatedMemos.find(m => m.id === movingId) : null;
  const movingCategory = movingType === 'area' ? updatedCategories.find(c => c.id === movingId) : null;

  console.log('[resolveUnifiedCollisions] 이동 중인 객체:', {
    movingMemo: movingMemo?.id,
    movingCategory: movingCategory?.id
  });

  if (!movingMemo && !movingCategory) {
    console.log('[resolveUnifiedCollisions] 이동 중인 객체를 찾을 수 없음 - 종료');
    return { updatedCategories, updatedMemos };
  }

  const movingParentId = movingMemo?.parentId ?? movingCategory?.parentId ?? null;
  console.log('[resolveUnifiedCollisions] movingParentId:', movingParentId);

  // 영역의 크기와 offset을 캐시 (드래그 중 크기는 고정, 위치만 업데이트)
  const areaOffsetCache = new Map<string, { width: number; height: number; offsetX: number; offsetY: number }>();

  // 카테고리 영역을 계산하거나 캐시에서 가져오는 함수
  const getCategoryAreaBounds = (category: CategoryBlock): CategoryArea | null => {
    // 이미 캐시된 경우, 현재 카테고리 위치 + 캐시된 offset/크기 사용
    const cached = areaOffsetCache.get(category.id);
    if (cached) {
      return {
        x: category.position.x + cached.offsetX,
        y: category.position.y + cached.offsetY,
        width: cached.width,
        height: cached.height
      };
    }

    // 처음 계산: 실제 영역 계산 후 offset과 크기 캐시
    const area = calculateCategoryArea(category, { ...page, memos: updatedMemos, categories: updatedCategories });
    if (area) {
      areaOffsetCache.set(category.id, {
        width: area.width,
        height: area.height,
        offsetX: area.x - category.position.x,
        offsetY: area.y - category.position.y
      });
    }
    return area;
  };

  // 같은 depth의 모든 충돌 가능 객체 수집
  const getCollidableObjects = (): CollidableObject[] => {
    const objects: CollidableObject[] = [];

    // 메모들 추가 (같은 parentId를 가진 메모만)
    updatedMemos.forEach(memo => {
      // null과 undefined를 동일하게 처리 (루트 레벨)
      const memoParent = memo.parentId ?? null;
      const movingParent = movingParentId ?? null;

      if (memoParent === movingParent) {
        const { width, height } = getMemoSize(memo.size);
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
    // 최신 updatedCategories를 사용하여 현재 위치 반영
    for (const category of updatedCategories) {
      // null과 undefined를 동일하게 처리 (루트 레벨)
      const categoryParent = category.parentId ?? null;
      const movingParent = movingParentId ?? null;

      // 같은 부모를 가진 카테고리만 (형제 카테고리)
      if (categoryParent === movingParent) {
        // expanded된 카테고리만 영역으로 추가 (성능 최적화)
        // 펼쳐진 카테고리는 하위 요소가 없어도 영역을 가짐
        if (!category.isExpanded) continue;

        // 영역 계산 (캐시 사용, 현재 카테고리 위치 기준)
        const area = getCategoryAreaBounds(category);
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
    }

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

  // frameDelta 사용 시에도 연쇄 충돌 전파를 위해 iteration 반복
  // 단, 각 iteration에서는 frameDelta만큼만 밀기 (부드러움 유지)
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;

    // 현재 iteration의 최신 위치로 collidables 다시 계산
    const collidables = getCollidableObjects();
    console.log(`[resolveUnifiedCollisions] iteration ${iteration}, collidables:`, collidables.length);
    if (iteration === 0) {
      console.log('[resolveUnifiedCollisions] collidables 상세:', collidables.map(c => ({
        id: c.id,
        type: c.type,
        bounds: c.bounds
      })));
    }

    for (const current of collidables) {
      // 이동 중인 객체들은 밀리지 않음 (다중 선택 포함)
      if (priorityMap.get(current.id) === 0) continue;

      const currentPriority = priorityMap.get(current.id) ?? Infinity;
      let totalPushX = 0;
      let totalPushY = 0;
      let highestPusherPriority = Infinity;

      // 모든 다른 객체와 충돌 검사 (최신 위치 사용)
      for (const other of collidables) {
        if (current.id === other.id) continue;

        const otherPriority = priorityMap.get(other.id) ?? Infinity;

        // 우선순위가 같거나 높으면 밀리지 않음
        if (currentPriority <= otherPriority) continue;

        // 루트 레벨 메모는 영역을 밀 수 없음 (영역이 메모를 밀어내는 건 OK)
        if (other.type === 'memo' && current.type === 'area' && !other.parentId) {
          continue; // 루트 메모가 영역을 밀려고 하면 스킵
        }

        // 충돌 검사
        const pushDirection = calculatePushDirection(other.bounds, current.bounds, other.id, current.id);

        if (pushDirection.x !== 0 || pushDirection.y !== 0) {
          console.log('[resolveUnifiedCollisions] 충돌 감지!', {
            iteration,
            pusher: other.id,
            pushed: current.id,
            pushDirection
          });
          hasCollision = true;

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

    if (!hasCollision) {
      break;
    }
  }

  return { updatedCategories, updatedMemos };
}
