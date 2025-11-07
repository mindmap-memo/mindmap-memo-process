import React, { useState } from 'react';
import { MemoBlock as MemoBlockType, Page } from '../../../types';
import { calculateCategoryArea } from '../../../utils/categoryAreaUtils';
import { DRAG_THRESHOLD, LONG_PRESS_DURATION } from '../../../utils/constants';

/**
 * useMemoBlockDrag
 *
 * MemoBlock의 드래그 관련 로직을 관리하는 훅
 *
 * **관리하는 기능:**
 * - 마우스 다운/무브/업 핸들러
 * - 드래그 임계값 처리
 * - 카테고리 영역과의 충돌 검사
 * - 드래그 최적화 (throttling)
 */

interface UseMemoBlockDragParams {
  memo: MemoBlockType;
  isConnecting?: boolean;
  isDraggingAnyMemo?: boolean;
  isShiftPressed?: boolean;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  currentPage?: Page;
  onClick?: (isShiftClick?: boolean) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDetectCategoryOnDrop?: (memoId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
  onDragStart?: (memoId: string) => void;
  onDragEnd?: () => void;
  connectingFromId?: string | null;
  memoRef?: React.RefObject<HTMLDivElement | null>;
  setIsLongPressActive?: (active: boolean) => void;
}

export const useMemoBlockDrag = (params: UseMemoBlockDragParams) => {
  const {
    memo,
    isConnecting,
    isDraggingAnyMemo,
    isShiftPressed,
    canvasScale,
    canvasOffset,
    currentPage,
    onClick,
    onPositionChange,
    onDetectCategoryOnDrop,
    onStartConnection,
    onConnectMemos,
    onDragStart,
    onDragEnd,
    connectingFromId,
    memoRef,
    setIsLongPressActive: externalSetIsLongPressActive
  } = params;

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // 롱프레스 상태
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 빠른 드래그 최적화를 위한 상태
  const lastUpdateTime = React.useRef<number>(0);
  const pendingPosition = React.useRef<{ x: number; y: number } | null>(null);

  // 이벤트 핸들러 ref (useEffect 의존성 문제 해결)
  const handleMouseMoveRef = React.useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = React.useRef<((e: MouseEvent) => void) | null>(null);

  /**
   * 롱프레스 타이머 시작
   */
  const startLongPressTimer = () => {
    console.log('[MemoBlock] 롱프레스 타이머 시작됨 - 1초 후 활성화 예정');

    // 기존 타이머가 있으면 취소
    if (longPressTimerRef.current) {
      console.log('[MemoBlock] 기존 타이머 취소');
      clearTimeout(longPressTimerRef.current);
    }

    // 1초 후 롱프레스 활성화
    longPressTimerRef.current = setTimeout(() => {
      console.log('[MemoBlock] 롱프레스 감지! Shift+드래그 모드 활성화');
      setIsLongPressActive(true);
      // 전역 상태 업데이트
      externalSetIsLongPressActive?.(true);

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
      console.log('[MemoBlock] 롱프레스 타이머 취소됨');
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  /**
   * 마우스 다운 핸들러 - 드래그 준비
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    // 우클릭은 컨텍스트 메뉴용으로 무시
    if (e.button === 2) {
      return;
    }

    // 캔버스의 드래그 선택이 시작되지 않도록 이벤트 전파 중단
    e.stopPropagation();

    // 다른 메모가 이미 드래그 중이면 무시 (단, 현재 메모가 드래그 중이면 허용)
    if (isDraggingAnyMemo && !isDragging) {
      return;
    }

    // 연결 모드가 아닐 때만 드래그 준비 (왼쪽 클릭만)
    if (e.button === 0 && !isConnecting) {
      // 마우스 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: e.clientX, y: e.clientY });
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (memo.position.x * canvasScale + canvasOffset.x),
        y: e.clientY - (memo.position.y * canvasScale + canvasOffset.y)
      });

      // 롱프레스 타이머 시작
      startLongPressTimer();

      // preventDefault 제거: 더블클릭 이벤트가 발생하도록 허용
    }
  };

  /**
   * 터치 시작 핸들러 - 모바일 드래그 준비
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('[MemoBlock TouchStart]', { memoId: memo.id, touches: e.touches.length });

    // 캔버스의 드래그 선택이 시작되지 않도록 이벤트 전파 중단
    e.stopPropagation();

    // 다른 메모가 이미 드래그 중이면 무시
    if (isDraggingAnyMemo && !isDragging) {
      console.log('[MemoBlock TouchStart] 다른 메모가 드래그 중이라 무시');
      return;
    }

    // 연결 모드가 아닐 때만 드래그 준비
    if (!isConnecting && e.touches.length === 1) {
      const touch = e.touches[0];
      console.log('[MemoBlock TouchStart] 드래그 준비 완료', { x: touch.clientX, y: touch.clientY });

      // 터치 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: touch.clientX, y: touch.clientY });
      setDragMoved(false);
      setDragStart({
        x: touch.clientX - (memo.position.x * canvasScale + canvasOffset.x),
        y: touch.clientY - (memo.position.y * canvasScale + canvasOffset.y)
      });

      // 롱프레스 타이머 시작
      startLongPressTimer();
      console.log('[MemoBlock TouchStart] 롱프레스 타이머 시작');

      e.preventDefault(); // 기본 터치 동작 방지
    }
  };

  /**
   * 연결점 마우스 다운 핸들러
   */
  const handleConnectionPointMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isConnecting) {
      setIsConnectionDragging(true);
      onStartConnection?.(memo.id);
    }
  };

  /**
   * 연결점 마우스 업 핸들러
   */
  const handleConnectionPointMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
      onConnectMemos?.(connectingFromId, memo.id);
    }
    setIsConnectionDragging(false);
  };

