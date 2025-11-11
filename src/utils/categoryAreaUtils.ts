import { CategoryBlock, MemoBlock, Page } from '../types';
import { DEFAULT_MEMO_WIDTH, DEFAULT_MEMO_HEIGHT, DEFAULT_CATEGORY_WIDTH, DEFAULT_CATEGORY_HEIGHT } from './constants';

export interface CategoryArea {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

/**
 * 카테고리 영역 계산 - 카테고리 블록과 모든 하위 아이템을 포함하는 경계 박스 계산
 *
 * @param category - 영역을 계산할 카테고리
 * @param page - 현재 페이지 (메모와 카테고리 데이터 포함)
 * @param visited - 순환 참조 방지용 방문 집합
 * @returns 계산된 영역 또는 null (하위 아이템 없을 때)
 */
export function calculateCategoryArea(
  category: CategoryBlock,
  page: Page,
  visited: Set<string> = new Set()
): CategoryArea | null {
  // 순환 참조 방지
  if (visited.has(category.id)) {
    return null;
  }
  visited.add(category.id);

  const childMemos = page.memos?.filter(memo => memo.parentId === category.id) || [];
  const childCategories = page.categories?.filter(cat => cat.parentId === category.id) || [];

  // 카테고리 블록 자체의 위치와 크기
  const categoryWidth = category.size?.width || DEFAULT_CATEGORY_WIDTH;
  const categoryHeight = category.size?.height || DEFAULT_CATEGORY_HEIGHT;

  // 초기값: 카테고리 블록 자체의 위치로 시작
  let minX = category.position.x;
  let minY = category.position.y;
  let maxX = category.position.x + categoryWidth;
  let maxY = category.position.y + categoryHeight;

  // 하위 메모들의 경계 포함
  childMemos.forEach(memo => {
    // 메모의 실제 저장된 크기를 사용 (스케일은 Canvas에서 적용됨)
    const memoWidth = memo.size?.width || DEFAULT_MEMO_WIDTH;
    const memoHeight = memo.size?.height || DEFAULT_MEMO_HEIGHT;

    minX = Math.min(minX, memo.position.x);
    minY = Math.min(minY, memo.position.y);
    maxX = Math.max(maxX, memo.position.x + memoWidth);
    maxY = Math.max(maxY, memo.position.y + memoHeight);
  });

  // 하위 카테고리들의 영역도 재귀적으로 포함
  childCategories.forEach(childCategory => {
    const childArea = calculateCategoryArea(childCategory, page, visited);
    if (childArea) {
      // 하위 카테고리가 자식을 가지고 있어서 영역이 계산된 경우
      minX = Math.min(minX, childArea.x);
      minY = Math.min(minY, childArea.y);
      maxX = Math.max(maxX, childArea.x + childArea.width);
      maxY = Math.max(maxY, childArea.y + childArea.height);
    } else {
      // 하위 카테고리에 자식이 없어서 영역이 null인 경우
      // 하위 카테고리 블록 자체의 위치와 크기를 포함
      const childCategoryWidth = childCategory.size?.width || DEFAULT_CATEGORY_WIDTH;
      const childCategoryHeight = childCategory.size?.height || DEFAULT_CATEGORY_HEIGHT;
      minX = Math.min(minX, childCategory.position.x);
      minY = Math.min(minY, childCategory.position.y);
      maxX = Math.max(maxX, childCategory.position.x + childCategoryWidth);
      maxY = Math.max(maxY, childCategory.position.y + childCategoryHeight);
    }
  });

  // 방문 완료 후 제거 (다른 브랜치에서 재방문 가능하도록)
  visited.delete(category.id);

  // 여백 추가 (적절한 간격)
  const padding = 20;

  // 최소 크기 보장 (빈 카테고리도 충분한 크기로)
  const minWidth = 400;
  const minHeight = 250;

  const calculatedWidth = maxX - minX + padding * 2;
  const calculatedHeight = maxY - minY + padding * 2;

  const finalArea = {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(calculatedWidth, minWidth),
    height: Math.max(calculatedHeight, minHeight)
  };

  return finalArea;
}

/**
 * 두 영역이 겹치는지 확인
 */
export function checkOverlap(area1: CategoryArea, area2: CategoryArea): boolean {
  return !(
    area1.x + area1.width < area2.x ||
    area1.x > area2.x + area2.width ||
    area1.y + area1.height < area2.y ||
    area1.y > area2.y + area2.height
  );
}

/**
 * 두 영역의 겹침 정도 계산
 */
export function calculateOverlap(area1: CategoryArea, area2: CategoryArea): { x: number; y: number } {
  const overlapX = Math.max(0,
    Math.min(area1.x + area1.width, area2.x + area2.width) -
    Math.max(area1.x, area2.x)
  );
  const overlapY = Math.max(0,
    Math.min(area1.y + area1.height, area2.y + area2.height) -
    Math.max(area1.y, area2.y)
  );

  return { x: overlapX, y: overlapY };
}

// 충돌 방향 추적 맵 (전역)
const collisionDirectionMap = new Map<string, 'left' | 'right' | 'up' | 'down'>();

// 이전 위치 추적 맵 (이동 방향 계산용)
const previousPositionMap = new Map<string, { x: number; y: number }>();

/**
 * 충돌 방향 추적 맵 초기화 (드래그 종료 시 호출)
 */
export function clearCollisionDirections() {
  collisionDirectionMap.clear();
  previousPositionMap.clear();
}

/**
 * 충돌한 테두리를 기준으로 밀어낼 방향과 거리 계산
 * 밀리는 애의 어느 테두리에서 충돌했는지 확인하고 그 방향으로 밀기
 * @param movingArea - 이동 중인 영역 (밀어내는 영역)
 * @param targetArea - 밀릴 영역
 * @param movingId - 이동 중인 객체 ID
 * @param targetId - 밀릴 객체 ID
 */
export function calculatePushDirection(
  movingArea: CategoryArea,
  targetArea: CategoryArea,
  movingId?: string,
  targetId?: string
): { x: number; y: number } {
  const overlap = calculateOverlap(movingArea, targetArea);

  if (overlap.x === 0 || overlap.y === 0) {
    // 겹침이 해소되면 방향 초기화
    if (movingId && targetId) {
      const key = `${movingId}-${targetId}`;
      collisionDirectionMap.delete(key);
    }
    return { x: 0, y: 0 };
  }

  // 충돌 쌍의 고유 키
  const collisionKey = movingId && targetId ? `${movingId}-${targetId}` : '';
  const existingDirection = collisionKey ? collisionDirectionMap.get(collisionKey) : undefined;

  // 밀리는 애(target)의 각 테두리 위치
  const targetLeft = targetArea.x;
  const targetRight = targetArea.x + targetArea.width;
  const targetTop = targetArea.y;
  const targetBottom = targetArea.y + targetArea.height;

  // 미는 애(moving)의 각 테두리 위치
  const movingLeft = movingArea.x;
  const movingRight = movingArea.x + movingArea.width;
  const movingTop = movingArea.y;
  const movingBottom = movingArea.y + movingArea.height;

  const GAP = 1; // 약간의 간격 (겹치지 않도록)

  // 이미 충돌 방향이 결정되어 있으면 그 방향으로 계속 밀기 (절대 재계산하지 않음)
  if (existingDirection) {
    let pushX = 0;
    let pushY = 0;

    switch (existingDirection) {
      case 'right':
        pushX = overlap.x + GAP;
        break;
      case 'left':
        pushX = -(overlap.x + GAP);
        break;
      case 'down':
        pushY = overlap.y + GAP;
        break;
      case 'up':
        pushY = -(overlap.y + GAP);
        break;
    }

    return { x: pushX, y: pushY };
  }

  // 초기 충돌: 중심점 거리로 방향 판정
  const movingCenterX = movingArea.x + movingArea.width / 2;
  const movingCenterY = movingArea.y + movingArea.height / 2;
  const targetCenterX = targetArea.x + targetArea.width / 2;
  const targetCenterY = targetArea.y + targetArea.height / 2;

  const deltaX = movingCenterX - targetCenterX;
  const deltaY = movingCenterY - targetCenterY;

  let decidedDirection: 'left' | 'right' | 'up' | 'down';

  // 중심점 간 거리가 더 큰 축 방향으로 밀기
  // (거리가 크다 = 그 방향으로 더 멀리 떨어져 있다 = 그 방향에서 충돌)
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // X축 거리가 더 큼 → 좌우에서 충돌
    if (deltaX > 0) {
      // moving이 오른쪽에 → target을 왼쪽으로
      decidedDirection = 'left';
    } else {
      // moving이 왼쪽에 → target을 오른쪽으로
      decidedDirection = 'right';
    }
  } else {
    // Y축 거리가 더 큼 → 위아래에서 충돌
    if (deltaY > 0) {
      // moving이 아래에 → target을 위로
      decidedDirection = 'up';
    } else {
      // moving이 위에 → target을 아래로
      decidedDirection = 'down';
    }
  }

