import React from 'react';
import { Page, CategoryBlock } from '../../../types';
import { calculateCategoryArea } from '../../../utils/categoryAreaUtils';

/**
 * useCategoryAreaColors
 *
 * 카테고리 영역 색상 관련 로직을 담당하는 훅
 *
 * **주요 기능:**
 * - 카테고리 ID 해시를 통한 일관된 색상 생성
 * - 카테고리 영역 계산 및 색상 추가
 * - 하위 카테고리 판별
 *
 * @param params - 필요한 매개변수
 * @returns 색상 및 영역 계산 함수들
 */

interface UseCategoryAreaColorsParams {
  currentPage: Page | undefined;
  areaUpdateTrigger: number;
  recentlyDraggedCategoryRef: React.MutableRefObject<string | null>;
}

export const useCategoryAreaColors = ({
  currentPage,
  areaUpdateTrigger,
  recentlyDraggedCategoryRef
}: UseCategoryAreaColorsParams) => {
  /**
   * 카테고리 영역 색상 생성
   * 카테고리 ID를 해시하여 일관된 색상을 반환합니다.
   */
  const getCategoryAreaColor = React.useCallback((categoryId: string): string => {
    const colors = [
      'rgba(59, 130, 246, 0.15)',   // 파란색
      'rgba(16, 185, 129, 0.15)',   // 초록색
      'rgba(245, 101, 101, 0.15)',  // 빨간색
      'rgba(139, 92, 246, 0.15)',   // 보라색
      'rgba(245, 158, 11, 0.15)',   // 노란색
      'rgba(236, 72, 153, 0.15)',   // 핑크색
      'rgba(20, 184, 166, 0.15)',   // 청록색
      'rgba(251, 146, 60, 0.15)',   // 오렌지색
    ];

    // 카테고리 ID를 해시하여 일관된 색상 선택
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
      hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  /**
   * 카테고리 영역 계산 (색상 포함)
   * utils의 calculateCategoryArea를 호출하고 색상을 추가합니다.
   */
  const calculateCategoryAreaWithColor = React.useCallback((
    category: CategoryBlock,
    visited: Set<string> = new Set(),
    excludeCategoryId?: string
  ) => {
    if (!currentPage) return null;

    // Shift 드래그 중일 때 드래그 중인 카테고리를 제외한 페이지 데이터 생성
    let pageForCalculation = currentPage;
    if (excludeCategoryId) {
      pageForCalculation = {
        ...currentPage,
        categories: currentPage.categories?.filter(cat => cat.id !== excludeCategoryId) || []
      };
    }

    const area = calculateCategoryArea(category, pageForCalculation, visited);
    if (!area) return null;

    return {
      ...area,
      color: getCategoryAreaColor(category.id)
    };
  }, [currentPage, areaUpdateTrigger, getCategoryAreaColor, recentlyDraggedCategoryRef]);

  /**
   * 카테고리가 다른 카테고리의 하위인지 확인
   */
  const isDescendantOf = React.useCallback((categoryId: string, ancestorId: string): boolean => {
    if (!currentPage?.categories) return false;

    let current = currentPage.categories.find(c => c.id === categoryId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = currentPage.categories.find(c => c.id === current!.parentId);
    }
    return false;
  }, [currentPage]);

  return {
    getCategoryAreaColor,
    calculateCategoryAreaWithColor,
    isDescendantOf
  };
};
