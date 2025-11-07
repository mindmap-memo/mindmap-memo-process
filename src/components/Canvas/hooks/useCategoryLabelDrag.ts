import { useCallback } from 'react';
import { CategoryBlock } from '../../../types';
import { DRAG_THRESHOLD } from '../../../utils/constants';

/**
 * useCategoryLabelDrag
 *
 * 카테고리 라벨 드래그 로직을 담당하는 훅
 */

interface UseCategoryLabelDragParams {
  canvasScale: number;
  canvasOffset?: { x: number; y: number };
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void;
}

export const useCategoryLabelDrag = (params: UseCategoryLabelDragParams) => {
  const {
    canvasScale,
    canvasOffset,
    onCategorySelect,
    onCategoryLabelPositionChange,
    onDetectCategoryDropForCategory
  } = params;

  /**
   * 마우스 드래그 핸들러 생성
   */
  const createMouseDragHandler = useCallback((
    category: CategoryBlock,
    isShiftPressed: boolean
  ) => {
    return (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.stopPropagation();

      let startX = e.clientX;
      let startY = e.clientY;
      const originalLabelPosition = { x: category.position.x, y: category.position.y };
      let hasMoved = false;
      let isDragging = false;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // 임계값 확인
        if (!isDragging) {
          const distance = Math.sqrt(
            Math.pow(moveEvent.clientX - startX, 2) +
            Math.pow(moveEvent.clientY - startY, 2)
          );

          if (distance >= DRAG_THRESHOLD) {
            isDragging = true;
            hasMoved = true;
            onCategorySelect(category.id);
          }
        }

        if (!isDragging) return;

        hasMoved = true;

        const deltaX = (moveEvent.clientX - startX) / canvasScale;
        const deltaY = (moveEvent.clientY - startY) / canvasScale;

        const newLabelPosition = {
          x: originalLabelPosition.x + deltaX,
          y: originalLabelPosition.y + deltaY
        };

        onCategoryLabelPositionChange(category.id, newLabelPosition);
      };

      const handleMouseUp = (upEvent?: MouseEvent) => {
        // 드래그가 발생하지 않았을 때: 클릭으로 처리
        if (!hasMoved && !isDragging) {
          onCategorySelect(category.id);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('mouseleave', handleMouseLeave);
          return;
        }

        isDragging = false;

        // Shift+드래그면 카테고리 드롭 감지 호출
        const wasShiftPressed = upEvent?.shiftKey || isShiftPressed;

        if (hasMoved && wasShiftPressed) {
          // 마우스 포인터의 실제 위치 계산
          const canvasElement = document.getElementById('main-canvas');
          let mousePointerPosition = {
            x: originalLabelPosition.x + ((upEvent?.clientX || startX) - startX) / canvasScale,
            y: originalLabelPosition.y + ((upEvent?.clientY || startY) - startY) / canvasScale
          };

          if (canvasElement && canvasOffset && upEvent) {
            const rect = canvasElement.getBoundingClientRect();
            const clientX = upEvent.clientX;
            const clientY = upEvent.clientY;

            const mouseX = (clientX - rect.left - canvasOffset.x) / canvasScale;
            const mouseY = (clientY - rect.top - canvasOffset.y) / canvasScale;

            mousePointerPosition = { x: mouseX, y: mouseY };
          }

          onDetectCategoryDropForCategory?.(category.id, mousePointerPosition);
        }

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      const handleMouseLeave = () => {
        if (isDragging) {
          isDragging = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('mouseleave', handleMouseLeave);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseLeave);
      e.preventDefault();
    };
  }, [canvasScale, canvasOffset, onCategorySelect, onCategoryLabelPositionChange, onDetectCategoryDropForCategory]);

  /**
   * 터치 드래그 핸들러 생성
   */
  const createTouchDragHandler = useCallback((
    category: CategoryBlock,
    isShiftPressed: boolean
  ) => {
    return (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      e.stopPropagation();

      const touch = e.touches[0];
      let startX = touch.clientX;
      let startY = touch.clientY;
      const originalLabelPosition = { x: category.position.x, y: category.position.y };
      let hasMoved = false;
      let isDragging = false;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return;

        const touch = moveEvent.touches[0];
        const distance = Math.sqrt(
          Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2)
        );

        if (!isDragging && distance >= DRAG_THRESHOLD) {
          isDragging = true;
          hasMoved = true;
          onCategorySelect(category.id);
        }

        if (!isDragging) return;

        const deltaX = (touch.clientX - startX) / canvasScale;
        const deltaY = (touch.clientY - startY) / canvasScale;

        const newLabelPosition = {
          x: originalLabelPosition.x + deltaX,
          y: originalLabelPosition.y + deltaY
        };

        onCategoryLabelPositionChange(category.id, newLabelPosition);
        moveEvent.preventDefault();
      };

      const handleTouchEnd = (upEvent?: TouchEvent) => {
        if (!hasMoved && !isDragging) {
          // 싱글탭은 부모에서 처리 (더블탭 감지 로직)
        }

        isDragging = false;

        const wasShiftPressed = isShiftPressed;

        if (hasMoved && wasShiftPressed && upEvent?.changedTouches.length) {
          const touch = upEvent.changedTouches[0];
          const canvasElement = document.getElementById('main-canvas');
          let touchPointerPosition = {
            x: originalLabelPosition.x + (touch.clientX - startX) / canvasScale,
            y: originalLabelPosition.y + (touch.clientY - startY) / canvasScale
          };

          if (canvasElement && canvasOffset) {
            const rect = canvasElement.getBoundingClientRect();
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            const touchX = (clientX - rect.left - canvasOffset.x) / canvasScale;
            const touchY = (clientY - rect.top - canvasOffset.y) / canvasScale;

            touchPointerPosition = { x: touchX, y: touchY };
          }

          onDetectCategoryDropForCategory?.(category.id, touchPointerPosition);
        }

        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    };
  }, [canvasScale, canvasOffset, onCategorySelect, onCategoryLabelPositionChange, onDetectCategoryDropForCategory]);

  return {
    createMouseDragHandler,
    createTouchDragHandler
  };
};
