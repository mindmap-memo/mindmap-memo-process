import React from 'react';
import { Page, CategoryBlock } from '../../types';
import { useCategoryHandlers as useCategoryDragHandlers } from './hooks/useCategoryHandlers';

/**
 * useCanvasHandlers
 *
 * Canvas 컴포넌트의 모든 이벤트 핸들러 함수들을 관리하는 훅
 *
 * **핸들러 목록:**
 * - constrainToBounds: 메모 블록이 캔버스 경계를 벗어나지 않도록 제한
 * - handleMemoPositionChange: 메모 위치 변경 핸들러
 * - handleCategoryPositionStart: 카테고리 드래그 시작 핸들러
 * - handleCategoryPositionEnd: 카테고리 드래그 종료 핸들러
 * - handleCategoryDragStart: 카테고리 드래그 시작 (DragEvent)
 * - handleCategoryDragEnd: 카테고리 드래그 종료 (DragEvent)
 * - handleCategoryDragOver: 카테고리 드래그 오버 (DragEvent)
 * - handleDropOnCategory: 카테고리 블록에 드롭 핸들러
 * - handleCategoryAreaDragOver: 카테고리 영역 드래그 오버 핸들러
 * - handleDropOnCategoryArea: 카테고리 영역에 드롭 핸들러
 * - handleCanvasMouseDown: 캔버스 마우스 다운 핸들러 (팬, 드래그 선택)
 * - handleWheel: 마우스 휠 핸들러 (줌)
 * - handleMouseMove: 마우스 이동 핸들러 (연결선, 팬)
 * - handleMouseUp: 마우스 업 핸들러
 * - handleCanvasDrop: 캔버스 전체 드롭 핸들러
 * - handleCanvasDragOver: 캔버스 드래그 오버 핸들러
 *
 * @param params 핸들러에 필요한 모든 props, state, setters
 * @returns 이벤트 핸들러 함수들을 담은 객체
 */

interface UseCanvasHandlersParams {
  // Page data
  currentPage: Page | undefined;

  // Connection state
  isConnecting: boolean;

  // Callbacks from parent
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onCategoryDragStart?: () => void;
  onCategoryDragEnd?: () => void;
  onMoveToCategory: (itemId: string, categoryId: string | null) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onUpdateDragLine: (mousePos: { x: number; y: number }) => void;
  onDeselectAll?: () => void;

  // Canvas state
  currentTool: 'select' | 'pan' | 'zoom';
  isSpacePressed: boolean;
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;
  panStart: { x: number; y: number; offsetX: number; offsetY: number };
  setPanStart: (panStart: { x: number; y: number; offsetX: number; offsetY: number }) => void;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  canvasScale: number;
  setCanvasScale: (scale: number) => void;

  // Drag selection state
  setGlobalDragSelecting: (selecting: boolean) => void;
  setGlobalDragStart: (position: { x: number; y: number }) => void;
  setGlobalDragWithShift: (withShift: boolean) => void;
  setDragThresholdMet: (met: boolean) => void;

  // Category drag state
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

  setDragTargetCategoryId: (categoryId: string | null) => void;

  // Category area calculation
  calculateCategoryAreaWithColor: (category: CategoryBlock, visited?: Set<string>) => any;

  // Refs
  recentlyDraggedCategoryRef: React.MutableRefObject<string | null>;
}

// 캔버스 최대 영역 (15000x15000px, SVG와 동일)
const CANVAS_BOUNDS = { width: 15000, height: 15000, offsetX: -5000, offsetY: -5000 };

/**
 * 메모 블록이 경계를 벗어나지 않도록 제한하는 함수
 * @param position 제한할 위치
 * @param memoSize 메모 크기
 * @returns 제한된 위치
 */
const constrainToBounds = (position: { x: number; y: number }, memoSize: { width: number; height: number }) => {
  const { width, height, offsetX, offsetY } = CANVAS_BOUNDS;
  const memoWidth = memoSize.width || 200;
  const memoHeight = memoSize.height || 95;

  return {
    x: Math.max(offsetX, Math.min(position.x, offsetX + width - memoWidth)),
    y: Math.max(offsetY, Math.min(position.y, offsetY + height - memoHeight))
  };
};