  /**
   * 위치 업데이트 공통 로직
   */
  const updatePosition = (clientX: number, clientY: number) => {
    // 커서 위치 저장 (힌트 UI용)
    setCursorPosition({ x: clientX, y: clientY });

    if (!dragMoved) {
      setDragMoved(true);
    }

    // 현재 위치에서 드래그 시작 오프셋을 빼고 캔버스 좌표계로 변환
    let newPosition = {
      x: (clientX - dragStart.x - canvasOffset.x) / canvasScale,
      y: (clientY - dragStart.y - canvasOffset.y) / canvasScale
    };

    // 루트 메모이고 Shift 드래그가 아닐 때 (롱프레스 포함), 영역과 충돌하면 방향별 이동 차단
    if (!memo.parentId && !isShiftPressed && !isLongPressActive && currentPage) {
      const deltaX = newPosition.x - memo.position.x;
      const deltaY = newPosition.y - memo.position.y;

      const categories = currentPage.categories || [];
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;

      for (const category of categories) {
        // 루트 레벨 카테고리만 확인 (parentId가 null 또는 undefined)
        if (category.parentId != null) {
          continue;
        }
        if (!category.isExpanded) {
          continue;
        }

        const categoryArea = calculateCategoryArea(category, currentPage);
        if (!categoryArea) {
          continue;
        }

        // 새 위치에서 메모의 경계
        const newMemoBounds = {
          left: newPosition.x,
          top: newPosition.y,
          right: newPosition.x + memoWidth,
          bottom: newPosition.y + memoHeight
        };

        const areaBounds = {
          left: categoryArea.x,
          top: categoryArea.y,
          right: categoryArea.x + categoryArea.width,
          bottom: categoryArea.y + categoryArea.height
        };

        // 겹침 계산
        const overlapLeft = Math.max(newMemoBounds.left, areaBounds.left);
        const overlapTop = Math.max(newMemoBounds.top, areaBounds.top);
        const overlapRight = Math.min(newMemoBounds.right, areaBounds.right);
        const overlapBottom = Math.min(newMemoBounds.bottom, areaBounds.bottom);

        const hasOverlap = overlapLeft < overlapRight && overlapTop < overlapBottom;

        // 겹침이 발생하면 해당 방향으로 이동 차단
        if (hasOverlap) {
          // 어느 방향에서 충돌했는지 판단하고, 해당 방향으로의 이동만 차단 (현재 위치 유지)
          if (deltaX < 0) {
            // 왼쪽으로 이동 중 → x 좌표는 현재 메모 위치 유지
            newPosition.x = memo.position.x;
          } else if (deltaX > 0) {
            // 오른쪽으로 이동 중 → x 좌표는 현재 메모 위치 유지
            newPosition.x = memo.position.x;
          }

          if (deltaY < 0) {
            // 위로 이동 중 → y 좌표는 현재 메모 위치 유지
            newPosition.y = memo.position.y;
          } else if (deltaY > 0) {
            // 아래로 이동 중 → y 좌표는 현재 메모 위치 유지
            newPosition.y = memo.position.y;
          }
        }
      }
    }

    // 빠른 드래그 시 업데이트 빈도 조절 (50ms마다만 업데이트)
    const now = Date.now();
    pendingPosition.current = newPosition;

    if (now - lastUpdateTime.current >= 50) {
      console.log('[MemoBlock updatePosition] onPositionChange 호출', {
        memoId: memo.id,
        newPosition,
        timeSinceLastUpdate: now - lastUpdateTime.current
      });
      onPositionChange(memo.id, newPosition);
      lastUpdateTime.current = now;
    } else {
      console.log('[MemoBlock updatePosition] 쓰로틀링으로 스킵', {
        timeSinceLastUpdate: now - lastUpdateTime.current
      });
    }
  };

