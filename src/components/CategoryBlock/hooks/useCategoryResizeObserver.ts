import React from 'react';
import { CategoryBlock } from '../../../types';

interface UseCategoryResizeObserverProps {
  category: CategoryBlock;
  categoryRef: React.RefObject<HTMLDivElement | null>;
  isDraggingPosition: boolean;
  isCategoryBeingDragged: boolean;
  isMemoBeingDragged: boolean;
  isHovered: boolean;
  isDragOver: boolean;
  canvasScale: number;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
}

export const useCategoryResizeObserver = ({
  category,
  categoryRef,
  isDraggingPosition,
  isCategoryBeingDragged,
  isMemoBeingDragged,
  isHovered,
  isDragOver,
  canvasScale,
  onSizeChange
}: UseCategoryResizeObserverProps) => {

  // ResizeObserver로 실제 크기 측정 (드래그 중에는 비활성화)
  React.useEffect(() => {
    if (!categoryRef.current || !onSizeChange) return;

    let timeoutId: NodeJS.Timeout;

    const updateSize = () => {
      // 드래그 중이거나 호버/하이라이트 중일 때는 크기 업데이트 방지
      const isCurrentlyHighlighted = isDragOver || (isMemoBeingDragged && isHovered);
      // CategoryBlock 드래그 또는 Canvas 라벨 드래그 중일 때 크기 업데이트 방지
      if (isDraggingPosition || isCategoryBeingDragged || isCurrentlyHighlighted) {
        return;
      }

      if (categoryRef.current) {
        const rect = categoryRef.current.getBoundingClientRect();
        // 0이거나 매우 작은 크기는 무시 (컴포넌트가 사라지는 중일 수 있음)
        if (rect.width < 10 || rect.height < 10) {
          return;
        }

        // scale을 나누어서 실제 논리적 크기 계산
        const newSize = {
          width: Math.round(rect.width / canvasScale),
          height: Math.round(rect.height / canvasScale)
        };

        // 크기 변화가 충분히 클 때만 업데이트 (5px 이상 차이)
        if (!category.size ||
            Math.abs(category.size.width - newSize.width) > 5 ||
            Math.abs(category.size.height - newSize.height) > 5) {
          // 디바운싱: 100ms 후에 업데이트
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            onSizeChange(category.id, newSize);
          }, 100);
        }
      }
    };

    // 초기 크기 설정을 위한 지연 실행
    timeoutId = setTimeout(updateSize, 50);

    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver 콜백도 디바운싱
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 100);
    });

    if (categoryRef.current) {
      resizeObserver.observe(categoryRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [category.id, category.title, category.tags, category.children, onSizeChange, canvasScale, isDraggingPosition, isMemoBeingDragged, isHovered, isDragOver, isCategoryBeingDragged, categoryRef]);
};
