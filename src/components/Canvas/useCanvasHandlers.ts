import React from 'react';
import { Page, CategoryBlock } from '../../types';
import { calculateCategoryArea } from '../../utils/categoryAreaUtils';

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
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void;
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
   * 경계 체크를 포함한 메모 위치 변경 핸들러
   */
  const handleMemoPositionChange = React.useCallback((memoId: string, position: { x: number; y: number }) => {
    const memo = currentPage?.memos.find(m => m.id === memoId);
    if (memo) {
      const constrainedPosition = constrainToBounds(position, memo.size || { width: 200, height: 95 });
      onMemoPositionChange(memoId, constrainedPosition);
    } else {
      onMemoPositionChange(memoId, position);
    }
  }, [currentPage, onMemoPositionChange]);

  /**
   * 카테고리 위치 변경 시작 (드래그 시작)
   */
  const handleCategoryPositionStart = React.useCallback((categoryId: string) => {
    const category = currentPage?.categories?.find(cat => cat.id === categoryId);
    if (category) {
      // 캐시가 없을 때만 새로 계산 (있으면 기존 캐시 유지)
      if (!draggedCategoryAreas[categoryId]) {
        const currentArea = calculateCategoryAreaWithColor(category);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: category.position.x, y: category.position.y }
            }
          }));
        }
      }
    }
  }, [currentPage, draggedCategoryAreas, calculateCategoryAreaWithColor, setDraggedCategoryAreas]);

  /**
   * 카테고리 위치 변경 종료 (드래그 종료)
   */
  const handleCategoryPositionEnd = React.useCallback((categoryId: string, finalPosition: { x: number; y: number }) => {
    const cachedArea = draggedCategoryAreas[categoryId];
    console.log('[Canvas] 드래그 종료:', categoryId, '최종 위치:', finalPosition, '캐시된 영역:', cachedArea);

    // 최근 드래그한 카테고리 저장 (영역 계산 로그용)
    recentlyDraggedCategoryRef.current = categoryId;

    // App에서 캐시 제거 처리 (state 업데이트 후 자연스럽게 재계산)
    onCategoryPositionDragEnd?.(categoryId, finalPosition);

    // Canvas 로컬 캐시는 약간의 딜레이 후 제거 (React 리렌더링 대기)
    setTimeout(() => {
      console.log('[Canvas] 캐시 제거 시작:', categoryId);
      setDraggedCategoryAreas(prev => {
        const newAreas = { ...prev };
        delete newAreas[categoryId];
        console.log('[Canvas] 캐시 제거 완료:', categoryId);
        return newAreas;
      });

      // 로그 추적 종료 (1초 후)
      setTimeout(() => {
        if (recentlyDraggedCategoryRef.current === categoryId) {
          recentlyDraggedCategoryRef.current = null;
        }
      }, 1000);
    }, 50); // 50ms 후 캐시 제거
  }, [draggedCategoryAreas, onCategoryPositionDragEnd, setDraggedCategoryAreas, recentlyDraggedCategoryRef]);

  /**
   * 기존 카테고리 드래그 핸들러들 (실제로는 사용되지 않음 - 마우스 이벤트로 처리)
   */
  const handleCategoryDragStart = React.useCallback((e: React.DragEvent) => {
    onCategoryDragStart?.();
  }, [onCategoryDragStart]);

  const handleCategoryDragEnd = React.useCallback((e: React.DragEvent) => {
    onCategoryDragEnd?.();
  }, [onCategoryDragEnd]);

  const handleCategoryDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * 카테고리 블록에 드롭 핸들러
   */
  const handleDropOnCategory = React.useCallback((e: React.DragEvent, categoryId: string) => {
    e.preventDefault();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('드롭 처리 중 오류:', error);
    }
  }, [onMoveToCategory, setDraggedCategoryAreas]);

  /**
   * 카테고리 영역 드래그 오버 핸들러
   */
  const handleCategoryAreaDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 영역에 추가적인 드래그 오버 효과를 줄 수 있음 (현재는 기본)
  }, []);

  /**
   * 카테고리 영역에 드롭 핸들러
   */
  const handleDropOnCategoryArea = React.useCallback((e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리 영역에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('카테고리 영역 드롭 처리 중 오류:', error);
    }
  }, [onMoveToCategory, setDraggedCategoryAreas]);

  /**
   * 캔버스 마우스 다운 핸들러 (팬, 드래그 선택 시작)
   */
  const handleCanvasMouseDown = React.useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;

    // 스페이스바가 눌린 상태에서는 항상 팬 모드 (메모 블록 위에서도)
    if (isSpacePressed && !isConnecting) {
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

    // 카테고리 영역인지 확인
    const isCategoryArea = target.hasAttribute('data-category-area');

    // 캔버스 배경 영역에서만 팬 도구 활성화
    const isCanvasBackground = target.hasAttribute('data-canvas') ||
                              target.tagName === 'svg' ||
                              target.tagName === 'line' ||
                              (target.tagName === 'DIV' &&
                               !target.closest('[data-memo-block="true"]') &&
                               !target.closest('[data-category-block="true"]') &&
                               !target.closest('button') &&
                               !isCategoryArea);

    if (isCanvasBackground && !isConnecting) {
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

      // 선택 도구일 때 빈 공간 클릭 시 선택 해제
      if (currentTool === 'select' && onDeselectAll) {
        onDeselectAll();
      }
    }

    // 선택 도구이고 연결 모드가 아닐 때 전역 드래그 선택 시작 준비 (캔버스 배경 또는 카테고리 영역에서)
    if (currentTool === 'select' && !isConnecting && !isPanning && (isCanvasBackground || isCategoryArea)) {
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
      console.log('[handleWheel] Mouse position in canvas:', { mouseX, mouseY });
      console.log('[handleWheel] Canvas rect:', rect);

      // 줌 델타 계산 (휠 방향에 따라)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.01, Math.min(5, canvasScale * zoomFactor));
      console.log('[handleWheel] Current scale:', canvasScale, '→ New scale:', newScale);

      if (newScale !== canvasScale) {
        console.log('[handleWheel] Before zoom - offset:', canvasOffset, 'scale:', canvasScale);

        // 마우스 위치 아래의 월드 좌표 계산 (줌 전)
        const worldX = (mouseX - canvasOffset.x) / canvasScale;
        const worldY = (mouseY - canvasOffset.y) / canvasScale;
        console.log('[handleWheel] World coords under mouse:', { worldX, worldY });

        // 줌 후에도 같은 월드 좌표가 마우스 위치에 있도록 offset 조정
        const newOffsetX = mouseX - worldX * newScale;
        const newOffsetY = mouseY - worldY * newScale;
        console.log('[handleWheel] After zoom - new offset:', { x: newOffsetX, y: newOffsetY });

        setCanvasScale(newScale);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });

        // 검증: 줌 후 월드 좌표가 같은 화면 위치에 있는지 확인
        const verifyScreenX = newOffsetX + worldX * newScale;
        const verifyScreenY = newOffsetY + worldY * newScale;
        console.log('[handleWheel] Verification - expected mouse pos:', { x: mouseX, y: mouseY }, 'actual:', { x: verifyScreenX, y: verifyScreenY });
      }
    }
  }, [currentTool, canvasScale, canvasOffset, setCanvasScale, setCanvasOffset]);

  /**
   * 마우스 이동 핸들러 (연결선, 팬)
   */
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (isConnecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      // 화면 좌표를 원본 좌표로 변환 (SVG가 동일한 transform을 사용하므로)
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
    handleCanvasDrop,
    handleCanvasDragOver
  };
};
