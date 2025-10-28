import { CategoryBlock, MemoBlock, Page } from '../types';

/**
 * 카테고리 계층 관련 유틸리티 함수들
 * 부모-자식 관계 설정, 검증, 순회 등을 처리
 */

/**
 * 카테고리가 다른 카테고리의 조상(부모, 조부모 등)인지 확인
 * 순환 참조 방지를 위해 사용
 */
export function isAncestor(
  potentialAncestorId: string,
  categoryId: string,
  categories: CategoryBlock[]
): boolean {
  let currentId: string | undefined = categoryId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // 순환 참조 감지
      return false;
    }
    visited.add(currentId);

    if (currentId === potentialAncestorId) {
      return true;
    }

    const category = categories.find(c => c.id === currentId);
    currentId = category?.parentId;
  }

  return false;
}

/**
 * 카테고리에 다른 카테고리를 자식으로 추가할 수 있는지 검증
 * - 순환 참조 방지
 * - 이미 자식인 경우 제외
 */
export function canAddCategoryAsChild(
  parentId: string,
  childId: string,
  categories: CategoryBlock[]
): boolean {
  // 자기 자신을 자식으로 추가 불가
  if (parentId === childId) {
    return false;
  }

  // 자식이 부모의 조상이면 순환 참조 발생 (불가)
  if (isAncestor(childId, parentId, categories)) {
    return false;
  }

  // 이미 자식인 경우
  const parent = categories.find(c => c.id === parentId);
  if (parent?.children.includes(childId)) {
    return false;
  }

  return true;
}

/**
 * 카테고리를 다른 카테고리의 하위로 추가
 * 기존 부모에서 제거하고 새 부모에 추가
 */
export function addCategoryToParent(
  childCategoryId: string,
  parentCategoryId: string,
  categories: CategoryBlock[]
): CategoryBlock[] {
  if (!canAddCategoryAsChild(parentCategoryId, childCategoryId, categories)) {
    return categories;
  }

  return categories.map(category => {
    // 기존 부모에서 제거
    if (category.children.includes(childCategoryId)) {
      return {
        ...category,
        children: category.children.filter(id => id !== childCategoryId)
      };
    }

    // 새 부모에 추가
    if (category.id === parentCategoryId) {
      return {
        ...category,
        children: [...category.children, childCategoryId],
        isExpanded: true // 자식 추가 시 자동 확장
      };
    }

    // 자식 카테고리의 parentId 업데이트
    if (category.id === childCategoryId) {
      return {
        ...category,
        parentId: parentCategoryId
      };
    }

    return category;
  });
}

/**
 * 카테고리를 부모에서 제거 (최상위 레벨로 이동)
 */
export function removeCategoryFromParent(
  categoryId: string,
  categories: CategoryBlock[]
): CategoryBlock[] {
  return categories.map(category => {
    // 부모에서 자식 목록 제거
    if (category.children.includes(categoryId)) {
      return {
        ...category,
        children: category.children.filter(id => id !== categoryId)
      };
    }

    // 자식 카테고리의 parentId 제거
    if (category.id === categoryId) {
      return {
        ...category,
        parentId: undefined
      };
    }

    return category;
  });
}

/**
 * 메모를 카테고리에 추가
 */
export function addMemoToCategory(
  memoId: string,
  categoryId: string,
  categories: CategoryBlock[]
): CategoryBlock[] {
  return categories.map(category => {
    // 기존 부모에서 제거
    if (category.children.includes(memoId)) {
      return {
        ...category,
        children: category.children.filter(id => id !== memoId)
      };
    }

    // 새 부모에 추가
    if (category.id === categoryId) {
      return {
        ...category,
        children: [...category.children, memoId],
        isExpanded: true // 자식 추가 시 자동 확장
      };
    }

    return category;
  });
}

/**
 * 메모를 카테고리에서 제거
 */
export function removeMemoFromCategory(
  memoId: string,
  categories: CategoryBlock[]
): CategoryBlock[] {
  return categories.map(category => {
    if (category.children.includes(memoId)) {
      return {
        ...category,
        children: category.children.filter(id => id !== memoId)
      };
    }
    return category;
  });
}

/**
 * 카테고리의 모든 하위 메모 ID 가져오기 (재귀적)
 */
export function getAllChildMemoIds(
  categoryId: string,
  page: Page,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(categoryId)) {
    return [];
  }
  visited.add(categoryId);

  const category = page.categories?.find(c => c.id === categoryId);
  if (!category) {
    return [];
  }

  const memoIds: string[] = [];

  category.children.forEach(childId => {
    const childMemo = page.memos.find(m => m.id === childId);
    const childCategory = page.categories?.find(c => c.id === childId);

    if (childMemo) {
      memoIds.push(childId);
    } else if (childCategory) {
      // 재귀적으로 하위 카테고리의 메모들도 가져오기
      memoIds.push(...getAllChildMemoIds(childId, page, visited));
    }
  });

  return memoIds;
}

/**
 * 카테고리의 모든 하위 카테고리 ID 가져오기 (재귀적)
 */
export function getAllChildCategoryIds(
  categoryId: string,
  page: Page,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(categoryId)) {
    return [];
  }
  visited.add(categoryId);

  const category = page.categories?.find(c => c.id === categoryId);
  if (!category) {
    return [];
  }

  const categoryIds: string[] = [];

  category.children.forEach(childId => {
    const childCategory = page.categories?.find(c => c.id === childId);

    if (childCategory) {
      categoryIds.push(childId);
      // 재귀적으로 하위 카테고리들도 가져오기
      categoryIds.push(...getAllChildCategoryIds(childId, page, visited));
    }
  });

  return categoryIds;
}