  /**
   * 마우스 이동 핸들러 - 드래그 처리
   */
  const handleMouseMove = (e: MouseEvent) => {
    // 마우스 다운 후 드래그 임계값 확인
    if (mouseDownPos && !isDragging) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      // 임계값을 넘으면 드래그 시작
      if (distance >= DRAG_THRESHOLD) {
        // 드래그가 시작되면 롱프레스 타이머 취소
        cancelLongPressTimer();
        setIsDragging(true);
        onDragStart?.(memo.id);
      }
    }

    if (isDragging) {
      updatePosition(e.clientX, e.clientY);
    }
  };

  /**
   * 터치 이동 핸들러 - 모바일 드래그 처리
   */
  const handleTouchMove = (e: TouchEvent) => {
    // 터치 다운 후 드래그 임계값 확인
    if (mouseDownPos && !isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - mouseDownPos.x, 2) +
        Math.pow(touch.clientY - mouseDownPos.y, 2)
      );

      // 임계값을 넘으면 드래그 시작
      if (distance >= DRAG_THRESHOLD) {
        // 드래그가 시작되면 롱프레스 타이머 취소
        cancelLongPressTimer();
        setIsDragging(true);
        onDragStart?.(memo.id);
      }
    }

    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      updatePosition(touch.clientX, touch.clientY);
      e.preventDefault(); // 스크롤 방지
    }
  };

  // ref에 최신 핸들러 저장
  handleMouseMoveRef.current = handleMouseMove;

  /**
   * 드래그 종료 공통 로직
   */
  const finishDrag = (clientX: number, clientY: number, shiftKey?: boolean) => {
    // 롱프레스 타이머 취소
    cancelLongPressTimer();

    // 실제 Shift 키 또는 롱프레스로 인한 가상 Shift 모드
    const effectiveShiftMode = shiftKey || isLongPressActive;

    if (isDragging) {
      // 드래그가 끝날 때 최종 위치 업데이트 (대기 중인 위치가 있으면 사용)
      const finalPosition = pendingPosition.current || {
        x: (clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // Shift 모드가 아닐 때만 최종 위치 업데이트 (Shift 모드는 handleShiftDrop에서 처리)
      // 롱프레스도 Shift 모드와 동일하게 처리
      if (!effectiveShiftMode) {
        onPositionChange(memo.id, finalPosition);
      }

      // 카테고리 감지 (effectiveShiftMode 전달)
      if (dragMoved && onDetectCategoryOnDrop) {
        onDetectCategoryOnDrop(memo.id, finalPosition, effectiveShiftMode);
      }

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
      setCursorPosition(null); // 커서 위치 리셋
    } else if (!dragMoved) {
      // 드래그가 발생하지 않았을 때: 메모 선택
      onClick?.(effectiveShiftMode);
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDragging(false);
    setMouseDownPos(null);
    setIsLongPressActive(false); // 롱프레스 상태 리셋
    // 전역 상태 업데이트
    externalSetIsLongPressActive?.(false);
    onDragEnd?.();
  };

  /**
   * 마우스 업 핸들러 - 드래그 종료
   */
  const handleMouseUp = (e: MouseEvent) => {
    finishDrag(e.clientX, e.clientY, e.shiftKey);
  };

  /**
   * 터치 종료 핸들러 - 모바일 드래그 종료
   */
  const handleTouchEnd = (e: TouchEvent) => {
    // 터치가 끝날 때 마지막 터치 위치 사용
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      finishDrag(touch.clientX, touch.clientY, false);
    } else {
      finishDrag(0, 0, false); // 폴백
    }
  };

  // ref에 최신 핸들러 저장
  handleMouseUpRef.current = handleMouseUp;

  // 터치 이벤트 핸들러 ref
  const handleTouchMoveRef = React.useRef<((e: TouchEvent) => void) | null>(null);
  const handleTouchEndRef = React.useRef<((e: TouchEvent) => void) | null>(null);

  handleTouchMoveRef.current = handleTouchMove;
  handleTouchEndRef.current = handleTouchEnd;

  /**
   * 네이티브 터치 시작 이벤트 리스너 등록 (passive: false)
   */
  React.useEffect(() => {
    if (!memoRef?.current) return;

    const nativeTouchStart = (e: TouchEvent) => {
      console.log('[MemoBlock Native TouchStart] 이벤트 발생!', { memoId: memo.id });

      // 다른 메모가 이미 드래그 중이면 무시
      if (isDraggingAnyMemo && !isDragging) {
        console.log('[MemoBlock Native TouchStart] 다른 메모가 드래그 중');
        return;
      }

      // 연결 모드가 아닐 때만 드래그 준비
      if (!isConnecting && e.touches.length === 1) {
        const touch = e.touches[0];

        console.log('[MemoBlock Native TouchStart] 드래그 준비 및 롱프레스 타이머 시작');
        setMouseDownPos({ x: touch.clientX, y: touch.clientY });
        setDragMoved(false);
        setDragStart({
          x: touch.clientX - (memo.position.x * canvasScale + canvasOffset.x),
          y: touch.clientY - (memo.position.y * canvasScale + canvasOffset.y)
        });

        // 롱프레스 타이머 시작 - 여기가 핵심!
        startLongPressTimer();

        e.preventDefault();
        e.stopPropagation();
      }
    };

    memoRef.current.addEventListener('touchstart', nativeTouchStart, { passive: false });

    return () => {
      memoRef.current?.removeEventListener('touchstart', nativeTouchStart);
    };
  }, [memo.id, memo.position, canvasScale, canvasOffset, isConnecting, isDraggingAnyMemo, isDragging, memoRef]);

  /**
   * 드래그 이벤트 리스너 등록 (마우스/터치 다운 또는 드래그 중일 때)
   */
  React.useEffect(() => {
    // 마우스 다운 상태이거나 드래그 중일 때 이벤트 리스너 등록
    if (mouseDownPos || isDragging) {
      const moveHandler = (e: MouseEvent) => handleMouseMoveRef.current?.(e);
      const upHandler = (e: MouseEvent) => handleMouseUpRef.current?.(e);
      const touchMoveHandler = (e: TouchEvent) => handleTouchMoveRef.current?.(e);
      const touchEndHandler = (e: TouchEvent) => handleTouchEndRef.current?.(e);

      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      document.addEventListener('touchmove', touchMoveHandler, { passive: false });
      document.addEventListener('touchend', touchEndHandler);

      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchmove', touchMoveHandler);
        document.removeEventListener('touchend', touchEndHandler);
      };
    }
  }, [mouseDownPos, isDragging]);

  return {
    isDragging,
    isConnectionDragging,
    dragMoved,
    cursorPosition,
    isLongPressActive, // 롱프레스 상태 반환
    mouseDownPos, // 클릭/터치 시작 여부 확인용
    handleMouseDown,
    handleConnectionPointMouseDown,
    handleConnectionPointMouseUp
  };
};