  // 방향에 따라 밀기
  let pushX = 0;
  let pushY = 0;

  switch (decidedDirection) {
    case 'right':
      pushX = overlap.x + GAP;
      break;
    case 'left':
      pushX = -(overlap.x + GAP);
      break;
    case 'down':
      pushY = overlap.y + GAP;
      break;
    case 'up':
      pushY = -(overlap.y + GAP);
      break;
  }

  // 충돌 방향 기억
  if (collisionKey && decidedDirection) {
    collisionDirectionMap.set(collisionKey, decidedDirection);
  }

  return { x: pushX, y: pushY };
}

/**
 * 하위 카테고리 영역이 상위 카테고리 영역 내에 있는지 확인
 */
export function isAreaContained(childArea: CategoryArea, parentArea: CategoryArea): boolean {
  return (
    childArea.x >= parentArea.x &&
    childArea.y >= parentArea.y &&
    childArea.x + childArea.width <= parentArea.x + parentArea.width &&
    childArea.y + childArea.height <= parentArea.y + parentArea.height
  );
}

/**
 * 하위 카테고리 영역을 상위 카테고리 영역 내부로 제한
 * @returns 제한된 영역의 좌상단 좌표
 */
export function constrainAreaWithinParent(
  childArea: CategoryArea,
  parentArea: CategoryArea
): { x: number; y: number } {
  let constrainedX = childArea.x;
  let constrainedY = childArea.y;

  // 왼쪽 경계
  if (childArea.x < parentArea.x) {
    constrainedX = parentArea.x;
  }
  // 오른쪽 경계
  if (childArea.x + childArea.width > parentArea.x + parentArea.width) {
    constrainedX = parentArea.x + parentArea.width - childArea.width;
  }
  // 상단 경계
  if (childArea.y < parentArea.y) {
    constrainedY = parentArea.y;
  }
  // 하단 경계
  if (childArea.y + childArea.height > parentArea.y + parentArea.height) {
    constrainedY = parentArea.y + parentArea.height - childArea.height;
  }

  return { x: constrainedX, y: constrainedY };
}

