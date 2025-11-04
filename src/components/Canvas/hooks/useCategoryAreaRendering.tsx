import React from 'react';
import { Page, CategoryBlock, MemoBlock as MemoBlockType, MemoDisplaySize } from '../../../types';
import MemoBlock from '../../MemoBlock';
import { createCategoryAreaDragHandler, createCategoryAreaTouchHandler } from '../utils/categoryAreaDragHandlers';
import { useCategoryAreaColors } from './useCategoryAreaColors';

/**
 * useCategoryAreaRendering
 *
 * 카테고리 영역 렌더링 로직을 담당하는 훅
 *
 * **주요 기능:**
 * - 카테고리 영역 렌더링 (재귀적으로 하위 카테고리 포함)
 * - 카테고리 라벨 및 펼침/접기 UI
 * - Shift+드래그 시각적 힌트
 * - 드래그 선택 하이라이트
 *
 * @param params - 렌더링에 필요한 모든 매개변수
 * @returns 카테고리 영역 렌더링 함수들
 */

interface UseCategoryAreaRenderingParams {
  // Page 데이터
  currentPage: Page | undefined;

  // 영역 업데이트 트리거
  areaUpdateTrigger: number;
  recentlyDraggedCategoryRef: React.MutableRefObject<string | null>;

  // 연결 관련 상태
  isConnecting: boolean;
  connectingFromId: string | null;

  // 드래그 관련 상태
  isDraggingMemo?: boolean;
  draggingMemoId?: string | null;
  isDraggingCategory?: boolean;
  draggingCategoryId?: string | null;
  isShiftPressed?: boolean;
  dragHoveredCategoryIds: string[];

  // 카테고리 영역 캐시
  draggedCategoryAreas: {
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  };
  shiftDragAreaCache: React.MutableRefObject<{ [categoryId: string]: any }>;
  renderedCategoryAreas: React.MutableRefObject<{
    [categoryId: string]: { x: number; y: number; width: number; height: number };
  }>;

  // Shift 드래그 정보
  shiftDragInfo: {
    categoryId: string;
    offset: { x: number; y: number };
  } | null;

  // 드래그 타겟
  dragTargetCategoryId: string | null;
  isDraggingCategoryArea: string | null;

  // 캔버스 스케일
  canvasScale: number;

  // 선택 관련
  selectedMemoId: string | null;
  selectedMemoIds: string[];
  selectedCategoryId: string | null;
  selectedCategoryIds: string[];
  dragHoveredMemoIds: string[];

  // 필터 관련
  activeImportanceFilters: Set<any>;
  showGeneralContent: boolean;

