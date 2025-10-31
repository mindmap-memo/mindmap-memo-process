import React from 'react';
import { Page, CategoryBlock } from '../../../types';

/**
 * useCategoryHandlers
 *
 * 카테고리 관련 드래그 & 드롭 핸들러
 * - 카테고리 위치 변경 시작/종료
 * - 카테고리 블록/영역에 드롭 처리
 */

interface UseCategoryHandlersParams {
  currentPage: Page | undefined;
  draggedCategoryAreas: {
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  };
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>>;
  calculateCategoryAreaWithColor: (category: CategoryBlock, visited?: Set<string>, excludeCategoryId?: string) => any;
  recentlyDraggedCategoryRef: React.MutableRefObject<string | null>;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onCategoryDragStart?: () => void;
  onCategoryDragEnd?: () => void;
  onMoveToCategory: (itemId: string, categoryId: string | null) => void;
}

export const useCategoryHandlers = (params: UseCategoryHandlersParams) => {
  const {
    currentPage,
    draggedCategoryAreas,
    setDraggedCategoryAreas,
    calculateCategoryAreaWithColor,
    recentlyDraggedCategoryRef,
    onCategoryPositionDragEnd,
    onCategoryDragStart,
    onCategoryDragEnd,
    onMoveToCategory
  } = params;

  /**
   * 카테고리 위치 변경 시작 (드래그 시작)
   */
  const handleCategoryPositionStart = React.useCallback((categoryId: string) => {
    const category = currentPage?.categories?.find(cat => cat.id === categoryId);
    if (category) {
      // 캐시가 없을 때만 새로 계산 (있으면 기존 캐시 유지)
      if (!draggedCategoryAreas[categoryId]) {
        const currentArea = calculateCategoryAreaWithColor(category);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: category.position.x, y: category.position.y }
            }
          }));
        }
      }
    }
  }, [currentPage, draggedCategoryAreas, calculateCategoryAreaWithColor, setDraggedCategoryAreas]);

  /**
   * 카테고리 위치 변경 종료 (드래그 종료)
   */
  const handleCategoryPositionEnd = React.useCallback((categoryId: string, finalPosition: { x: number; y: number }) => {
    // 최근 드래그한 카테고리 저장 (영역 계산 로그용)
    recentlyDraggedCategoryRef.current = categoryId;

    // App에서 캐시 제거 처리 (state 업데이트 후 자연스럽게 재계산)
    onCategoryPositionDragEnd?.(categoryId, finalPosition);

    // Canvas 로컬 캐시는 약간의 딜레이 후 제거 (React 리렌더링 대기)
    setTimeout(() => {
      setDraggedCategoryAreas(prev => {
        const newAreas = { ...prev };
        delete newAreas[categoryId];
        return newAreas;
      });

      // 로그 추적 종료 (1초 후)
      setTimeout(() => {
        if (recentlyDraggedCategoryRef.current === categoryId) {
          recentlyDraggedCategoryRef.current = null;
        }
      }, 1000);
    }, 50); // 50ms 후 캐시 제거
  }, [draggedCategoryAreas, onCategoryPositionDragEnd, setDraggedCategoryAreas, recentlyDraggedCategoryRef]);

  /**
   * 기존 카테고리 드래그 핸들러들 (실제로는 사용되지 않음 - 마우스 이벤트로 처리)
   */
  const handleCategoryDragStart = React.useCallback((e: React.DragEvent) => {
    onCategoryDragStart?.();
  }, [onCategoryDragStart]);

  const handleCategoryDragEnd = React.useCallback((e: React.DragEvent) => {
    onCategoryDragEnd?.();
  }, [onCategoryDragEnd]);

  const handleCategoryDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * 카테고리 블록에 드롭 핸들러
   */
  const handleDropOnCategory = React.useCallback((e: React.DragEvent, categoryId: string) => {
    e.preventDefault();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('드롭 처리 중 오류:', error);
    }
  }, [onMoveToCategory, setDraggedCategoryAreas]);

  /**
   * 카테고리 영역 드래그 오버 핸들러
   */
  const handleCategoryAreaDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 영역에 추가적인 드래그 오버 효과를 줄 수 있음 (현재는 기본)
  }, []);

  /**
   * 카테고리 영역에 드롭 핸들러
   */
  const handleDropOnCategoryArea = React.useCallback((e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리 영역에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('카테고리 영역 드롭 처리 중 오류:', error);
    }
  }, [onMoveToCategory, setDraggedCategoryAreas]);

  return {
    handleCategoryPositionStart,
    handleCategoryPositionEnd,
    handleCategoryDragStart,
    handleCategoryDragEnd,
    handleCategoryDragOver,
    handleDropOnCategory,
    handleCategoryAreaDragOver,
    handleDropOnCategoryArea
  };
};
