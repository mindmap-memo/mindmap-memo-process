import React, { useState } from 'react';
import { MemoBlock as MemoBlockType, Page } from '../../../types';
import { calculateCategoryArea } from '../../../utils/categoryAreaUtils';

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
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDetectCategoryOnDrop?: (memoId: string, position: { x: number; y: number }) => void;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
  onDragStart?: (memoId: string) => void;
  onDragEnd?: () => void;
  connectingFromId?: string | null;
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
    onPositionChange,
    onDetectCategoryOnDrop,
    onStartConnection,
    onConnectMemos,
    onDragStart,
    onDragEnd,
    connectingFromId
  } = params;

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // 드래그 임계값 (픽셀 단위)
  const DRAG_THRESHOLD = 5;

  // 빠른 드래그 최적화를 위한 상태
  const lastUpdateTime = React.useRef<number>(0);
  const pendingPosition = React.useRef<{ x: number; y: number } | null>(null);

  // 이벤트 핸들러 ref (useEffect 의존성 문제 해결)
  const handleMouseMoveRef = React.useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = React.useRef<((e: MouseEvent) => void) | null>(null);

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
      e.preventDefault(); // HTML5 드래그 방지, 마우스 드래그 우선
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
        setIsDragging(true);
        onDragStart?.(memo.id);
      }
    }

    if (isDragging) {
      // 커서 위치 저장 (힌트 UI용)
      setCursorPosition({ x: e.clientX, y: e.clientY });

      if (!dragMoved) {
        setDragMoved(true);
      }

      // 마우스 현재 위치에서 드래그 시작 오프셋을 빼고 캔버스 좌표계로 변환
      let newPosition = {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 루트 메모이고 Shift 드래그가 아닐 때, 영역과 충돌하면 방향별 이동 차단
      if (!memo.parentId && !isShiftPressed && currentPage) {
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
        onPositionChange(memo.id, newPosition);
        lastUpdateTime.current = now;
      }
    }
  };

  // ref에 최신 핸들러 저장
  handleMouseMoveRef.current = handleMouseMove;

  /**
   * 마우스 업 핸들러 - 드래그 종료
   */
  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging) {
      // 드래그가 끝날 때 최종 위치 업데이트 (대기 중인 위치가 있으면 사용)
      const finalPosition = pendingPosition.current || {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // Shift 모드가 아닐 때만 최종 위치 업데이트 (Shift 모드는 handleShiftDrop에서 처리)
      if (!isShiftPressed) {
        onPositionChange(memo.id, finalPosition);
      }

      // 카테고리 감지
      if (dragMoved && onDetectCategoryOnDrop) {
        onDetectCategoryOnDrop(memo.id, finalPosition);
      }

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
      setCursorPosition(null); // 커서 위치 리셋
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDragging(false);
    setMouseDownPos(null);
    onDragEnd?.();
  };

  // ref에 최신 핸들러 저장
  handleMouseUpRef.current = handleMouseUp;

  /**
   * 드래그 이벤트 리스너 등록 (마우스 다운 또는 드래그 중일 때)
   */
  React.useEffect(() => {
    // 마우스 다운 상태이거나 드래그 중일 때 이벤트 리스너 등록
    if (mouseDownPos || isDragging) {
      const moveHandler = (e: MouseEvent) => handleMouseMoveRef.current?.(e);
      const upHandler = (e: MouseEvent) => handleMouseUpRef.current?.(e);

      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
    }
  }, [mouseDownPos, isDragging]);

  return {
    isDragging,
    isConnectionDragging,
    dragMoved,
    cursorPosition,
    handleMouseDown,
    handleConnectionPointMouseDown,
    handleConnectionPointMouseUp
  };
};
