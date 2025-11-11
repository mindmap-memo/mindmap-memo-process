import React from 'react';

/**
 * useConnectionPoints
 *
 * 연결점 계산 로직을 담당하는 훅
 *
 * **주요 기능:**
 * - 블록(메모/카테고리)의 상하좌우 중심점 계산
 * - 카테고리 영역 정보를 고려한 연결점 계산
 *
 * @param renderedCategoryAreas - 렌더링된 카테고리 영역 정보
 * @returns 연결점 계산 함수들
 */

interface UseConnectionPointsParams {
  renderedCategoryAreas: React.MutableRefObject<{
    [categoryId: string]: { x: number; y: number; width: number; height: number };
  }>;
  canvasScale: number;
}

export const useConnectionPoints = ({ renderedCategoryAreas, canvasScale }: UseConnectionPointsParams) => {
  /**
   * 블록의 상하좌우 중심점을 반환합니다.
   * DOM 요소의 실제 크기를 측정하여 연결점을 계산합니다.
   */
  const getBlockConnectionPoints = React.useCallback((item: any) => {
    // DOM에서 실제 렌더링된 크기를 측정
    const element = document.querySelector(`[data-memo-id="${item.id}"]`) || document.querySelector(`[data-category-id="${item.id}"]`);

    let width, height;

    if (element) {
      const rect = element.getBoundingClientRect();
      // 실제 DOM 크기를 현재 scale로 나누어 논리적 크기 계산
      width = rect.width / canvasScale;
      height = rect.height / canvasScale;
    } else {
      // DOM 요소를 찾을 수 없으면 기본값 사용 (Math.min으로 캡핑)
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 300;
      width = Math.min(item.size?.width || 200, MAX_WIDTH);
      height = Math.min(item.size?.height || 95, MAX_HEIGHT);
    }

    return {
      top: {
        x: item.position.x + width / 2,
        y: item.position.y
      },
      bottom: {
        x: item.position.x + width / 2,
        y: item.position.y + height
      },
      left: {
        x: item.position.x,
        y: item.position.y + height / 2
      },
      right: {
        x: item.position.x + width,
        y: item.position.y + height / 2
      }
    };
  }, [canvasScale]);

  /**
   * 연결점 계산 (카테고리 영역 정보 고려)
   * 카테고리의 경우 렌더링된 영역 정보를 우선 사용하고,
   * 없으면 블록 기준으로 계산합니다.
   */
  const getConnectionPoints = React.useCallback((item: any) => {
    // 카테고리인 경우 렌더링된 영역 정보를 우선 사용
    if ('isExpanded' in item && renderedCategoryAreas.current[item.id]) {
      const area = renderedCategoryAreas.current[item.id];
      return {
        top: {
          x: area.x + area.width / 2,
          y: area.y
        },
        bottom: {
          x: area.x + area.width / 2,
          y: area.y + area.height
        },
        left: {
          x: area.x,
          y: area.y + area.height / 2
        },
        right: {
          x: area.x + area.width,
          y: area.y + area.height / 2
        }
      };
    }

    // 메모 또는 영역이 없는 카테고리: 기존 블록 기준 계산 사용
    return getBlockConnectionPoints(item);
  }, [getBlockConnectionPoints, renderedCategoryAreas]);

  return {
    getBlockConnectionPoints,
    getConnectionPoints
  };
};