  // 핸들러들
  onConnectMemos: (fromId: string, toId: string) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onStartConnection?: (id: string, direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryToggleExpanded: (categoryId: string) => void;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onShiftDropCategory?: (category: CategoryBlock, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onMemoDisplaySizeChange?: (memoId: string, displaySize: MemoDisplaySize) => void;
  onMemoTitleUpdate?: (memoId: string, title: string) => void;
  onMemoBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void;
  onMemoDragStart?: (memoId: string) => void;
  onMemoDragEnd?: () => void;
  onDeleteMemoById?: (id: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onOpenEditor?: () => void;

  // 상태 Setters
  setIsDraggingCategoryArea: (value: string | null) => void;
  setShiftDragInfo: (value: { categoryId: string; offset: { x: number; y: number } } | null) => void;
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>>;
  setAreaContextMenu: (value: { x: number; y: number; categoryId: string } | null) => void;

  // 카테고리 편집 상태
  editingCategoryId: string | null;
  setEditingCategoryId: (value: string | null) => void;
  editingCategoryTitle: string;
  setEditingCategoryTitle: (value: string) => void;

  // 기타
  canvasOffset?: { x: number; y: number };
  handleDropOnCategoryArea: (e: React.DragEvent, categoryId: string) => void;
  handleCategoryAreaDragOver: (e: React.DragEvent) => void;

  // 영역 계산 함수
  calculateArea: (category: CategoryBlock) => any;
}

export const useCategoryAreaRendering = (params: UseCategoryAreaRenderingParams) => {
  const {
    currentPage,
    areaUpdateTrigger,
    recentlyDraggedCategoryRef,
    isConnecting,
    connectingFromId,
    isDraggingMemo,
    draggingMemoId,
    isDraggingCategory,
    draggingCategoryId,
    isShiftPressed,
    dragHoveredCategoryIds,
    draggedCategoryAreas,
    shiftDragAreaCache,
    renderedCategoryAreas,
    shiftDragInfo,
    dragTargetCategoryId,
    isDraggingCategoryArea,
    canvasScale,
    selectedMemoId,
    selectedMemoIds,
    selectedCategoryId,
    selectedCategoryIds,
    dragHoveredMemoIds,
    activeImportanceFilters,
    showGeneralContent,
    onConnectMemos,
    onCategorySelect,
    onMemoSelect,
    onStartConnection,
    onCategoryPositionChange,
    onCategoryLabelPositionChange,
    onCategoryToggleExpanded,
    onCategoryPositionDragEnd,
    onShiftDropCategory,
    onDetectCategoryDropForCategory,
    onMemoPositionChange,
    onMemoSizeChange,
    onMemoDisplaySizeChange,
    onMemoTitleUpdate,
    onMemoBlockUpdate,
    onDetectCategoryOnDrop,
    onMemoDragStart,
    onMemoDragEnd,
    onDeleteMemoById,
    onAddQuickNav,
    isQuickNavExists,
    onCategoryUpdate,
    onOpenEditor,
    setIsDraggingCategoryArea,
    setShiftDragInfo,
    setDraggedCategoryAreas,
    setAreaContextMenu,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryTitle,
    setEditingCategoryTitle,
    canvasOffset,
    handleDropOnCategoryArea,
    handleCategoryAreaDragOver,
    calculateArea
  } = params;

  // 카테고리 영역 색상 훅 사용
  const { calculateCategoryAreaWithColor } = useCategoryAreaColors({
    currentPage,
    areaUpdateTrigger,
    recentlyDraggedCategoryRef
  });

  /**
   * 단일 카테고리 영역 렌더링 (재귀적)
   * 카테고리 영역, 라벨, 연결점, Shift+드래그 힌트 등을 렌더링하고
   * 하위 카테고리도 재귀적으로 렌더링합니다.
   */
  const renderSingleCategoryArea = React.useCallback((category: CategoryBlock): React.ReactNode[] => {
    const areas: React.ReactNode[] = [];

    // 현재 카테고리의 영역 계산 (훅 사용)
    let area: any = calculateArea(category);

    // 하위 아이템이 있으면 항상 카테고리 라벨 표시 (펼침/접기 상관없이)
    const childMemos = currentPage?.memos.filter(memo => memo.parentId === category.id) || [];
    const childCategories = currentPage?.categories?.filter(cat => cat.parentId === category.id) || [];
    const hasChildren = childMemos.length > 0 || childCategories.length > 0;

    // 확장 가능한 영역 배경 - 항상 표시 (isExpanded일 때)
    const shouldShowArea = category.isExpanded;

    if (area && shouldShowArea) {
      // 렌더링된 영역 정보 저장 (연결선 계산용)
      renderedCategoryAreas.current[category.id] = {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height
      };

      // Shift 드래그 시 UI 상태 확인
      let draggingItemParentId: string | null = null;
      let isCurrentParent = false;
      let isParentBeingLeftBehind = false;

      if (isShiftPressed && (isDraggingMemo || isDraggingCategory || isDraggingCategoryArea)) {
        // 드래그 중인 아이템의 현재 부모 ID 확인
        if (isDraggingMemo && draggingMemoId) {
          const draggingMemo = currentPage?.memos.find(m => m.id === draggingMemoId);
          draggingItemParentId = draggingMemo?.parentId || null;
        } else if ((isDraggingCategory && draggingCategoryId) || isDraggingCategoryArea) {
          const categoryId = draggingCategoryId || isDraggingCategoryArea;
          if (categoryId) {
            const draggingCategory = currentPage?.categories?.find(c => c.id === categoryId);
            draggingItemParentId = draggingCategory?.parentId || null;
          }
        }

        // 이 카테고리가 드래그 중인 아이템의 현재 부모인지 확인
        isCurrentParent = draggingItemParentId === category.id;

        // 부모 영역 UI (빼기)
        // 조건: 현재 부모이면 항상 빼기 UI 표시
        if (isCurrentParent) {
          isParentBeingLeftBehind = true;
        }
      }

      // 타겟 영역 확인 (추가 UI)
      // 조건: 마우스가 올라간 영역이면서, 현재 부모가 아님
      const isShiftDragTarget = isShiftPressed && dragTargetCategoryId === category.id && (isDraggingMemo || isDraggingCategory || isDraggingCategoryArea) && !isCurrentParent;

      // 드래그 선택 중 하이라이트
      const isDragHovered = dragHoveredCategoryIds?.includes(category.id) || false;

      // 드래그 중인 카테고리는 transform을 사용하여 GPU 가속 활용
      // 일반 드래그 또는 Shift+드래그 시 GPU 가속 적용
      const isDragging = draggedCategoryAreas[category.id] !== undefined;
      const isShiftDragging = isShiftPressed && isDraggingCategoryArea === category.id && shiftDragInfo !== null;
      const isAnyDragging = isDragging || isShiftDragging;

      const basePosition = isDragging && draggedCategoryAreas[category.id]
        ? {
            left: draggedCategoryAreas[category.id].area.x,
            top: draggedCategoryAreas[category.id].area.y
          }
        : { left: area.x, top: area.y };

      const deltaTransform = isDragging && draggedCategoryAreas[category.id]
        ? {
            x: area.x - draggedCategoryAreas[category.id].area.x,
            y: area.y - draggedCategoryAreas[category.id].area.y
          }
        : { x: 0, y: 0 };

      areas.push(
        <div
          key={`area-${category.id}`}
          data-category-area="true"
          data-category-id={category.id}
          draggable={false}
          style={{
            position: 'absolute',
            left: `${basePosition.left}px`,
            top: `${basePosition.top}px`,
            width: `${area.width}px`,
            height: `${area.height}px`,
            backgroundColor: isParentBeingLeftBehind
              ? 'rgba(239, 68, 68, 0.2)'  // 빨간색 (하위 요소 빼기)
              : (isShiftDragTarget ? 'rgba(16, 185, 129, 0.2)' : (isDragHovered ? 'rgba(59, 130, 246, 0.3)' : area.color)),  // 드래그 선택: 파란색
            border: isParentBeingLeftBehind
              ? '3px solid rgba(239, 68, 68, 0.6)'
              : (isShiftDragTarget ? '3px solid rgba(16, 185, 129, 0.6)' : (isDragHovered ? '3px solid rgba(59, 130, 246, 0.6)' : '2px dashed rgba(139, 92, 246, 0.3)')),
            borderRadius: '12px',
            pointerEvents: 'auto',
            cursor: 'move',
            zIndex: -1,
            transform: isDragging
              ? `translate(${deltaTransform.x}px, ${deltaTransform.y}px) ${(isShiftDragTarget || isParentBeingLeftBehind || isDragHovered) ? 'scale(1.02)' : 'scale(1)'}`
              : (isShiftDragTarget || isParentBeingLeftBehind || isDragHovered) ? 'scale(1.02)' : 'scale(1)',
            transition: isAnyDragging ? 'none' : 'background-color 0.2s ease, border 0.2s ease',
            willChange: 'transform',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onDrop={(e) => handleDropOnCategoryArea(e, category.id)}
          onDragOver={handleCategoryAreaDragOver}
          onMouseDown={createCategoryAreaDragHandler({
            category,
            isConnecting,
            isShiftPressed,
            canvasScale,
            canvasOffset,
            currentPage,
            area,
            draggedCategoryAreas,
            shiftDragAreaCache,
            calculateCategoryAreaWithColor,
            onCategorySelect,
            setIsDraggingCategoryArea,
            setShiftDragInfo,
            setDraggedCategoryAreas,
            onCategoryPositionChange,
            onCategoryPositionDragEnd,
            onDetectCategoryDropForCategory
          })}
          onTouchStart={createCategoryAreaTouchHandler({
            category,
            isConnecting,
            isShiftPressed,
            canvasScale,
            canvasOffset,
            currentPage,
            area,
            draggedCategoryAreas,
            shiftDragAreaCache,
            calculateCategoryAreaWithColor,
            onCategorySelect,
            setIsDraggingCategoryArea,
            setShiftDragInfo,
            setDraggedCategoryAreas,
            onCategoryPositionChange,
            onCategoryPositionDragEnd,
            onDetectCategoryDropForCategory
          })}
          onMouseUp={(e) => {
            // 연결 모드일 때 영역 어디에나 연결선을 놓으면 연결
            if (isConnecting && connectingFromId && connectingFromId !== category.id) {
              e.stopPropagation();
              onConnectMemos(connectingFromId, category.id);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCategorySelect(category.id);
            setAreaContextMenu({ x: e.clientX, y: e.clientY, categoryId: category.id });
          }}
        >
          {isShiftDragTarget && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#059669',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 1000
            }}>
              하위 요소 추가
            </div>
          )}
          {isParentBeingLeftBehind && (
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ef4444',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 1000
            }}>
              하위 요소 빼기
            </div>
          )}
          {!isShiftDragTarget && !isParentBeingLeftBehind && !hasChildren && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              fontSize: '16px',
              color: 'rgba(139, 92, 246, 0.5)',
              fontWeight: '600',
              pointerEvents: 'none',
              textAlign: 'center',
              padding: '20px',
              userSelect: 'none'
            }}>
              SHIFT + 드래그로 메모나 카테고리를<br/>다른 카테고리 영역에 종속, 제거하세요
            </div>
          )}

          {/* 영역 연결점들 - 4방향 */}
          {/* Top */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!isConnecting) {
                onCategorySelect(category.id);
                onStartConnection?.(category.id, 'top');
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (isConnecting && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
            }}
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Bottom */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!isConnecting) {
                onCategorySelect(category.id);
                onStartConnection?.(category.id, 'bottom');
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (isConnecting && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
            }}
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Left */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!isConnecting) {
                onCategorySelect(category.id);
                onStartConnection?.(category.id, 'left');
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (isConnecting && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
            }}
            style={{
              position: 'absolute',
              left: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Right */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!isConnecting) {
                onCategorySelect(category.id);
                onStartConnection?.(category.id, 'right');
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (isConnecting && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
            }}
            style={{
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto'
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>
      );
    }


    // 카테고리 이름 라벨은 항상 표시
    if (true) {
      // 라벨 위치는 영역의 좌상단에 고정
      const labelX = area?.x || category.position.x;
      const labelY = area?.y || category.position.y;

      // Shift+드래그 중인지 확인 (카테고리 블록 드래그 또는 카테고리 영역 드래그)
      const isCurrentCategoryBeingDragged = (isDraggingCategory && draggingCategoryId === category.id) || (isDraggingCategoryArea === category.id);
      const isShiftDragging = isCurrentCategoryBeingDragged && isShiftPressed;

      // 편집 모드 여부 확인
      const isEditing = editingCategoryId === category.id;

      areas.push(
        <div
          key={`label-${category.id}`}
          draggable={false}
          style={{
            position: 'absolute',
            top: `${labelY}px`,
            left: `${labelX}px`,
            backgroundColor: isShiftDragging ? '#10b981' : '#8b5cf6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '26px',
            fontWeight: '600',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: isEditing ? 'text' : 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            border: isShiftDragging ? '3px solid #059669' : 'none'
          }}
          onClick={() => !isEditing && onCategorySelect(category.id)}
          onDoubleClick={(e) => {
            e.stopPropagation();

            // 모바일(onOpenEditor가 있을 때)에서는 에디터 열기
            if (onOpenEditor) {
              onOpenEditor();
              return;
            }

            // 데스크톱에서는 편집 모드로
            setEditingCategoryId(category.id);
            setEditingCategoryTitle(category.title);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCategorySelect(category.id);
            setAreaContextMenu({ x: e.clientX, y: e.clientY, categoryId: category.id });
          }}
          onMouseDown={(e) => {
            // 편집 모드일 때는 드래그 방지
            if (isEditing) {
              return;
            }
            if (e.button === 0) {
              // 라벨 드래그 시작 - 라벨만 이동
              e.stopPropagation();

              let startX = e.clientX;
              let startY = e.clientY;
              const originalLabelPosition = { x: category.position.x, y: category.position.y };
              let hasMoved = false;
              let isDragging = false; // 임계값 통과 전까지는 false
              const DRAG_THRESHOLD = 5; // 드래그 임계값 (픽셀)

              const handleMouseMove = (moveEvent: MouseEvent) => {
                // 임계값 확인
                if (!isDragging) {
                  const distance = Math.sqrt(
                    Math.pow(moveEvent.clientX - startX, 2) +
                    Math.pow(moveEvent.clientY - startY, 2)
                  );

                  // 임계값을 넘으면 드래그 시작
                  if (distance >= DRAG_THRESHOLD) {
                    isDragging = true;
                    hasMoved = true;
                    onCategorySelect(category.id); // 드래그 시작 시 선택
                  }
                }

                if (!isDragging) return; // 드래그 시작 전까지 위치 업데이트 안함

                hasMoved = true;

                const deltaX = (moveEvent.clientX - startX) / canvasScale;
                const deltaY = (moveEvent.clientY - startY) / canvasScale;

                const newLabelPosition = {
                  x: originalLabelPosition.x + deltaX,
                  y: originalLabelPosition.y + deltaY
                };

                // 라벨만 이동
                onCategoryLabelPositionChange(category.id, newLabelPosition);
              };

              const handleMouseUp = (upEvent?: MouseEvent) => {
                console.log('[Label handleMouseUp] 호출됨', {
                  categoryId: category.id,
                  hasMoved,
                  isDragging,
                  isShiftPressed,
                  upEventShiftKey: upEvent?.shiftKey,
                  upEventExists: !!upEvent
                });

                // 드래그가 발생하지 않았을 때: 클릭으로 처리 (카테고리 선택)
                if (!hasMoved && !isDragging) {
                  onCategorySelect(category.id);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  document.removeEventListener('mouseleave', handleMouseLeave);
                  return;
                }

                isDragging = false; // 즉시 드래그 종료 플래그 설정

                // Shift+드래그면 카테고리 드롭 감지 호출
                // upEvent.shiftKey로 실시간 Shift 키 상태 확인
                const wasShiftPressed = upEvent?.shiftKey || isShiftPressed;

                console.log('[Label handleMouseUp] Shift 체크', {
                  wasShiftPressed,
                  willCallDetect: hasMoved && wasShiftPressed
                });

                if (hasMoved && wasShiftPressed) {
                  // 카테고리 라벨의 최종 위치 (라벨 이동용)
                  const finalLabelPosition = {
                    x: originalLabelPosition.x + ((upEvent?.clientX || startX) - startX) / canvasScale,
                    y: originalLabelPosition.y + ((upEvent?.clientY || startY) - startY) / canvasScale
                  };

                  // 마우스 포인터의 실제 위치 계산 (충돌 검사용)
                  const canvasElement = document.getElementById('main-canvas');
                  let mousePointerPosition = finalLabelPosition; // fallback

                  if (canvasElement && canvasOffset && upEvent) {
                    const rect = canvasElement.getBoundingClientRect();
                    const clientX = upEvent.clientX;
                    const clientY = upEvent.clientY;

                    // 캔버스 좌표계로 변환
                    const mouseX = (clientX - rect.left - canvasOffset.x) / canvasScale;
                    const mouseY = (clientY - rect.top - canvasOffset.y) / canvasScale;

                    mousePointerPosition = { x: mouseX, y: mouseY };
                  }

                  console.log('[Label MouseUp] Shift+드래그 종료 - detectCategoryDropForCategory 호출', {
                    categoryId: category.id,
                    finalLabelPosition,
                    mousePointerPosition
                  });

                  // 마우스 포인터 위치로 전달 (점 충돌 검사용)
                  onDetectCategoryDropForCategory?.(category.id, mousePointerPosition);
                }

                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              // mouseup 이벤트가 누락되는 경우를 대비한 안전장치
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
            }
          }}
          onTouchStart={(e) => {
            // 편집 모드일 때는 드래그 방지
            if (isEditing || e.touches.length !== 1) {
              return;
            }

            // 라벨 터치 드래그 시작 - 라벨만 이동
            e.stopPropagation();

            const touch = e.touches[0];
            let startX = touch.clientX;
            let startY = touch.clientY;
            const originalLabelPosition = { x: category.position.x, y: category.position.y };
            let hasMoved = false;
            let isDragging = false; // 임계값 통과 전까지는 false
            const DRAG_THRESHOLD = 5; // 드래그 임계값 (픽셀)

            const handleTouchMove = (moveEvent: TouchEvent) => {
              if (moveEvent.touches.length !== 1) return;

              const touch = moveEvent.touches[0];
              const distance = Math.sqrt(
                Math.pow(touch.clientX - startX, 2) +
                Math.pow(touch.clientY - startY, 2)
              );

              // 임계값을 넘으면 드래그 시작
              if (!isDragging && distance >= DRAG_THRESHOLD) {
                isDragging = true;
                hasMoved = true;
                // 드래그 시작 시 카테고리 선택 (우측 패널 표시)
                onCategorySelect(category.id);
              }

              // 드래그 중일 때만 위치 업데이트
              if (!isDragging) return;

              const deltaX = (touch.clientX - startX) / canvasScale;
              const deltaY = (touch.clientY - startY) / canvasScale;

              const newLabelPosition = {
                x: originalLabelPosition.x + deltaX,
                y: originalLabelPosition.y + deltaY
              };

              // 라벨만 이동
              onCategoryLabelPositionChange(category.id, newLabelPosition);
              moveEvent.preventDefault(); // 스크롤 방지
            };

            // 더블탭 감지를 위한 타임스탬프
            let lastTapTime = 0;
            const DOUBLE_TAP_DELAY = 300;

            const handleTouchEnd = (upEvent?: TouchEvent) => {
              // 드래그가 없었을 때만 탭/더블탭 감지
              if (!hasMoved && !isDragging) {
                const currentTime = new Date().getTime();
                const tapTimeDiff = currentTime - lastTapTime;

                if (tapTimeDiff < DOUBLE_TAP_DELAY && tapTimeDiff > 0) {
                  // 더블탭: 에디터 열기
                  if (onOpenEditor) {
                    onOpenEditor();
                  } else {
                    // 데스크톱: 편집 모드
                    setEditingCategoryId(category.id);
                    setEditingCategoryTitle(category.title);
                  }
                  lastTapTime = 0; // 리셋
                } else {
                  // 싱글탭: 카테고리 선택
                  onCategorySelect(category.id);
                  lastTapTime = currentTime;
                }
              }

              isDragging = false; // 드래그 종료

              // Shift+드래그는 모바일에서 지원하지 않음 (isShiftPressed는 항상 false)
              const wasShiftPressed = isShiftPressed;

              if (hasMoved && wasShiftPressed && upEvent?.changedTouches.length) {
                const touch = upEvent.changedTouches[0];
                // 카테고리 라벨의 최종 위치 (라벨 이동용)
                const finalLabelPosition = {
                  x: originalLabelPosition.x + (touch.clientX - startX) / canvasScale,
                  y: originalLabelPosition.y + (touch.clientY - startY) / canvasScale
                };

                // 터치 포인터의 실제 위치 계산 (충돌 검사용)
                const canvasElement = document.getElementById('main-canvas');
                let touchPointerPosition = finalLabelPosition; // fallback

                if (canvasElement && canvasOffset) {
                  const rect = canvasElement.getBoundingClientRect();
                  const clientX = touch.clientX;
                  const clientY = touch.clientY;

                  // 캔버스 좌표계로 변환
                  const touchX = (clientX - rect.left - canvasOffset.x) / canvasScale;
                  const touchY = (clientY - rect.top - canvasOffset.y) / canvasScale;

                  touchPointerPosition = { x: touchX, y: touchY };
                }

                // 터치 포인터 위치로 전달 (점 충돌 검사용)
                onDetectCategoryDropForCategory?.(category.id, touchPointerPosition);
              }

              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
              document.removeEventListener('touchcancel', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd);
          }}
        >
          {isShiftDragging && (
            <span style={{ fontSize: '32px', fontWeight: 'bold', marginRight: '-4px' }}>+</span>
          )}
          {isEditing ? (
            <input
              type="text"
              value={editingCategoryTitle}
              onChange={(e) => setEditingCategoryTitle(e.target.value)}
              onBlur={() => {
                if (editingCategoryTitle.trim()) {
                  onCategoryUpdate({ ...category, title: editingCategoryTitle.trim() });
                }
                setEditingCategoryId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingCategoryTitle.trim()) {
                    onCategoryUpdate({ ...category, title: editingCategoryTitle.trim() });
                  }
                  setEditingCategoryId(null);
                } else if (e.key === 'Escape') {
                  setEditingCategoryId(null);
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '26px',
                fontWeight: '600',
                padding: '4px 8px',
                outline: 'none',
                width: 'auto',
                minWidth: '200px'
              }}
            />
          ) : (
            <span>{category.title}</span>
          )}
          <button
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '20px',
              padding: '4px 8px',
              cursor: 'pointer',
              minWidth: '32px',
              minHeight: '32px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCategoryToggleExpanded(category.id);
            }}
            title={category.isExpanded ? "접기" : "펼치기"}
          >
            {category.isExpanded ? '−' : '+'}
          </button>
        </div>
      );

    }