/**
 * 캔버스를 특정 위치가 중앙에 오도록 조정
 * @param targetPosition - 중앙에 위치시킬 좌표
 * @param canvasWidth - 캔버스 컨테이너 너비
 * @param canvasHeight - 캔버스 컨테이너 높이
 * @param canvasScale - 현재 캔버스 스케일
 * @returns 새로운 캔버스 오프셋
 */
export function centerCanvasOnPosition(
  targetPosition: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  canvasScale: number
): { x: number; y: number } {
  // 모바일 체크 (768px 이하)
  const isMobile = window.innerWidth <= 768;

  // 모바일에서는 실제 화면 크기 사용, PC에서는 전달된 값 사용
  const actualCanvasWidth = isMobile ? window.innerWidth : canvasWidth;
  const actualCanvasHeight = isMobile ? window.innerHeight : canvasHeight;

  // 타겟 위치를 스케일 적용한 좌표로 변환
  const scaledTargetX = targetPosition.x * canvasScale;
  const scaledTargetY = targetPosition.y * canvasScale;

  // 캔버스 중앙 좌표
  const centerX = actualCanvasWidth / 2;
  const centerY = actualCanvasHeight / 2;

  // 타겟이 중앙에 오도록 오프셋 계산
  const newOffsetX = centerX - scaledTargetX;
  const newOffsetY = centerY - scaledTargetY;

  return { x: newOffsetX, y: newOffsetY };
}

/**
 * 메모를 화면 중앙으로 이동
 * @param memoId - 메모 ID
 * @param page - 현재 페이지
 * @param canvasScale - 캔버스 스케일
 * @param setCanvasOffset - 캔버스 오프셋 설정 함수
 */