export const useCanvasHandlers = (params: UseCanvasHandlersParams) => {
  const {
    currentPage,
    isConnecting,
    onMemoPositionChange,
    onCategoryPositionChange,
    onCategoryPositionDragEnd,
    onCategoryDragStart,
    onCategoryDragEnd,
    onMoveToCategory,
    onDetectCategoryDropForCategory,
    onUpdateDragLine,
    onDeselectAll,
    currentTool,
    isSpacePressed,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,
    setGlobalDragSelecting,
    setGlobalDragStart,
    setGlobalDragWithShift,
    setDragThresholdMet,
    draggedCategoryAreas,
    setDraggedCategoryAreas,
    setDragTargetCategoryId,
    calculateCategoryAreaWithColor,
    recentlyDraggedCategoryRef
  } = params;

  /**
   * 메모 위치 변경 핸들러 (경계 제한 제거)
   */
  const handleMemoPositionChange = (memoId: string, position: { x: number; y: number }) => {
    // 경계 제한 없이 직접 전달
    onMemoPositionChange(memoId, position);
  };

  // 카테고리 드래그 & 드롭 핸들러
  const {
    handleCategoryPositionStart,
    handleCategoryPositionEnd,
    handleCategoryDragStart,
    handleCategoryDragEnd,
    handleCategoryDragOver,
    handleDropOnCategory,
    handleCategoryAreaDragOver,
    handleDropOnCategoryArea
  } = useCategoryDragHandlers({
    currentPage,
    draggedCategoryAreas,
    setDraggedCategoryAreas,
    calculateCategoryAreaWithColor,
    recentlyDraggedCategoryRef,
    onCategoryPositionDragEnd,
    onCategoryDragStart,
    onCategoryDragEnd,
    onMoveToCategory
  });

  /**
   * 캔버스 마우스 다운 핸들러 (팬, 드래그 선택 시작)
   */
  const handleCanvasMouseDown = React.useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;

    // 카테고리 영역인지 확인
    const isCategoryArea = target.hasAttribute('data-category-area');

    // 카테고리 영역을 드래그할 때는 팬을 시작하지 않음
    if (isCategoryArea) {
      // 카테고리 영역 자체 드래그 핸들러가 처리하므로 여기서는 아무것도 하지 않음
      return;
    }

    // 스페이스바가 눌린 상태에서는 항상 팬 모드 (메모 블록 위에서도)
    // 연결 모드에서도 패닝 허용
    if (isSpacePressed) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      });
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 캔버스 배경 영역에서만 팬 도구 활성화
    const isCanvasBackground = target.hasAttribute('data-canvas') ||
                              target.tagName === 'svg' ||
                              target.tagName === 'line' ||
                              (target.tagName === 'DIV' &&
                               !target.closest('[data-memo-block="true"]') &&
                               !target.closest('[data-category-block="true"]') &&
                               !target.closest('button'));

    if (isCanvasBackground) {
      // 팬 모드는 연결 모드에서도 허용
      if (currentTool === 'pan') {
        setIsPanning(true);
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          offsetX: canvasOffset.x,
          offsetY: canvasOffset.y
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 선택 도구일 때 빈 공간 클릭 시 선택 해제 (연결 모드가 아닐 때만)
      if (currentTool === 'select' && !isConnecting && onDeselectAll) {
        onDeselectAll();
      }
    }

    // 선택 도구이고 연결 모드가 아닐 때 전역 드래그 선택 시작 준비 (캔버스 배경에서만)
    if (currentTool === 'select' && !isConnecting && !isPanning && isCanvasBackground) {
      setGlobalDragSelecting(true);
      setGlobalDragStart({ x: e.clientX, y: e.clientY });
      setGlobalDragWithShift(e.shiftKey);
      setDragThresholdMet(false);
    }
  }, [
    isSpacePressed,
    isConnecting,
    currentTool,
    isPanning,
    canvasOffset,
    onDeselectAll,
    setIsPanning,
    setPanStart,
    setGlobalDragSelecting,
    setGlobalDragStart,
    setGlobalDragWithShift,
    setDragThresholdMet
  ]);

  /**
   * 마우스 휠 핸들러 (줌)
   */
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    // Alt + 휠, Ctrl + 휠 (Windows/Linux), Command + 휠 (macOS), 또는 줌 도구 선택 시 확대/축소
    if (e.altKey || e.ctrlKey || e.metaKey || currentTool === 'zoom') {
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // 줌 델타 계산 (휠 방향에 따라)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.01, Math.min(5, canvasScale * zoomFactor));

      if (newScale !== canvasScale) {
        // 마우스 위치 아래의 월드 좌표 계산 (줌 전)
        const worldX = (mouseX - canvasOffset.x) / canvasScale;
        const worldY = (mouseY - canvasOffset.y) / canvasScale;

        // 줌 후에도 같은 월드 좌표가 마우스 위치에 있도록 offset 조정
        const newOffsetX = mouseX - worldX * newScale;
        const newOffsetY = mouseY - worldY * newScale;

        setCanvasScale(newScale);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      }
    }
  }, [currentTool, canvasScale, canvasOffset, setCanvasScale, setCanvasOffset]);

  /**
   * 마우스 이동 핸들러 (연결선, 팬)
   */
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (isConnecting) {
      // Canvas 영역에서의 마우스 이동 - rect 기준으로 변환
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
      const mouseY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
      onUpdateDragLine({ x: mouseX, y: mouseY });
    }

    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      const newOffset = {
        x: panStart.offsetX + deltaX,
        y: panStart.offsetY + deltaY
      };
      setCanvasOffset(newOffset);
    }
  }, [isConnecting, isPanning, canvasOffset, canvasScale, panStart, onUpdateDragLine, setCanvasOffset]);

  /**
   * 터치 시작 핸들러 (모바일 패닝)
   */
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const target = e.target as Element;

    // 카테고리 영역인지 확인
    const isCategoryArea = target.hasAttribute('data-category-area');

    // 연결점을 터치했는지 확인 (가장 먼저 체크해야 함!)
    // data 속성으로 정확하게 감지
    const isConnectionPoint = target.hasAttribute('data-connection-point') ||
                             target.hasAttribute('data-connection-dot') ||
                             target.closest('[data-connection-point]');

    // 디버깅: 터치한 요소와 모든 data 속성 확인
    const allDataAttrs: Record<string, string> = {};
    Array.from(target.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        allDataAttrs[attr.name] = attr.value;
      }
    });

    console.log('🟡 [Canvas handleTouchStart]', {
      isConnecting,
      isConnectionPoint,
      hasDataConnectionPoint: target.hasAttribute('data-connection-point'),
      hasDataConnectionDot: target.hasAttribute('data-connection-dot'),
      closestConnectionPoint: !!target.closest('[data-connection-point]'),
      targetTagName: target.tagName,
      targetClassName: target.className,
      allDataAttrs,
      parentElement: target.parentElement?.tagName,
      parentClassName: target.parentElement?.className
    });

    // 연결 모드에서 연결점을 터치한 경우: 패닝하지 않고 MemoBlock의 핸들러가 처리하도록 함
    if (isConnecting && isConnectionPoint) {
      console.log('✅ [Canvas] 연결점 터치 감지 - MemoBlock 핸들러로 위임');
      // 여기서 return하면 MemoBlock의 onTouchStart가 실행됨
      return;
    }

    // 연결점이 아닌 메모 블록, 카테고리 블록을 터치한 경우는 패닝하지 않음
    const isMemoOrCategory = (target.closest('[data-memo-block="true"]') && !isConnectionPoint) ||
                             target.closest('[data-category-block="true"]') ||
                             target.closest('button') ||
                             isCategoryArea;

    if (isMemoOrCategory) {
      console.log('🔶 [Canvas] 메모/카테고리 터치 - 패닝 차단');
      return;
    }

    // 캔버스 배경 터치 시 패닝 시작 (연결 모드에서도 허용, 단 연결점이 아닌 경우만)
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      console.log('🟢 [Canvas] 패닝 시작');
      setIsPanning(true);
      setPanStart({
        x: touch.clientX,
        y: touch.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      });
      // preventDefault는 useEffect의 네이티브 리스너에서 처리
    }
  }, [isConnecting, canvasOffset, setIsPanning, setPanStart]);

  /**
   * 터치 이동 핸들러 (모바일 패닝) - 빈 함수 (실제 처리는 useEffect에서)
   */
  const handleTouchMove = React.useCallback(() => {
    // 실제 처리는 useCanvasEffects의 전역 리스너에서 수행
  }, []);

  /**
   * 터치 종료 핸들러 (모바일 패닝)
   */
  const handleTouchEnd = React.useCallback(() => {
    setIsPanning(false);
  }, [setIsPanning]);

  /**
   * 마우스 업 핸들러
   */
  const handleMouseUp = React.useCallback(() => {
    setIsPanning(false);
    setDragTargetCategoryId(null); // Shift 드래그 종료 시 타겟 초기화

    // 드래그 완료 시 모든 캐시를 완전히 클리어 (Shift를 눌렀다 뗐을 때 남아있는 충돌 판정 제거)
    // draggedCategoryAreas는 handleCategoryPositionDragEnd에서 처리되므로 여기서는 스킵
  }, [setIsPanning, setDragTargetCategoryId]);

  /**
   * Canvas 전체에서 카테고리 라벨 드롭 처리
   */
  const handleCanvasDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (dragData.type === 'category') {
        // 드롭 위치를 캔버스 좌표로 변환
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
        const y = (e.clientY - rect.top - canvasOffset.y) / canvasScale;

        onCategoryPositionChange(dragData.id, { x, y });

        // Shift 드래그면 카테고리-카테고리 종속 감지
        if (onDetectCategoryDropForCategory) {
          onDetectCategoryDropForCategory(dragData.id, { x, y });
        }
      }
    } catch (error) {
      // Silently catch error
    }
  }, [canvasOffset, canvasScale, onCategoryPositionChange, onDetectCategoryDropForCategory]);

  /**
   * 캔버스 드래그 오버 핸들러
   */
  const handleCanvasDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return {
    CANVAS_BOUNDS,
    constrainToBounds,
    handleMemoPositionChange,
    handleCategoryPositionStart,
    handleCategoryPositionEnd,
    handleCategoryDragStart,
    handleCategoryDragEnd,
    handleCategoryDragOver,
    handleDropOnCategory,
    handleCategoryAreaDragOver,
    handleDropOnCategoryArea,
    handleCanvasMouseDown,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleCanvasDrop,
    handleCanvasDragOver
  };
};