    // 하위 카테고리들의 영역도 재귀적으로 렌더링
    if (currentPage?.categories) {
      const childCategories = currentPage.categories.filter(cat => cat.parentId === category.id);
      childCategories.forEach(childCategory => {
        areas.push(...renderSingleCategoryArea(childCategory));
      });
    }

    return areas;
  }, [
    currentPage,
    calculateArea,
    renderedCategoryAreas,
    draggingMemoId,
    draggingCategoryId,
    dragTargetCategoryId,
    dragHoveredCategoryIds,
    isConnecting,
    connectingFromId,
    canvasScale,
    setIsDraggingCategoryArea,
    setShiftDragInfo,
    setDraggedCategoryAreas,
    onCategoryPositionChange,
    onCategoryPositionDragEnd,
    onShiftDropCategory,
    onDetectCategoryDropForCategory,
    onConnectMemos,
    onCategorySelect,
    setAreaContextMenu,
    onStartConnection,
    onCategoryLabelPositionChange,
    onCategoryToggleExpanded,
    handleDropOnCategoryArea,
    handleCategoryAreaDragOver,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryTitle,
    setEditingCategoryTitle,
    onCategoryUpdate,
    isDraggingCategoryArea,
    isShiftPressed,
    isDraggingMemo,
    isDraggingCategory
  ]);

  /**
   * 카테고리 영역 렌더링 (최상위 카테고리들)
   * 최상위 카테고리들을 찾아서 renderSingleCategoryArea를 호출합니다.
   */
  const renderCategoryAreas = React.useCallback(() => {
    if (!currentPage?.categories) return null;

    const allAreas: React.ReactNode[] = [];

    // 최상위 카테고리들부터 시작해서 재귀적으로 모든 영역 렌더링
    const topLevelCategories = currentPage.categories.filter(category => !category.parentId);
    topLevelCategories.forEach(category => {
      allAreas.push(...renderSingleCategoryArea(category));
    });

    return allAreas;
  }, [currentPage, renderSingleCategoryArea]);

  /**
   * 카테고리와 하위 아이템들을 재귀적으로 렌더링하는 함수
   * (현재는 사용되지 않지만 호환성을 위해 유지)
   */
  const renderCategoryWithChildren = React.useCallback((category: CategoryBlock): React.ReactNode => {
    if (!currentPage) return null;

    // 하위 메모들과 카테고리들 찾기
    const childMemos = currentPage.memos.filter(memo => memo.parentId === category.id);
    const childCategories = currentPage.categories?.filter(cat => cat.parentId === category.id) || [];

    // 하위 아이템들 렌더링
    const childrenElements = category.isExpanded ? (
      <>
        {childMemos.map(memo => (
          <MemoBlock
            key={memo.id}
            memo={memo}
            isSelected={selectedMemoId === memo.id || selectedMemoIds.includes(memo.id)}
            isDragHovered={dragHoveredMemoIds?.includes(memo.id) || false}
            onClick={(isShiftClick?: boolean) => onMemoSelect(memo.id, isShiftClick)}
            onPositionChange={onMemoPositionChange}
            onSizeChange={onMemoSizeChange}
            onDisplaySizeChange={onMemoDisplaySizeChange}
            onTitleUpdate={onMemoTitleUpdate}
            onBlockUpdate={onMemoBlockUpdate}
            onDetectCategoryOnDrop={onDetectCategoryOnDrop}
            isConnecting={isConnecting}
            connectingFromId={connectingFromId}
            onStartConnection={onStartConnection}
            onConnectMemos={onConnectMemos}
            canvasScale={canvasScale}
            canvasOffset={canvasOffset}
            activeImportanceFilters={activeImportanceFilters}
            showGeneralContent={showGeneralContent}
            enableImportanceBackground={true}
            onDragStart={onMemoDragStart}
            onDragEnd={onMemoDragEnd}
            currentPage={currentPage}
            isDraggingAnyMemo={isDraggingMemo}
            isShiftPressed={isShiftPressed}
            onDelete={onDeleteMemoById}
            onAddQuickNav={onAddQuickNav}
            isQuickNavExists={isQuickNavExists}
            onOpenEditor={onOpenEditor}
          />
        ))}
        {childCategories.map(childCategory => (
          <React.Fragment key={childCategory.id}>
            {renderCategoryWithChildren(childCategory)}
          </React.Fragment>
        ))}
      </>
    ) : null;

    // 하위 아이템 여부 계산
    const hasChildren = childMemos.length > 0 || childCategories.length > 0;

    // 카테고리 블록은 더 이상 렌더링하지 않음 (영역과 라벨만 표시)
    return null;
  }, [
    currentPage,
    selectedMemoId,
    selectedMemoIds,
    dragHoveredMemoIds,
    onMemoSelect,
    onMemoPositionChange,
    onMemoSizeChange,
    onMemoDisplaySizeChange,
    onMemoTitleUpdate,
    onMemoBlockUpdate,
    onDetectCategoryOnDrop,
    isConnecting,
    connectingFromId,
    onStartConnection,
    onConnectMemos,
    canvasScale,
    canvasOffset,
    activeImportanceFilters,
    showGeneralContent,
    onMemoDragStart,
    onMemoDragEnd,
    isDraggingMemo,
    isShiftPressed,
    onDeleteMemoById,
    onAddQuickNav,
    isQuickNavExists
  ]);

  return {
    renderSingleCategoryArea,
    renderCategoryAreas,
    renderCategoryWithChildren
  };
};
