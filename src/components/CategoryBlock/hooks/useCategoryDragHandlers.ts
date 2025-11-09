import React from 'react';
import { CategoryBlock } from '../../../types';
import { detectDoubleTap } from '../../../utils/doubleTapUtils';
import { DRAG_THRESHOLD, LONG_PRESS_DURATION, POSITION_UPDATE_THROTTLE } from '../../../utils/constants';

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
  longPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  isLongPressActive: boolean;
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref 추가
  lastLongPressEndRef?: React.MutableRefObject<number>;  // 롱프레스 종료 시간 ref
  setMouseDownPos: (value: { x: number; y: number } | null) => void;
  setDragMoved: (value: boolean) => void;
  setDragStart: (value: { x: number; y: number }) => void;
  setIsDraggingPosition: (value: boolean) => void;
  setIsLongPressActive: (value: boolean) => void;
  setIsLongPressActiveGlobal?: (value: boolean, targetId?: string | null) => void;  // 전역 롱프레스 상태 업데이트
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수 추가
  onClick?: (categoryId: string, isShiftClick?: boolean) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }, isShiftMode?: boolean) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onOpenEditor?: () => void;
}

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
  longPressTimerRef,
  isLongPressActive,
  isShiftPressedRef,  // Shift ref 추가
  lastLongPressEndRef,  // 롱프레스 종료 시간 ref
  setMouseDownPos,
  setDragMoved,
  setDragStart,
  setIsDraggingPosition,
  setIsLongPressActive,
  setIsLongPressActiveGlobal,
  setIsShiftPressed,  // Shift 상태 업데이트 함수
  onClick,
  onDragStart,
  onDragEnd,
  onPositionChange,
  onPositionDragEnd,
  onDetectCategoryDropForCategory,
  onOpenEditor
}: UseCategoryDragHandlersProps) => {
  // 롱프레스 상태를 ref로 추적 (useCallback 클로저 문제 해결)
  const isLongPressActiveRef = React.useRef(isLongPressActive);
  React.useEffect(() => {
    isLongPressActiveRef.current = isLongPressActive;
  }, [isLongPressActive]);

  /**
   * 롱프레스 타이머 시작
   */
  const startLongPressTimer = () => {
    // 기존 타이머가 있으면 취소
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // 1초 후 롱프레스 활성화
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressActive(true);
      setIsLongPressActiveGlobal?.(true, category.id);

      // Shift 상태도 함께 업데이트
      if (isShiftPressedRef) {
        isShiftPressedRef.current = true;
      }
      setIsShiftPressed?.(true);

      // ⚠️ 롱프레스 활성화 시 즉시 드래그 시작
      if (!isDraggingRef.current && mouseDownPos) {
        isDraggingRef.current = true;
        setIsDraggingPosition(true);
        onClick?.(category.id, false);
      }

      // 햅틱 피드백 (모바일)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DURATION);
  };

  /**
   * 롱프레스 타이머 취소
   */
  const cancelLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 액션 버튼(편집, 즐겨찾기, 삭제)을 클릭한 경우 드래그 로직 건너뛰기
    const target = e.target as HTMLElement;
    if (target.closest('[data-action-button]')) {
      return;
    }

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
      setMouseDownPos({ x: e.clientX, y: e.clientY });
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (category.position.x * canvasScale + canvasOffset.x),
        y: e.clientY - (category.position.y * canvasScale + canvasOffset.y)
      });

      // 롱프레스 타이머 시작
      startLongPressTimer();

      e.preventDefault(); // 기본 드래그 동작 방지
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // 캔버스의 드래그 선택이 시작되지 않도록 이벤트 전파 중단
    e.stopPropagation();

    if (!isConnecting && !isEditing && e.touches.length === 1) {
      const touch = e.touches[0];

      // 터치 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: touch.clientX, y: touch.clientY });
      setDragMoved(false);
      setDragStart({
        x: touch.clientX - (category.position.x * canvasScale + canvasOffset.x),
        y: touch.clientY - (category.position.y * canvasScale + canvasOffset.y)
      });

      // 롱프레스 타이머 시작
      startLongPressTimer();

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

      // 빠른 드래그 시 업데이트 빈도 조절
      const now = Date.now();
      pendingPosition.current = newPosition;

      if (now - lastUpdateTime.current >= POSITION_UPDATE_THROTTLE) {
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
        // 드래그가 시작되면 롱프레스 타이머 취소
        cancelLongPressTimer();
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

      // 롱프레스가 활성화되었거나 임계값을 넘으면 드래그 시작
      if (isLongPressActiveRef.current || distance >= DRAG_THRESHOLD) {
        // 드래그가 시작되면 롱프레스 타이머 취소 (아직 발동 전인 경우)
        cancelLongPressTimer();
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
      updatePosition(touch.clientX, touch.clientY);
      e.preventDefault(); // 스크롤 방지
    }
  }, [mouseDownPos, onClick, onDragStart, isDraggingRef, setIsDraggingPosition, updatePosition]);

  const finishDrag = React.useCallback((clientX: number, clientY: number, shiftKey?: boolean) => {
    // 롱프레스 타이머 취소
    cancelLongPressTimer();

    // 실제 Shift 키 또는 롱프레스로 인한 가상 Shift 모드
    // ⚠️ 중요: ref를 사용하여 최신 값 참조 (useCallback 클로저 문제 해결)
    const effectiveShiftMode = shiftKey || isLongPressActiveRef.current;

    if (isDraggingRef.current) {
      // ref를 즉시 false로 설정하여 추가 이벤트 무시
      isDraggingRef.current = false;

      // 최종 위치 계산
      const finalPosition = pendingPosition.current || {
        x: (clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 드래그 종료 콜백 호출 (최종 위치와 effectiveShiftMode 전달)
      onPositionDragEnd?.(category.id, finalPosition, effectiveShiftMode);

      // Shift 모드(또는 롱프레스)일 때 카테고리 드롭 감지
      if (effectiveShiftMode && onDetectCategoryDropForCategory) {
        onDetectCategoryDropForCategory(category.id, finalPosition, true);
      }

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
    } else if (!dragMoved) {
      // 드래그가 발생하지 않았을 때: 카테고리 선택
      onClick?.(category.id, effectiveShiftMode);
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDraggingPosition(false);
    setMouseDownPos(null);

    // Shift 상태도 함께 리셋 (롱프레스로 활성화된 경우)
    // ⚠️ 중요: ref를 사용하여 최신 값 참조 (useCallback 클로저 문제 해결)
    const wasLongPressActive = isLongPressActiveRef.current;

    setIsLongPressActive(false); // 롱프레스 상태 리셋
    // 전역 상태 업데이트
    setIsLongPressActiveGlobal?.(false, null);

    // 롱프레스가 활성화되어 있었다면 Shift도 리셋
    if (wasLongPressActive) {
      // 롱프레스 종료 시간 기록 (컨텍스트 메뉴 방지용)
      if (lastLongPressEndRef) {
        lastLongPressEndRef.current = Date.now();
      }
      // ref도 직접 리셋
      if (isShiftPressedRef) {
        isShiftPressedRef.current = false;
      }
      setIsShiftPressed?.(false);
    }
  }, [onPositionDragEnd, category.id, dragStart, canvasOffset, canvasScale, isDraggingRef, pendingPosition, lastUpdateTime, setIsDraggingPosition, setMouseDownPos, dragMoved, onClick, setIsLongPressActive, setIsLongPressActiveGlobal, setIsShiftPressed]);

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
    const isDoubleTap = detectDoubleTap(category.id);

    if (isDoubleTap) {
      // 더블탭: 에디터 열기
      if (onOpenEditor) {
        onOpenEditor();
      }
    } else {
      // 싱글탭: 카테고리 선택만
      onClick?.(category.id, e.shiftKey);
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