export function centerOnMemo(
  memoId: string,
  page: Page,
  canvasScale: number,
  setCanvasOffset: (offset: { x: number; y: number }) => void,
  setCanvasScale?: (scale: number) => void
): void {
  console.log('🎯 [centerOnMemo] 호출됨:', { memoId, pageId: page.id, currentScale: canvasScale });

  const memo = page.memos?.find(m => m.id === memoId);
  if (!memo) {
    console.error('❌ [centerOnMemo] 메모를 찾을 수 없음:', memoId);
    return;
  }

  const canvasElement = document.getElementById('main-canvas');
  if (!canvasElement) {
    console.error('❌ [centerOnMemo] Canvas 요소를 찾을 수 없음');
    return;
  }

  const rect = canvasElement.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  console.log('📐 [centerOnMemo] Canvas 크기:', { width: rect.width, height: rect.height });

  const memoWidth = memo.size?.width || 200;
  const memoHeight = memo.size?.height || 150;

  // 메모의 중심점을 화면 중앙에 위치시키기
  const itemCenterX = memo.position.x + (memoWidth / 2);
  const itemCenterY = memo.position.y + (memoHeight / 2);
  console.log('📍 [centerOnMemo] 메모 위치:', { x: memo.position.x, y: memo.position.y, centerX: itemCenterX, centerY: itemCenterY });

  // scale을 1로 리셋 (PC 버전 로직과 동일)
  const targetScale = 1;
  const newOffsetX = centerX - (itemCenterX * targetScale);
  const newOffsetY = centerY - (itemCenterY * targetScale);
  console.log('🔄 [centerOnMemo] 새 offset 계산:', { newOffsetX, newOffsetY, targetScale });

  setCanvasOffset({ x: newOffsetX, y: newOffsetY });
  if (setCanvasScale) {
    setCanvasScale(targetScale);
    console.log('✅ [centerOnMemo] offset 및 scale 설정 완료');
  } else {
    console.log('✅ [centerOnMemo] offset 설정 완료 (scale 설정 함수 없음)');
  }
}

/**
 * 카테고리 영역 전체를 화면 중앙으로 이동
 * @param categoryId - 카테고리 ID
 * @param page - 현재 페이지
 * @param canvasScale - 캔버스 스케일
 * @param setCanvasOffset - 캔버스 오프셋 설정 함수
 */
export function centerOnCategory(
  categoryId: string,
  page: Page,
  canvasScale: number,
  setCanvasOffset: (offset: { x: number; y: number }) => void,
  setCanvasScale?: (scale: number) => void
): void {
  const category = page.categories?.find(c => c.id === categoryId);
  if (!category) return;

  const canvasElement = document.getElementById('main-canvas');
  if (!canvasElement) return;

  const rect = canvasElement.getBoundingClientRect();
  const availableWidth = rect.width;
  const availableHeight = rect.height;

  // 카테고리의 전체 영역 계산
  const categoryArea = calculateCategoryArea(category, page);

  if (categoryArea && category.isExpanded) {
    // 영역이 있고 확장된 상태면 전체 영역이 화면에 보이도록 조정 (PC 버전 로직)
    const areaWidth = categoryArea.width;
    const areaHeight = categoryArea.height;
    const areaCenterX = categoryArea.x + areaWidth / 2;
    const areaCenterY = categoryArea.y + areaHeight / 2;

    // 영역이 화면에 맞도록 스케일 계산 (여백 20% 추가)
    const margin = 0.2;
    const scaleX = availableWidth / (areaWidth * (1 + margin));
    const scaleY = availableHeight / (areaHeight * (1 + margin));
    const optimalScale = Math.min(scaleX, scaleY, 1); // 최대 1배 (확대 안함)

    // 화면 중앙에 영역이 오도록 offset 계산
    const newOffsetX = availableWidth / 2 - areaCenterX * optimalScale;
    const newOffsetY = availableHeight / 2 - areaCenterY * optimalScale;

    setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    if (setCanvasScale) {
      setCanvasScale(optimalScale);
    }
  } else {
    // 영역이 없거나 축소된 상태면 카테고리 블록만 중앙에 표시
    const categoryWidth = category.size?.width || 200;
    const categoryHeight = category.size?.height || 80;
    const categoryCenterX = category.position.x + categoryWidth / 2;
    const categoryCenterY = category.position.y + categoryHeight / 2;

    const targetScale = 1;
    const newOffsetX = availableWidth / 2 - categoryCenterX * targetScale;
    const newOffsetY = availableHeight / 2 - categoryCenterY * targetScale;

    setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    if (setCanvasScale) {
      setCanvasScale(targetScale);
    }
  }
}
