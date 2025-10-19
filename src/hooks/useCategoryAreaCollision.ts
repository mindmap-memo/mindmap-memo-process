import { useEffect, useRef } from 'react';
import { Page } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';
import { resolveAreaCollisions } from '../utils/collisionUtils';

/**
 * useCategoryAreaCollision
 *
 * 카테고리 영역이 변경될 때마다 실시간으로 충돌 검사를 실행하는 커스텀 훅입니다.
 *
 * **작동 원리:**
 * - 각 카테고리의 영역 크기와 위치를 추적
 * - 영역 크기/위치가 변경되면 즉시 충돌 검사 실행
 * - 실시간으로 다른 영역과 메모를 밀어냄
 *
 * **영역 크기/위치가 변경되는 경우:**
 * - 하위 메모 추가/삭제/이동
 * - 하위 카테고리 추가/삭제/이동
 * - 카테고리 블록 크기 변경 (태그 추가 등)
 * - 카테고리 확장/축소
 *
 * @param props - pages, setPages, currentPageId 등
 */

interface UseCategoryAreaCollisionProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  isDraggingMemo: boolean;
  isDraggingCategory: boolean;
}

export const useCategoryAreaCollision = (props: UseCategoryAreaCollisionProps) => {
  const {
    pages,
    setPages,
    currentPageId,
    isDraggingMemo,
    isDraggingCategory
  } = props;

  // 이전 영역 크기와 위치 추적 (카테고리 ID -> 영역 정보)
  const previousAreas = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  // 충돌 검사 실행 중 플래그 (재귀 방지)
  const isCollisionCheckRunning = useRef(false);

  useEffect(() => {
    // 드래그 중에는 실행하지 않음 (드래그는 별도 처리)
    if (isDraggingMemo || isDraggingCategory) return;

    // 충돌 검사 실행 중에는 재귀 방지
    if (isCollisionCheckRunning.current) return;

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return;

    // 영역이 변경된 카테고리 찾기
    const changedCategories: string[] = [];

    // 부모 카테고리를 찾는 함수
    const getAllParents = (categoryId: string): string[] => {
      const parents: string[] = [];
      let currentCat = currentPage.categories?.find(c => c.id === categoryId);
      while (currentCat?.parentId) {
        parents.push(currentCat.parentId);
        currentCat = currentPage.categories?.find(c => c.id === currentCat!.parentId);
      }
      return parents;
    };

    for (const category of currentPage.categories) {
      // 확장되지 않은 카테고리는 영역이 없으므로 스킵
      if (!category.isExpanded) continue;

      const area = calculateCategoryArea(category, currentPage);
      if (!area) continue;

      const prevArea = previousAreas.current.get(category.id);

      // 이전 영역이 없거나 크기/위치가 변경된 경우
      if (!prevArea ||
          prevArea.x !== area.x ||
          prevArea.y !== area.y ||
          prevArea.width !== area.width ||
          prevArea.height !== area.height) {
        changedCategories.push(category.id);

        // 부모 영역도 변경되었으므로 함께 추가
        const parents = getAllParents(category.id);
        parents.forEach(parentId => {
          if (!changedCategories.includes(parentId)) {
            changedCategories.push(parentId);
          }
          // 부모 영역의 이전 영역도 업데이트
          const parentCat = currentPage.categories?.find(c => c.id === parentId);
          if (parentCat?.isExpanded) {
            const parentArea = calculateCategoryArea(parentCat, currentPage);
            if (parentArea) {
              previousAreas.current.set(parentId, {
                x: parentArea.x,
                y: parentArea.y,
                width: parentArea.width,
                height: parentArea.height
              });
            }
          }
        });

        previousAreas.current.set(category.id, {
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height
        });
      }
    }

    // 영역이 변경된 카테고리가 있으면 즉시 충돌 검사 실행 (쓰로틀링 제거)
    if (changedCategories.length > 0) {
      isCollisionCheckRunning.current = true;

      // 각 변경된 카테고리에 대해 충돌 검사
      let updatedPage = { ...currentPage };

      for (const categoryId of changedCategories) {
        const result = resolveAreaCollisions(categoryId, updatedPage);
        updatedPage = {
          ...updatedPage,
          categories: result.updatedCategories,
          memos: result.updatedMemos
        };
      }

      // 페이지 업데이트
      setPages(prev => prev.map(page =>
        page.id === currentPageId ? updatedPage : page
      ));

      // 충돌 검사 완료 후 플래그 리셋
      requestAnimationFrame(() => {
        isCollisionCheckRunning.current = false;
      });
    }
  }, [pages, currentPageId, isDraggingMemo, isDraggingCategory, setPages]);

  // 컴포넌트 언마운트 시 캐시 정리
  useEffect(() => {
    return () => {
      previousAreas.current.clear();
    };
  }, []);
};
