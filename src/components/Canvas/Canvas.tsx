import React from 'react';
import { Page, MemoDisplaySize, ImportanceLevel, CategoryBlock } from '../../types';
import { isInsideCollapsedCategory } from '../../utils/categoryHierarchyUtils';
import MemoBlock from '../MemoBlock';
import ImportanceFilter from '../ImportanceFilter';
import ContextMenu from '../ContextMenu';
import QuickNavModal from '../QuickNavModal';
import { useCanvasState } from './useCanvasState';
import { useCanvasEffects } from './useCanvasEffects';
import { useCanvasHandlers } from './useCanvasHandlers';
import { useCanvasRendering } from './useCanvasRendering';
import { usePinchZoom } from './hooks/usePinchZoom';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from '../../scss/components/Canvas.module.scss';

interface CanvasProps {
  currentPage: Page | undefined;
  selectedMemoId: string | null;
  selectedMemoIds: string[];
  selectedCategoryId: string | null;
  selectedCategoryIds: string[];
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onAddMemo: (position?: { x: number; y: number }) => void;
  onAddCategory: (position?: { x: number; y: number }) => void;
  onDeleteMemo: () => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteSelected: () => void;
  onDisconnectMemo: () => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onCategorySizeChange: (categoryId: string, size: { width: number; height: number }) => void;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onCategoryToggleExpanded: (categoryId: string) => void;
  onMoveToCategory: (itemId: string, categoryId: string | null) => void;
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onMemoDisplaySizeChange?: (memoId: string, displaySize: MemoDisplaySize) => void;
  onMemoTitleUpdate?: (memoId: string, title: string) => void;
  onMemoBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  connectingFromDirection: 'top' | 'bottom' | 'left' | 'right' | null;
  dragLineEnd: { x: number; y: number } | null;
  onStartConnection: (memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCancelConnection: () => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onUpdateDragLine: (mousePos: { x: number; y: number }) => void;
  isDragSelecting: boolean;
  dragSelectStart: { x: number; y: number } | null;
  dragSelectEnd: { x: number; y: number } | null;
  dragHoveredMemoIds: string[];
  dragHoveredCategoryIds: string[];
  onDragSelectStart: (position: { x: number; y: number }, isShiftPressed: boolean) => void;
  onDragSelectMove: (position: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;
  activeImportanceFilters: Set<ImportanceLevel>;
  onToggleImportanceFilter: (level: ImportanceLevel) => void;
  showGeneralContent: boolean;
  onToggleGeneralContent: () => void;
  alwaysShowContent?: boolean;
  onToggleAlwaysShowContent?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDraggingMemo?: boolean;
  draggingMemoId?: string | null;
  onMemoDragStart?: (memoId: string) => void;
  onMemoDragEnd?: () => void;
  isDraggingCategory?: boolean;
  draggingCategoryId?: string | null;
  onCategoryDragStart?: () => void;
  onCategoryDragEnd?: () => void;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onClearCategoryCache?: (categoryId: string) => void;
  isShiftPressed?: boolean;
  shiftDragAreaCacheRef?: React.MutableRefObject<{[categoryId: string]: any}>;
  onShiftDropCategory?: (category: CategoryBlock, position: { x: number; y: number }) => void;
  canvasOffset?: { x: number; y: number };
  setCanvasOffset?: (offset: { x: number; y: number }) => void;
  canvasScale?: number;
  setCanvasScale?: (scale: number) => void;
  onDeleteMemoById?: (id: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  onDeleteQuickNav?: (targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  fullscreen?: boolean;  // Mobile fullscreen mode
  onOpenEditor?: () => void;  // Mobile: Open editor on double-tap
  isLongPressActive?: boolean;  // 롱프레스 활성화 상태
  longPressTargetId?: string | null;  // 롱프레스 대상 ID (메모 또는 카테고리)
  setIsLongPressActive?: (active: boolean, targetId?: string | null) => void;  // 롱프레스 상태 업데이트
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref 추가
  toolbarOffset?: number;  // 태블릿 가로모드: toolbar 왼쪽 이동 거리 (px)
}

const Canvas: React.FC<CanvasProps> = ({
  currentPage,
  selectedMemoId,
  selectedMemoIds,
  selectedCategoryId,
  selectedCategoryIds,
  onMemoSelect,
  onCategorySelect,
  onAddMemo,
  onAddCategory,
  onDeleteMemo,
  onDeleteCategory,
  onDeleteSelected,
  onDisconnectMemo,
  onMemoPositionChange,
  onCategoryPositionChange,
  onCategoryLabelPositionChange,
  onMemoSizeChange,
  onCategorySizeChange,
  onCategoryUpdate,
  onCategoryToggleExpanded,
  onMoveToCategory,
  onDetectCategoryOnDrop,
  onDetectCategoryDropForCategory,
  onMemoDisplaySizeChange,
  onMemoTitleUpdate,
  onMemoBlockUpdate,
  isConnecting,
  isDisconnectMode,
  connectingFromId,
  connectingFromDirection,
  dragLineEnd,
  onStartConnection,
  onConnectMemos,
  onCancelConnection,
  onRemoveConnection,
  onUpdateDragLine,
  isDragSelecting,
  dragSelectStart,
  dragSelectEnd,
  dragHoveredMemoIds,
  dragHoveredCategoryIds,
  onDragSelectStart,
  onDragSelectMove,
  onDragSelectEnd,
  activeImportanceFilters,
  onToggleImportanceFilter,
  showGeneralContent,
  onToggleGeneralContent,
  alwaysShowContent = false,
  onToggleAlwaysShowContent,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDraggingMemo = false,
  draggingMemoId = null,
  onMemoDragStart,
  onMemoDragEnd,
  isDraggingCategory = false,
  draggingCategoryId = null,
  onCategoryDragStart,
  onCategoryDragEnd,
  onCategoryPositionDragEnd,
  onClearCategoryCache,
  isShiftPressed = false,
  shiftDragAreaCacheRef,
  onShiftDropCategory,
  canvasOffset: externalCanvasOffset,
  setCanvasOffset: externalSetCanvasOffset,
  canvasScale: externalCanvasScale,
  setCanvasScale: externalSetCanvasScale,
  onDeleteMemoById,
  onAddQuickNav,
  onDeleteQuickNav,
  isQuickNavExists,
  fullscreen = false,
  onOpenEditor,
  isLongPressActive = false,  // 롱프레스 활성화 상태
  longPressTargetId = null,  // 롱프레스 대상 ID
  setIsLongPressActive,
  setIsShiftPressed,  // Shift 상태 업데이트 함수
  isShiftPressedRef  // Shift ref 추가
}) => {
  // ===== Canvas Ref =====
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // 태블릿 가로모드 감지 (ImportanceFilter 숨기기 위함)
  const isTabletLandscape = useMediaQuery('(min-width: 769px) and (max-width: 1366px) and (orientation: landscape)');

  // ===== Canvas 로컬 상태 (useCanvasState 훅 사용) =====
  const canvasState = useCanvasState();
  const {
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    localCanvasOffset,
    setLocalCanvasOffset,
    localCanvasScale,
    setLocalCanvasScale,
    currentTool,
    setCurrentTool,
    baseTool,
    setBaseTool,
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,
    isMouseOverCanvas,
    setIsMouseOverCanvas,
    areaUpdateTrigger,
    setAreaUpdateTrigger,
    draggedCategoryAreas,
    setDraggedCategoryAreas,
    isDraggingCategoryArea,
    setIsDraggingCategoryArea,
    shiftDragInfo,
    setShiftDragInfo,
    dragTargetCategoryId,
    setDragTargetCategoryId,
    areaContextMenu,
    setAreaContextMenu,
    showAreaQuickNavModal,
    setShowAreaQuickNavModal,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryTitle,
    setEditingCategoryTitle,
    globalDragSelecting,
    setGlobalDragSelecting,
    globalDragStart,
    setGlobalDragStart,
    globalDragWithShift,
    setGlobalDragWithShift,
    dragThresholdMet,
    setDragThresholdMet,
    justFinishedDragSelection,
    setJustFinishedDragSelection,
    shiftDragAreaCache: localShiftDragAreaCache,
    renderedCategoryAreas
  } = canvasState;

  // 로컬 clearCategoryCache 생성 (areaUpdateTrigger 증가 포함)
  const localClearCategoryCache = React.useCallback((categoryId: string) => {
    if (onClearCategoryCache) {
      onClearCategoryCache(categoryId);
    }
    // 캐시 클리어 후 영역 재계산 트리거
    setAreaUpdateTrigger(prev => prev + 1);
  }, [onClearCategoryCache, setAreaUpdateTrigger]);

  // Use external state if provided, otherwise use local state
  const canvasOffset = externalCanvasOffset !== undefined ? externalCanvasOffset : localCanvasOffset;
  const setCanvasOffset = externalSetCanvasOffset || setLocalCanvasOffset;
  const canvasScale = externalCanvasScale !== undefined ? externalCanvasScale : localCanvasScale;
  const setCanvasScale = externalSetCanvasScale || setLocalCanvasScale;

  // Shift 드래그 중 영역 캐시 (App.tsx에서 전달된 ref 사용하거나 로컬 ref 사용)
  const shiftDragAreaCache = shiftDragAreaCacheRef || localShiftDragAreaCache;

  // ===== 핀치 줌 (모바일 전용) =====
  usePinchZoom({
    canvasRef,
    canvasScale,
    setCanvasScale,
    canvasOffset,
    setCanvasOffset,
    isMobile: fullscreen  // fullscreen prop을 모바일 여부로 사용
  });

  // 최근 드래그 종료된 카테고리 ID (영역 계산 로그용)
  const recentlyDraggedCategoryRef = React.useRef<string | null>(null);

  // 선택 해제 함수
  const handleDeselectAll = React.useCallback(() => {
    onMemoSelect('', false); // 빈 문자열로 선택 해제
  }, [onMemoSelect]);

  // ===== useCanvasHandlers 훅 사용 =====
  const handlers = useCanvasHandlers({
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
    onDeselectAll: handleDeselectAll,
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
    calculateCategoryAreaWithColor: () => null, // placeholder, will be provided by rendering hook
    recentlyDraggedCategoryRef
  });

  const {
    handleMemoPositionChange,
    handleCanvasMouseDown,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleCanvasDrop,
    handleCanvasDragOver,
    handleDropOnCategoryArea,
    handleCategoryAreaDragOver
  } = handlers;

  // ===== useCanvasRendering 훅 사용 =====
  const {
    calculateCategoryAreaWithColor,
    renderConnectionLines,
    renderCategoryAreas
  } = useCanvasRendering({
    currentPage,
    isConnecting,
    isDisconnectMode,
    connectingFromId,
    connectingFromDirection,
    dragLineEnd,
    isDraggingMemo,
    draggingMemoId,
    isDraggingCategory,
    draggingCategoryId,
    onOpenEditor,
    isShiftPressed,
    dragHoveredCategoryIds,
    draggedCategoryAreas,
    shiftDragAreaCache,
    renderedCategoryAreas,
    shiftDragInfo,
    dragTargetCategoryId,
    isDraggingCategoryArea,
    areaUpdateTrigger,
    canvasScale,
    recentlyDraggedCategoryRef,
    selectedMemoId,
    selectedMemoIds,
    selectedCategoryId,
    selectedCategoryIds,
    dragHoveredMemoIds,
    activeImportanceFilters,
    showGeneralContent,
    onRemoveConnection,
    onConnectMemos,
    onCategorySelect,
    onMemoSelect,
    onStartConnection,
    onUpdateDragLine,  // 🔥 추가: 카테고리 연결점 드래그 시 연결선이 커서를 따라가도록
    onCancelConnection,  // 🔥 추가: 카테고리 연결 취소 시 연결선 제거
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
    onDeleteQuickNav,
    isQuickNavExists,
    onCategoryUpdate,
    onDeleteCategory,
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
    isLongPressActive,  // 롱프레스 활성화 상태
    longPressTargetId,  // 롱프레스 대상 ID
    setIsLongPressActive,
    setIsShiftPressed,
    isShiftPressedRef
  });

  // ===== useCanvasEffects 훅 사용 =====
  useCanvasEffects({
    areaContextMenu,
    setAreaContextMenu,
    currentTool,
    canvasScale,
    canvasOffset,
    setCanvasScale,
    setCanvasOffset,
    isDraggingMemo,
    isDraggingCategory,
    draggingMemoId,
    draggingCategoryId,
    isDraggingCategoryArea,
    isShiftPressed,
    shiftDragAreaCache,
    currentPage,
    setDraggedCategoryAreas,
    onClearCategoryCache: localClearCategoryCache,
    setAreaUpdateTrigger,
    isPanning,
    setIsPanning,
    panStart,
    globalDragSelecting,
    setGlobalDragSelecting,
    globalDragStart,
    globalDragWithShift,
    setGlobalDragWithShift,
    isDragSelecting,
    dragThresholdMet,
    setDragThresholdMet,
    setJustFinishedDragSelection,
    onDragSelectStart,
    onDragSelectMove,
    onDragSelectEnd,
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,
    baseTool,
    setCurrentTool,
    isMouseOverCanvas,
    isConnecting,
    onCancelConnection,
    onMemoSelect,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedMemoId,
    selectedCategoryId,
    selectedMemoIds,
    selectedCategoryIds,
    onDeleteSelected,
    setDragTargetCategoryId,
    fullscreen
  });

  // 모든 메모들 렌더링 (접힌 카테고리 안의 메모는 렌더링 시 제외)
  const allMemos = currentPage?.memos || [];

  // 드래그 선택 박스 렌더링
  const renderDragSelectionBox = () => {
    if (!isDragSelecting || !dragSelectStart || !dragSelectEnd) return null;

    const x = Math.min(dragSelectStart.x, dragSelectEnd.x);
    const y = Math.min(dragSelectStart.y, dragSelectEnd.y);
    const width = Math.abs(dragSelectEnd.x - dragSelectStart.x);
    const height = Math.abs(dragSelectEnd.y - dragSelectStart.y);

    return (
      <div
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          border: '2px solid #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      id="main-canvas"
      data-canvas="true"
      data-canvas-container
      data-tutorial="canvas"
      className={`${styles.canvas} ${fullscreen ? styles.fullscreen : ''}`}
      style={{
        cursor: currentTool === 'pan' ? 'grab' : currentTool === 'zoom' ? 'zoom-in' : 'default',
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#f9fafb'
        // z-index 제거: stacking context를 만들지 않아야 ImportanceFilter와 MobileSearchResults가 제대로 표시됨
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsMouseOverCanvas(true)}
      onMouseLeave={() => setIsMouseOverCanvas(false)}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
    >
      {/* SVG for connection lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isDisconnectMode ? 'auto' : 'none',  // 연결 해제 모드일 때만 클릭 가능
          overflow: 'visible',
          zIndex: isDisconnectMode ? 5 : 0
        }}
      >
        <defs>
          <style>
            {`
              @keyframes dash {
                to {
                  stroke-dashoffset: -20;
                }
              }
            `}
          </style>
        </defs>
        <g transform={`translate(${canvasOffset.x}, ${canvasOffset.y}) scale(${canvasScale})`}>
          {renderConnectionLines()}
        </g>
      </svg>

      {/* Main content container with transform */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
          transformOrigin: '0 0',
          width: '15000px',
          height: '15000px',
          pointerEvents: 'none'
        }}
      >
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          {/* Render category areas (includes areas, labels, and connection points) */}
          {renderCategoryAreas()}

          {/* Render all memos (including those in categories) */}
          {allMemos.map(memo => {
            // 접힌 카테고리 안에 있으면 렌더링하지 않음
            if (currentPage && isInsideCollapsedCategory(memo.id, currentPage)) {
              return null;
            }

            return (
              <MemoBlock
                key={memo.id}
                memo={memo}
                isSelected={selectedMemoId === memo.id || selectedMemoIds.includes(memo.id)}
                isDragHovered={dragHoveredMemoIds?.includes(memo.id) || false}
                onClick={(isShiftClick?: boolean) => onMemoSelect(memo.id, isShiftClick)}
                onPositionChange={handleMemoPositionChange}
                onSizeChange={onMemoSizeChange}
                onDisplaySizeChange={onMemoDisplaySizeChange}
                onTitleUpdate={onMemoTitleUpdate}
                onBlockUpdate={onMemoBlockUpdate}
                onDetectCategoryOnDrop={onDetectCategoryOnDrop}
                isConnecting={isConnecting}
                connectingFromId={connectingFromId}
                onStartConnection={onStartConnection}
                onConnectMemos={onConnectMemos}
                onCancelConnection={onCancelConnection}
                onUpdateDragLine={onUpdateDragLine}
                canvasScale={canvasScale}
                canvasOffset={canvasOffset}
                activeImportanceFilters={activeImportanceFilters}
                showGeneralContent={showGeneralContent}
                alwaysShowContent={alwaysShowContent}
                enableImportanceBackground={true}
                onDragStart={onMemoDragStart}
                onDragEnd={onMemoDragEnd}
                currentPage={currentPage}
                isDraggingAnyMemo={isDraggingMemo}
                isShiftPressed={isShiftPressed}
                onDelete={onDeleteMemoById}
                onAddQuickNav={onAddQuickNav}
                onDeleteQuickNav={onDeleteQuickNav}
                isQuickNavExists={isQuickNavExists}
                onOpenEditor={onOpenEditor}
                setIsLongPressActive={setIsLongPressActive}
                setIsShiftPressed={setIsShiftPressed}
                isShiftPressedRef={isShiftPressedRef}
              />
            );
          })}

          {/* Drag selection box */}
          {renderDragSelectionBox()}
        </div>
      </div>

      {/* Toolbar - fixed position (모바일/태블릿에서는 숨김, PC 전용) */}
      {!fullscreen && !isTabletLandscape && (
      <div
        className={styles.toolbar}
      >
        <button
          onClick={() => setCurrentTool('select')}
          className={`${styles['tool-button']} ${currentTool === 'select' ? styles.active : styles.inactive}`}
          title="선택 도구"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </button>
        <button
          onClick={() => {
            setCurrentTool('pan');
            setBaseTool('pan');
          }}
          className={`${styles['tool-button']} ${currentTool === 'pan' ? styles.active : styles.inactive}`}
          title="화면 이동 도구 (Space)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3 3-3 3M2 12l3-3 3 3M12 22l-3-3 3-3M22 12l-3 3-3-3"/>
          </svg>
        </button>
        <button
          onClick={() => {
            setCurrentTool('zoom');
            setBaseTool('zoom');
          }}
          className={`${styles['tool-button']} ${currentTool === 'zoom' ? styles.active : styles.inactive}`}
          title="확대/축소 도구 (Alt + Scroll)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
        <div className={styles.divider}></div>
        <button
          data-tutorial="add-memo-btn"
          onClick={() => {
            // 현재 화면 중앙 좌표 계산
            const canvasElement = document.getElementById('main-canvas');
            if (canvasElement) {
              const rect = canvasElement.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;

              // 캔버스 변환을 고려한 실제 좌표 계산
              const worldX = (centerX - canvasOffset.x) / canvasScale;
              const worldY = (centerY - canvasOffset.y) / canvasScale;

              onAddMemo({ x: worldX, y: worldY });
            } else {
              onAddMemo();
            }
          }}
          className={`${styles['action-button']} ${styles.secondary}`}
        >
          + 메모 생성
        </button>
        <button
          onClick={() => {
            // 현재 화면 중앙 좌표 계산
            const canvasElement = document.getElementById('main-canvas');
            if (canvasElement) {
              const rect = canvasElement.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;

              // 캔버스 변환을 고려한 실제 좌표 계산
              const worldX = (centerX - canvasOffset.x) / canvasScale;
              const worldY = (centerY - canvasOffset.y) / canvasScale;

              onAddCategory({ x: worldX, y: worldY });
            } else {
              onAddCategory();
            }
          }}
          className={`${styles['action-button']} ${styles.primary}`}
        >
          + 카테고리 생성
        </button>
        <button
          onClick={onDisconnectMemo}
          className={`${styles['action-button']} ${styles.disconnect} ${isDisconnectMode ? styles.active : styles.inactive}`}
        >
          {isDisconnectMode ? '연결 해제 모드' : '연결 해제'}
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={!selectedMemoId && !selectedCategoryId && selectedMemoIds.length === 0 && selectedCategoryIds.length === 0}
          className={`${styles['action-button']} ${styles.delete} ${(selectedMemoId || selectedCategoryId || selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) ? styles.enabled : styles.disabled}`}
        >
          삭제 {(selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) && `(${selectedMemoIds.length + selectedCategoryIds.length})`}
        </button>
      </div>
      )}

      {/* Canvas Undo/Redo Controls (모바일/태블릿에서는 숨김, PC 전용) */}
      {!fullscreen && !isTabletLandscape && (
      <div
        className={styles['undo-redo-controls']}
      >
        <button
          data-tutorial="undo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
          className={`${styles['undo-redo-button']} ${canUndo ? styles.enabled : styles.disabled}`}
        >
          ↶ 실행취소
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Shift+Z)"
          className={`${styles['undo-redo-button']} ${canRedo ? styles.enabled : styles.disabled}`}
        >
          ↷ 다시실행
        </button>
        <button
          onClick={() => {
            console.log('내용 표시 버튼 클릭');
            if (onToggleAlwaysShowContent) {
              onToggleAlwaysShowContent();
            }
          }}
          title="모든 메모의 내용을 표시"
          className={`${styles['content-toggle-button']} ${alwaysShowContent ? styles.enabled : styles.disabled}`}
        >
          📄 내용 표시
        </button>
      </div>
      )}

      {/* 확대율 표시 (좌측 하단) */}
      <div style={{
        position: 'absolute',
        left: '20px',
        bottom: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        fontSize: '14px',
        fontWeight: '500',
        color: '#6b7280',
        zIndex: 1000,
        userSelect: 'none'
      }}>
        {Math.round(Math.min((canvasScale / 0.35) * 100, 571))}%
      </div>

      {/* 중요도 필터 UI - 모바일/태블릿에서는 숨김, PC 전용 */}
      {!fullscreen && !isTabletLandscape && (
        <ImportanceFilter
          activeFilters={activeImportanceFilters}
          onToggleFilter={onToggleImportanceFilter}
          showGeneralContent={showGeneralContent}
          onToggleGeneralContent={onToggleGeneralContent}
          alwaysShowContent={alwaysShowContent}
          onToggleAlwaysShowContent={onToggleAlwaysShowContent}
        />
      )}

      {/* 카테고리 영역/라벨 컨텍스트 메뉴 */}
      {areaContextMenu && (
        <ContextMenu
          position={{ x: areaContextMenu.x, y: areaContextMenu.y }}
          onClose={() => setAreaContextMenu(null)}
          onSetQuickNav={() => {
            const category = currentPage?.categories?.find(c => c.id === areaContextMenu.categoryId);
            if (category) {
              // 중복 체크
              if (isQuickNavExists && isQuickNavExists(category.id, 'category')) {
                alert('이미 단축 이동이 설정되어 있습니다.');
                setAreaContextMenu(null);
                return;
              }
              setShowAreaQuickNavModal({ categoryId: category.id, categoryName: category.title });
            }
            setAreaContextMenu(null);
          }}
          onDelete={() => {
            if (window.confirm('카테고리를 삭제하시겠습니까?')) {
              onDeleteCategory(areaContextMenu.categoryId);
            }
            setAreaContextMenu(null);
          }}
        />
      )}

      {/* 카테고리 영역/라벨 단축 이동 모달 */}
      {showAreaQuickNavModal && (
        <QuickNavModal
          isOpen={true}
          onClose={() => setShowAreaQuickNavModal(null)}
          onConfirm={(name) => {
            if (name.trim() && onAddQuickNav) {
              onAddQuickNav(name.trim(), showAreaQuickNavModal.categoryId, 'category');
            }
            setShowAreaQuickNavModal(null);
          }}
          initialName={showAreaQuickNavModal.categoryName || '제목 없는 카테고리'}
        />
      )}
    </div>
  );
};

export default Canvas;
