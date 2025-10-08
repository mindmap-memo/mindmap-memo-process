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
