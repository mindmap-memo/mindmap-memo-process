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

  const childMemos = page.memos.filter(memo => memo.parentId === category.id);
  const childCategories = page.categories?.filter(cat => cat.parentId === category.id) || [];

  // 하위 아이템이 없으면 영역 계산 안함
  if (childMemos.length === 0 && childCategories.length === 0) {
    visited.delete(category.id);
    return null;
  }

  // 카테고리 블록 자체의 위치와 크기
  const categoryWidth = category.size?.width || DEFAULT_CATEGORY_WIDTH;
  const categoryHeight = category.size?.height || DEFAULT_CATEGORY_HEIGHT;

  let minX = category.position.x;
  let minY = category.position.y;
  let maxX = category.position.x + categoryWidth;
  let maxY = category.position.y + categoryHeight;

  // 하위 메모들의 경계 포함
  childMemos.forEach(memo => {
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
  const finalArea = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
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

/**
 * 겹침에 따라 밀어낼 방향과 거리 계산
 */
export function calculatePushDirection(
  pushedArea: CategoryArea,
  pusherArea: CategoryArea
): { x: number; y: number } {
  const overlap = calculateOverlap(pushedArea, pusherArea);

  if (overlap.x === 0 || overlap.y === 0) {
    return { x: 0, y: 0 };
  }

  // 짧은 쪽 방향으로만 밀기
  if (overlap.x < overlap.y) {
    const pushX = pushedArea.x < pusherArea.x ? -overlap.x : overlap.x;
    return { x: pushX, y: 0 };
  } else {
    const pushY = pushedArea.y < pusherArea.y ? -overlap.y : overlap.y;
    return { x: 0, y: pushY };
  }
}
