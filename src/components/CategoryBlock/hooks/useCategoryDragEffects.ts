import React from 'react';

interface UseCategoryDragEffectsProps {
  mouseDownPos: { x: number; y: number } | null;
  isDraggingPosition: boolean;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
}

export const useCategoryDragEffects = ({
  mouseDownPos,
  isDraggingPosition,
  handleMouseMove,
  handleMouseUp
}: UseCategoryDragEffectsProps) => {

  React.useEffect(() => {
    // 마우스 다운 상태이거나 드래그 중일 때 이벤트 리스너 등록
    if (mouseDownPos || isDraggingPosition) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [mouseDownPos, isDraggingPosition, handleMouseMove, handleMouseUp]);
};