/**
 * 두 카테고리가 부모-자식 관계인지 확인
 */
export function isParentChild(
  categoryId1: string,
  categoryId2: string,
  categories: CategoryBlock[]
): boolean {
  return isAncestor(categoryId1, categoryId2, categories) ||
         isAncestor(categoryId2, categoryId1, categories);
}

/**
 * 카테고리의 부모 카테고리 찾기
 */
export function getParentCategory(
  categoryId: string,
  categories: CategoryBlock[]
): CategoryBlock | undefined {
  const category = categories.find(c => c.id === categoryId);
  if (!category || !category.parentId) return undefined;
  return categories.find(c => c.id === category.parentId);
}

/**
 * 카테고리의 직접 하위 메모들만 가져오기
 */
export function getDirectChildMemos(
  categoryId: string,
  page: Page
): MemoBlock[] {
  const category = page.categories?.find(c => c.id === categoryId);
  if (!category) {
    return [];
  }

  return page.memos.filter(memo => category.children.includes(memo.id));
}

/**
 * 카테고리의 직접 하위 카테고리들만 가져오기
 */
export function getDirectChildCategories(
  categoryId: string,
  page: Page
): CategoryBlock[] {
  const category = page.categories?.find(c => c.id === categoryId);
  if (!category) {
    return [];
  }

  return (page.categories || []).filter(cat => category.children.includes(cat.id));
}

/**
 * 메모나 카테고리가 접힌(collapsed) 카테고리 안에 있는지 확인
 * 부모 카테고리 체인을 따라가며 isExpanded가 false인 카테고리가 있으면 true 반환
 */
export function isInsideCollapsedCategory(
  itemId: string,
  page: Page
): boolean {
  // 메모인지 카테고리인지 확인
  const memo = page.memos.find(m => m.id === itemId);
  const category = page.categories?.find(c => c.id === itemId);

  if (!memo && !category) {
    return false;
  }

  // 부모 카테고리 ID 찾기
  let parentId: string | undefined;

  if (memo) {
    // 메모의 부모는 categories에서 children에 이 메모 ID가 포함된 카테고리
    const parentCategory = page.categories?.find(c => c.children.includes(itemId));
    parentId = parentCategory?.id;
  } else if (category) {
    // 카테고리의 부모는 parentId 필드
    parentId = category.parentId;
  }

  // 부모 카테고리 체인을 따라 올라가며 접힌 카테고리가 있는지 확인
  const visited = new Set<string>();

  while (parentId) {
    if (visited.has(parentId)) {
      // 순환 참조 방지
      break;
    }
    visited.add(parentId);

    const parentCategory = page.categories?.find(c => c.id === parentId);

    if (!parentCategory) {
      break;
    }

    // 부모 카테고리가 접혀있으면 true 반환
    if (!parentCategory.isExpanded) {
      return true;
    }

    // 다음 부모로 이동
    parentId = parentCategory.parentId;
  }

  return false;
}

/**
 * 부모-자식 관계 변경으로 인해 제거해야 할 연결선을 찾아 제거
 *
 * 규칙:
 * - 메모/카테고리가 다른 메모/카테고리의 하위로 들어가면, 서로 간의 연결선 제거
 * - 재귀적으로 모든 조상-후손 관계를 확인
 *
 * @param page - 현재 페이지 데이터
 * @param movedItemId - 이동된 아이템(메모 또는 카테고리) ID
 * @param newParentId - 새로운 부모 카테고리 ID (undefined면 최상위로 이동)
 * @returns 연결선이 제거된 페이지 데이터
 */
export function removeInvalidConnectionsAfterHierarchyChange(
  page: Page,
  movedItemId: string,
  newParentId: string | undefined
): Page {
  if (!newParentId) {
    // 최상위로 이동한 경우 연결선 제거 불필요
    return page;
  }

  // 이동된 아이템의 모든 조상 카테고리 ID 수집
  const ancestorIds = new Set<string>();
  let currentParentId: string | undefined = newParentId;
  const visited = new Set<string>();

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      break; // 순환 참조 방지
    }
    visited.add(currentParentId);
    ancestorIds.add(currentParentId);

    const parentCategory = page.categories?.find(c => c.id === currentParentId);
    currentParentId = parentCategory?.parentId;
  }

  // 메모 연결선 제거
  const updatedMemos = page.memos.map(memo => {
    if (memo.id === movedItemId) {
      // 이동된 메모의 연결선 중 조상 카테고리와 연결된 것들 제거
      return {
        ...memo,
        connections: memo.connections.filter(connId => !ancestorIds.has(connId))
      };
    }

    // 조상 카테고리들의 연결선 중 이동된 메모와 연결된 것들 제거
    if (ancestorIds.has(memo.id)) {
      return {
        ...memo,
        connections: memo.connections.filter(connId => connId !== movedItemId)
      };
    }

    return memo;
  });

  // 카테고리 연결선 제거
  const updatedCategories = (page.categories || []).map(category => {
    if (category.id === movedItemId) {
      // 이동된 카테고리의 연결선 중 조상 카테고리와 연결된 것들 제거
      return {
        ...category,
        connections: category.connections.filter(connId => !ancestorIds.has(connId))
      };
    }

    // 조상 카테고리들의 연결선 중 이동된 카테고리와 연결된 것들 제거
    if (ancestorIds.has(category.id)) {
      return {
        ...category,
        connections: category.connections.filter(connId => connId !== movedItemId)
      };
    }

    return category;
  });

  return {
    ...page,
    memos: updatedMemos,
    categories: updatedCategories
  };
}
