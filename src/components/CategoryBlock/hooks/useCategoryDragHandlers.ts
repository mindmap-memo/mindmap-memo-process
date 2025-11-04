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
  lastTapTimeRef: React.MutableRefObject<number>;
  setMouseDownPos: (value: { x: number; y: number } | null) => void;
  setDragMoved: (value: boolean) => void;
  setDragStart: (value: { x: number; y: number }) => void;
  setIsDraggingPosition: (value: boolean) => void;
  onClick?: (categoryId: string, isShiftClick?: boolean) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onOpenEditor?: () => void;
}

const DRAG_THRESHOLD = 5;
const DOUBLE_TAP_DELAY = 300;

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
  lastTapTimeRef,
  setMouseDownPos,
  setDragMoved,
  setDragStart,
  setIsDraggingPosition,
  onClick,
  onDragStart,
  onDragEnd,
  onPositionChange,
  onPositionDragEnd,
  onOpenEditor
}: UseCategoryDragHandlersProps) => {

  const handleMouseDown = (e: React.MouseEvent) => {
    // 캔버스의 드래그 선택이 시작되지 않도록 이벤트 전파 중단
    e.stopPropagation();

    if (e.button === 0 && !isConnecting && !isEditing) {
      // Shift 클릭 시 다중 선택
      if (e.shiftKey) {
        onClick?.(category.id, true);
        e.preventDefault();
        return;
      }

      // 마우스 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: e.clientX, y: e.clientY }); // 버그 수정: y 좌표도 올바르게 저장
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (category.position.x * canvasScale + canvasOffset.x),
        y: e.clientY - (category.position.y * canvasScale + canvasOffset.y)
      });
      e.preventDefault(); // 기본 드래그 동작 방지
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('[CategoryBlock TouchStart]', { categoryId: category.id, touches: e.touches.length });

    // 캔버스의 드래그 선택이 시작되지 않도록 이벤트 전파 중단
    e.stopPropagation();

    if (!isConnecting && !isEditing && e.touches.length === 1) {
      const touch = e.touches[0];
      console.log('[CategoryBlock TouchStart] 드래그 준비 완료', { x: touch.clientX, y: touch.clientY });

      // 터치 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: touch.clientX, y: touch.clientY });
      setDragMoved(false);
      setDragStart({
        x: touch.clientX - (category.position.x * canvasScale + canvasOffset.x),
        y: touch.clientY - (category.position.y * canvasScale + canvasOffset.y)
      });
      e.preventDefault(); // 기본 터치 동작 방지
    }
  };

  const updatePosition = React.useCallback((clientX: number, clientY: number) => {
    if (onPositionChange) {
      if (!dragMoved) {
        setDragMoved(true);
      }

      // MemoBlock과 동일한 방식으로 canvasScale과 canvasOffset 고려
      const newPosition = {
        x: (clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 빠른 드래그 시 업데이트 빈도 조절 (50ms마다만 업데이트)
      const now = Date.now();
      pendingPosition.current = newPosition;

      if (now - lastUpdateTime.current >= 50) {
        onPositionChange(category.id, newPosition);
        lastUpdateTime.current = now;
      }
    }
  }, [onPositionChange, dragMoved, dragStart, canvasOffset, canvasScale, category.id, setDragMoved, pendingPosition, lastUpdateTime]);

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

    updatePosition(e.clientX, e.clientY);
  }, [mouseDownPos, onClick, onDragStart, isDraggingRef, setIsDraggingPosition, updatePosition]);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    // 터치 다운 후 드래그 임계값 확인
    if (mouseDownPos && !isDraggingRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - mouseDownPos.x, 2) +
        Math.pow(touch.clientY - mouseDownPos.y, 2)
      );

      console.log('[CategoryBlock TouchMove] 임계값 체크', { distance, threshold: DRAG_THRESHOLD });

      // 임계값을 넘으면 드래그 시작
      if (distance >= DRAG_THRESHOLD) {
        console.log('[CategoryBlock TouchMove] 드래그 시작!');
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

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      console.log('[CategoryBlock TouchMove] 위치 업데이트', { x: touch.clientX, y: touch.clientY });
      updatePosition(touch.clientX, touch.clientY);
      e.preventDefault(); // 스크롤 방지
    }
  }, [mouseDownPos, onClick, onDragStart, isDraggingRef, setIsDraggingPosition, updatePosition]);

  const finishDrag = React.useCallback((clientX: number, clientY: number, shiftKey?: boolean) => {
    if (isDraggingRef.current) {
      // ref를 즉시 false로 설정하여 추가 이벤트 무시
      isDraggingRef.current = false;

      // 최종 위치 계산
      const finalPosition = pendingPosition.current || {
        x: (clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 드래그 종료 콜백 호출 (최종 위치 전달)
      onPositionDragEnd?.(category.id, finalPosition);

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
    } else if (!dragMoved) {
      // 드래그가 발생하지 않았을 때: 카테고리 선택
      onClick?.(category.id, shiftKey || false);
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDraggingPosition(false);
    setMouseDownPos(null);
  }, [onPositionDragEnd, category.id, dragStart, canvasOffset, canvasScale, isDraggingRef, pendingPosition, lastUpdateTime, setIsDraggingPosition, setMouseDownPos, dragMoved, onClick]);

  const handleMouseUp = React.useCallback((e: MouseEvent) => {
    finishDrag(e.clientX, e.clientY, e.shiftKey);
    onDragEnd?.(e as any); // App.tsx에 드래그 종료 알림
  }, [finishDrag, onDragEnd]);

  const handleTouchEnd = React.useCallback((e: TouchEvent) => {
    // 터치가 끝날 때 마지막 터치 위치 사용
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      finishDrag(touch.clientX, touch.clientY, false);
    } else {
      finishDrag(0, 0, false); // 폴백
    }
    onDragEnd?.(e as any); // App.tsx에 드래그 종료 알림
  }, [finishDrag, onDragEnd]);

  const handleClick = (e: React.MouseEvent) => {
    // 드래그로 이동했다면 클릭 이벤트를 무시
    if (dragMoved || isEditing) return;

    // 더블탭 감지
    const currentTime = new Date().getTime();
    const tapTimeDiff = currentTime - lastTapTimeRef.current;

    if (tapTimeDiff < DOUBLE_TAP_DELAY && tapTimeDiff > 0) {
      // 더블탭: 에디터 열기
      if (onOpenEditor) {
        onOpenEditor();
      }
      lastTapTimeRef.current = 0; // 리셋
    } else {
      // 싱글탭: 카테고리 선택만
      onClick?.(category.id, e.shiftKey);
      lastTapTimeRef.current = currentTime;
    }
  };

  // useEffect로 전역 이벤트 리스너 추가
  React.useEffect(() => {
    if (mouseDownPos || isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [mouseDownPos, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return {
    handleMouseDown,
    handleTouchStart,
    handleMouseMove,
    handleMouseUp,
    handleClick
  };
};
