import React from 'react';
import { CategoryBlock } from '../../../types';

interface UseCategoryDragHandlersProps {
  category: CategoryBlock;
  isEditing: boolean;
  isConnecting: boolean;
  mouseDownPos: { x: number; y: number } | null;
  isDraggingRef: React.MutableRefObject<boolean>;
  dragStart: { x: number; y: number };
  dragMoved: boolean;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  pendingPosition: React.MutableRefObject<{ x: number; y: number } | null>;
  lastUpdateTime: React.MutableRefObject<number>;
  setMouseDownPos: (value: { x: number; y: number } | null) => void;
  setDragMoved: (value: boolean) => void;
  setDragStart: (value: { x: number; y: number }) => void;
  setIsDraggingPosition: (value: boolean) => void;
  onClick?: (categoryId: string, isShiftClick?: boolean) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
}

const DRAG_THRESHOLD = 5;

export const useCategoryDragHandlers = ({
  category,
  isEditing,
  isConnecting,
  mouseDownPos,
  isDraggingRef,
  dragStart,
  dragMoved,
  canvasScale,
  canvasOffset,
  pendingPosition,
  lastUpdateTime,
  setMouseDownPos,
  setDragMoved,
  setDragStart,
  setIsDraggingPosition,
  onClick,
  onDragStart,
  onDragEnd,
  onPositionChange,
  onPositionDragEnd
}: UseCategoryDragHandlersProps) => {

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting && !isEditing) {
      // Shift 클릭 시 다중 선택
      if (e.shiftKey) {
        onClick?.(category.id, true);
        e.preventDefault();
        return;
      }

      // 마우스 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: e.clientX, y: e.clientY });
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (category.position.x * canvasScale + canvasOffset.x),
        y: e.clientY - (category.position.y * canvasScale + canvasOffset.y)
      });
      e.preventDefault(); // 기본 드래그 동작 방지
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    // 마우스 다운 후 드래그 임계값 확인
    if (mouseDownPos && !isDraggingRef.current) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      // 임계값을 넘으면 드래그 시작
      if (distance >= DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        setIsDraggingPosition(true);
        onClick?.(category.id, false); // 드래그 시작 시 선택
        onDragStart?.(e as any); // App.tsx에 드래그 시작 알림
      }
    }

    // ref를 사용한 즉시 체크로 드래그 종료 후 이벤트 무시
    if (!isDraggingRef.current) {
      return;
    }

    if (onPositionChange) {
      if (!dragMoved) {
        setDragMoved(true);
      }

      // MemoBlock과 동일한 방식으로 canvasScale과 canvasOffset 고려
      const newPosition = {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 빠른 드래그 시 업데이트 빈도 조절 (50ms마다만 업데이트)
      const now = Date.now();
      pendingPosition.current = newPosition;

      if (now - lastUpdateTime.current >= 50) {
        onPositionChange(category.id, newPosition);
        lastUpdateTime.current = now;
      }
    }
  }, [onPositionChange, dragMoved, dragStart, canvasOffset, canvasScale, category.id, mouseDownPos, onClick, onDragStart, isDraggingRef, setDragMoved, setIsDraggingPosition, pendingPosition, lastUpdateTime]);

  const handleMouseUp = React.useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      // ref를 즉시 false로 설정하여 추가 mousemove 이벤트 무시
      isDraggingRef.current = false;

      // 최종 위치 계산
      const finalPosition = pendingPosition.current || {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 드래그 종료 콜백 호출 (최종 위치 전달)
      onPositionDragEnd?.(category.id, finalPosition);

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDraggingPosition(false);
    setMouseDownPos(null);
    onDragEnd?.(e as any); // App.tsx에 드래그 종료 알림
  }, [onPositionDragEnd, category.id, onDragEnd, dragStart, canvasOffset, canvasScale, isDraggingRef, pendingPosition, lastUpdateTime, setIsDraggingPosition, setMouseDownPos]);

  const handleClick = (e: React.MouseEvent) => {
    // MemoBlock과 동일하게 dragMoved만 체크 (isConnectionDragging 제거)
    if (!dragMoved && !isEditing) {
      onClick?.(category.id, e.shiftKey);
    }
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick
  };
};
