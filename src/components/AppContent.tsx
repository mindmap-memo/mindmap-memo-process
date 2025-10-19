'use client';

import React, { useState, useEffect } from 'react';
import { TutorialState } from '../types';
import { useCanvasHistory } from '../hooks/useCanvasHistory';
import { useAppState } from '../hooks/useAppState';
import { usePanelState } from '../hooks/usePanelState';
import { useDragState } from '../hooks/useDragState';
import { useSelectionHandlers } from '../hooks/useSelectionHandlers';
import { useMemoHandlers } from '../hooks/useMemoHandlers';
import { useConnectionHandlers } from '../hooks/useConnectionHandlers';
import { useTutorialHandlers } from '../hooks/useTutorialHandlers';
import { useQuickNavHandlers } from '../hooks/useQuickNavHandlers';
import { usePanelHandlers } from '../hooks/usePanelHandlers';
import { useCategoryHandlers } from '../hooks/useCategoryHandlers';
import { usePageHandlers } from '../hooks/usePageHandlers';
import { useCollisionHandlers } from '../hooks/useCollisionHandlers';
import { useShiftDragHandlers } from '../hooks/useShiftDragHandlers';
import { useCategoryPositionHandlers } from '../hooks/useCategoryPositionHandlers';
import { useGlobalEventHandlers } from '../hooks/useGlobalEventHandlers';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTutorialValidation } from '../hooks/useTutorialValidation';
import { useCategoryDrop } from '../hooks/useCategoryDrop';
import { usePositionHandlers } from '../hooks/usePositionHandlers';
import { useDeleteHandlers } from '../hooks/useDeleteHandlers';
import { useSelectedItems } from '../hooks/useSelectedItems';
import { useDataRegistry } from '../hooks/useDataRegistry';
import { useContextValues } from '../hooks/useContextValues';
import { useAutoSave } from '../hooks/useAutoSave';
import { CategoryArea } from '../utils/categoryAreaUtils';
import { AppProviders } from '../contexts';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import Canvas from './Canvas/Canvas';
import { Tutorial } from './Tutorial';
import { coreTutorialSteps, basicTutorialSteps } from '../utils/tutorialSteps';
import { QuickNavPanel } from './QuickNavPanel';
import styles from '../scss/App.module.scss';

const AppContent: React.FC = () => {
  // ===== 커스텀 훅으로 상태 관리 =====
  const appState = useAppState();
  const {
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    isLoading,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryIds,
    setSelectedCategoryIds,
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,
    quickNavItems,
    showQuickNavPanel,
    setShowQuickNavPanel,
    isConnecting,
    setIsConnecting,
    isDisconnectMode,
    setIsDisconnectMode,
    connectingFromId,
    setConnectingFromId,
    connectingFromDirection,
    setConnectingFromDirection,
    isShiftPressed,
    setIsShiftPressed,
    isShiftPressedRef
  } = appState;

  const panelState = usePanelState();
  const {
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth
  } = panelState;

  const dragState = useDragState();
  const {
    draggedCategoryAreas,
    shiftDragAreaCache,
    shiftDropProcessedMemos,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    lastDragTime,
    lastDragPosition,
    categoryExitTimers,
    categoryPositionTimers,
    previousFramePosition,
    cacheCreationStarted,
    clearCategoryCache: clearCategoryCacheFromHook
  } = dragState;

  // ===== 선택 핸들러 훅 사용 =====
  const selectionHandlers = useSelectionHandlers({
    pages,
    currentPageId,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryIds,
    setSelectedCategoryIds,
    isDragSelecting: appState.isDragSelecting,
    setIsDragSelecting: appState.setIsDragSelecting,
    dragSelectStart: appState.dragSelectStart,
    setDragSelectStart: appState.setDragSelectStart,
    dragSelectEnd: appState.dragSelectEnd,
    setDragSelectEnd: appState.setDragSelectEnd,
    setDragHoveredMemoIds: appState.setDragHoveredMemoIds,
    setDragHoveredCategoryIds: appState.setDragHoveredCategoryIds,
    isDragSelectingWithShift: appState.isDragSelectingWithShift,
    setIsDragSelectingWithShift: appState.setIsDragSelectingWithShift,
    activeImportanceFilters: appState.activeImportanceFilters,
    setActiveImportanceFilters: appState.setActiveImportanceFilters,
    showGeneralContent: appState.showGeneralContent,
    setShowGeneralContent: appState.setShowGeneralContent,
    setCanvasOffset,
    setCanvasScale
  });

  const {
    handleMemoSelect,
    selectCategory,
    handleDragSelectStart,
    handleDragSelectMove,
    handleDragSelectEnd,
    toggleImportanceFilter,
    resetFiltersToDefault,
    focusOnMemo
  } = selectionHandlers;

  // ===== Canvas History 관리 =====
  const { saveCanvasState, undoCanvasAction, redoCanvasAction, canUndo, canRedo } = useCanvasHistory({
    pages,
    setPages,
    currentPageId
  });

  // ===== 메모 핸들러 =====
  const memoHandlers = useMemoHandlers({
    pages,
    setPages,
    currentPageId,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth,
    canvasScale,
    setCanvasOffset,
    saveCanvasState
  });


  const {
    addMemoBlock,
    updateMemo,
    updateMemoSize,
    updateMemoDisplaySize,
    updateMemoTitle,
    updateMemoBlockContent,
    deleteMemoBlock,
    deleteMemoById
  } = memoHandlers;

  // ===== Connection 핸들러 =====
  const connectionHandlers = useConnectionHandlers({
    pages,
    setPages,
    currentPageId,
    isDisconnectMode,
    setIsDisconnectMode,
    setIsConnecting,
    setConnectingFromId,
    setConnectingFromDirection,
    setDragLineEnd: appState.setDragLineEnd,
    saveCanvasState
  });

  const {
    disconnectMemo,
    connectMemos,
    removeConnection,
    startConnection,
    updateDragLine,
    cancelConnection
  } = connectionHandlers;

  // ===== Quick Navigation 핸들러 =====
  const quickNavHandlers = useQuickNavHandlers({
    pages,
    setPages,
    currentPageId,
    quickNavItems,
    setCurrentPageId,
    setCanvasOffset,
    setCanvasScale
  });

  const {
    handleNavigateToMemo,
    handleNavigateToCategory,
    addQuickNavItem,
    deleteQuickNavItem,
    executeQuickNav,
    isQuickNavExists
  } = quickNavHandlers;

  // ===== Panel 핸들러 =====
  const panelHandlers = usePanelHandlers({
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth,
    isRightPanelFullscreen: panelState.isRightPanelFullscreen,
    setIsRightPanelFullscreen: panelState.setIsRightPanelFullscreen
  });

  const {
    handleLeftPanelResize,
    handleRightPanelResize,
    toggleRightPanelFullscreen
  } = panelHandlers;

  // ===== 튜토리얼 상태 =====
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    isActive: false,
    currentStep: 0,
    completed: false,
    currentSubStep: 0
  });

  // Load tutorial state from localStorage after mount (client-side only)
  useEffect(() => {
    const completed = localStorage.getItem('tutorial-completed') === 'true';
    setTutorialState({
      isActive: !completed,
      currentStep: 0,
      completed: completed,
      currentSubStep: 0
    });
  }, []);

  const [tutorialMode, setTutorialMode] = useState<'basic' | 'core'>('core');

  const handleStartTutorialWrapper = () => {
    setTutorialMode('core');
    handleStartTutorial();
  };

  const currentTutorialSteps = tutorialMode === 'core' ? coreTutorialSteps : basicTutorialSteps;

  // ===== 튜토리얼 validation 상태 =====
  const tutorialValidation = useTutorialValidation({
    tutorialState,
    canvasOffset,
    canvasScale,
    pages,
    currentPageId
  });

  const {
    canvasPanned,
    setCanvasPanned,
    canvasZoomed,
    setCanvasZoomed,
    memoCreated,
    setMemoCreated,
    memoDragged,
    setMemoDragged,
    initialCanvasOffset,
    initialCanvasScale,
    initialMemoPositions,
    initialMemoCount
  } = tutorialValidation;

  // ===== Tutorial 핸들러 =====
  const tutorialHandlers = useTutorialHandlers({
    tutorialState,
    setTutorialState,
    canvasPanned,
    setCanvasPanned,
    canvasZoomed,
    setCanvasZoomed,
    memoCreated,
    setMemoCreated,
    memoDragged,
    setMemoDragged,
    initialCanvasOffset,
    initialCanvasScale,
    initialMemoPositions,
    initialMemoCount,
    canvasOffset,
    canvasScale,
    pages,
    currentPageId,
    setCurrentPageId,
    setPages,
    setCanvasOffset,
    setCanvasScale,
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth
  });

  const {
    handleStartTutorial,
    handleTutorialNext,
    handleTutorialSkip: handleTutorialSkipBase,
    handleTutorialComplete,
    canProceedTutorial
  } = tutorialHandlers;

  const handleTutorialSkip = () => {
    if (tutorialMode === 'core') {
      const basicFeaturesIntroIndex = coreTutorialSteps.findIndex(step => step.id === 'basic-features-intro');
      if (basicFeaturesIntroIndex !== -1) {
        setTutorialState(prev => ({
          ...prev,
          currentStep: basicFeaturesIntroIndex,
          currentSubStep: 0
        }));
      }
    } else {
      handleTutorialSkipBase();
    }
  };

  const handleSwitchToBasic = () => {
    setTutorialMode('basic');
    setTutorialState(prev => ({ ...prev, currentStep: 0, currentSubStep: 0 }));
  };

  const handleTutorialPrev = () => {
    if (tutorialState.currentStep > 0) {
      setTutorialState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        currentSubStep: 0
      }));
    }
  };

  const handleSubStepEvent = (eventType: string) => {
    if (!tutorialState.isActive) return;

    const currentStep = currentTutorialSteps[tutorialState.currentStep];
    if (!currentStep?.subSteps) return;

    const currentSubStep = tutorialState.currentSubStep || 0;
    const activeSubStep = currentStep.subSteps[currentSubStep];

    if (activeSubStep && activeSubStep.eventType === eventType) {
      const nextSubStep = currentSubStep + 1;

      if (nextSubStep >= currentStep.subSteps.length) {
        setTutorialState(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          currentSubStep: 0
        }));
      } else {
        setTutorialState(prev => ({
          ...prev,
          currentSubStep: nextSubStep
        }));
      }
    }
  };

  // ===== 카테고리 핸들러 =====
  const categoryHandlers = useCategoryHandlers({
    pages,
    setPages,
    currentPageId,
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth,
    canvasScale,
    setCanvasOffset,
    saveCanvasState
  });

  const {
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryExpanded,
    updateCategorySize,
    moveToCategory
  } = categoryHandlers;

  // ===== 페이지 핸들러 =====
  const pageHandlers = usePageHandlers({
    pages,
    setPages,
    currentPageId,
    setCurrentPageId
  });

  const {
    addPage,
    updatePageName,
    deletePage
  } = pageHandlers;

  // ===== 충돌 검사 핸들러 =====
  const collisionHandlers = useCollisionHandlers({
    pages,
    setPages,
    currentPageId
  });

  const {
    pushAwayConflictingMemos
  } = collisionHandlers;

  // ===== Shift 드래그 핸들러 =====
  const shiftDragHandlers = useShiftDragHandlers({
    pages,
    setPages,
    currentPageId,
    selectedCategoryIds,
    draggedCategoryAreas,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    toggleCategoryExpanded,
    saveCanvasState,
    clearCategoryCache: clearCategoryCacheFromHook
  });

  const {
    handleShiftDropCategory,
    handleShiftDrop,
    handleCategoryAreaShiftDrop
  } = shiftDragHandlers;

  const clearCategoryCache = clearCategoryCacheFromHook;

  // ===== 전역 이벤트 핸들러 =====
  useGlobalEventHandlers({
    isShiftPressed,
    setIsShiftPressed,
    setSelectedMemoIds,
    setSelectedCategoryIds,
    setIsDragSelecting: appState.setIsDragSelecting,
    setDragSelectStart: appState.setDragSelectStart,
    setDragSelectEnd: appState.setDragSelectEnd,
    setDragHoveredMemoIds: appState.setDragHoveredMemoIds,
    setDragHoveredCategoryIds: appState.setDragHoveredCategoryIds
  });

  // ===== LocalStorage 자동 저장 (패널 설정 등) =====
  useLocalStorage({
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    leftPanelOpen,
    rightPanelOpen,
    leftPanelWidth,
    rightPanelWidth
  });

  // ===== 데이터베이스 자동 저장 =====
  useAutoSave(pages, currentPageId, !isLoading);

  // ===== 카테고리 드롭 감지 =====
  const shiftDragAreaCacheAsMap = React.useMemo(() => {
    const map = new Map<string, CategoryArea>();
    Object.entries(shiftDragAreaCache.current).forEach(([key, value]) => {
      map.set(key, value);
    });
    return map;
  }, [shiftDragAreaCache.current]);

  const { detectCategoryOnDrop, detectCategoryDropForCategory } = useCategoryDrop({
    pages,
    currentPageId,
    isShiftPressedRef,
    shiftDropProcessedMemos,
    lastDragTime,
    lastDragPosition,
    categoryExitTimers,
    shiftDragAreaCache: { current: shiftDragAreaCacheAsMap } as React.MutableRefObject<Map<string, CategoryArea>>,
    handleShiftDrop,
    handleShiftDropCategory,
    moveToCategory,
    pushAwayConflictingMemos
  });

  // ===== 카테고리 위치 핸들러 =====
  const categoryPositionHandlers = useCategoryPositionHandlers({
    pages,
    setPages,
    currentPageId,
    selectedCategoryIds,
    draggedCategoryAreas,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    shiftDragAreaCache,
    previousFramePosition,
    cacheCreationStarted,
    clearCategoryCache
  });

  const {
    updateCategoryLabelPosition,
    handleCategoryPositionDragEnd,
    updateCategoryPositions
  } = categoryPositionHandlers;

  const memoPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ===== 위치 핸들러 =====
  const positionHandlers = usePositionHandlers({
    pages,
    setPages,
    currentPageId,
    selectedMemoIds,
    selectedCategoryIds,
    isShiftPressed,
    isShiftPressedRef,
    draggedCategoryAreas,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    previousFramePosition,
    cacheCreationStarted,
    categoryPositionTimers,
    memoPositionTimers,
    clearCategoryCache,
    saveCanvasState,
    updateCategoryPositions
  });

  const {
    updateCategoryPosition,
    updateMemoPosition
  } = positionHandlers;

  // ===== 삭제 핸들러 =====
  const deleteHandlers = useDeleteHandlers({
    pages,
    setPages,
    currentPageId,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryIds,
    setSelectedCategoryIds,
    deleteMemoBlock,
    deleteCategory,
    saveCanvasState
  });

  const {
    deleteSelectedItem
  } = deleteHandlers;

  // ===== Data Registry 초기화 =====
  useDataRegistry({
    dataRegistry: appState.dataRegistry,
    setDataRegistry: appState.setDataRegistry
  });

  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  // ===== 현재 페이지와 선택된 항목들 =====
  const {
    currentPage,
    selectedMemo,
    selectedMemos,
    selectedCategory,
    selectedCategories,
    allSelectedCategoryIds
  } = useSelectedItems({
    pages,
    currentPageId,
    selectedMemoId,
    selectedMemoIds,
    selectedCategoryId,
    selectedCategoryIds
  });

  // ===== Context Values 준비 =====
  const {
    appStateContextValue,
    selectionContextValue,
    panelContextValue,
    connectionContextValue,
    quickNavContextValue
  } = useContextValues({
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    currentPage,
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,
    dataRegistry: appState.dataRegistry,
    setDataRegistry: appState.setDataRegistry,
    isShiftPressed,
    setIsShiftPressed,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    selectedMemo,
    selectedMemos,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryIds,
    setSelectedCategoryIds,
    selectedCategory,
    selectedCategories,
    isDragSelecting: appState.isDragSelecting,
    setIsDragSelecting: appState.setIsDragSelecting,
    dragSelectStart: appState.dragSelectStart,
    setDragSelectStart: appState.setDragSelectStart,
    dragSelectEnd: appState.dragSelectEnd,
    setDragSelectEnd: appState.setDragSelectEnd,
    dragHoveredMemoIds: appState.dragHoveredMemoIds,
    setDragHoveredMemoIds: appState.setDragHoveredMemoIds,
    dragHoveredCategoryIds: appState.dragHoveredCategoryIds,
    setDragHoveredCategoryIds: appState.setDragHoveredCategoryIds,
    isDragSelectingWithShift: appState.isDragSelectingWithShift,
    setIsDragSelectingWithShift: appState.setIsDragSelectingWithShift,
    activeImportanceFilters: appState.activeImportanceFilters,
    setActiveImportanceFilters: appState.setActiveImportanceFilters,
    showGeneralContent: appState.showGeneralContent,
    setShowGeneralContent: appState.setShowGeneralContent,
    isDraggingMemo: appState.isDraggingMemo,
    setIsDraggingMemo: appState.setIsDraggingMemo,
    draggingMemoId: appState.draggingMemoId,
    setDraggingMemoId: appState.setDraggingMemoId,
    isDraggingCategory: appState.isDraggingCategory,
    setIsDraggingCategory: appState.setIsDraggingCategory,
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth,
    isRightPanelFullscreen: panelState.isRightPanelFullscreen,
    setIsRightPanelFullscreen: panelState.setIsRightPanelFullscreen,
    isConnecting,
    setIsConnecting,
    isDisconnectMode,
    setIsDisconnectMode,
    connectingFromId,
    setConnectingFromId,
    connectingFromDirection,
    setConnectingFromDirection,
    dragLineEnd: appState.dragLineEnd,
    setDragLineEnd: appState.setDragLineEnd,
    quickNavItems,
    showQuickNavPanel,
    setShowQuickNavPanel
  });

  // Show loading screen while data is loading
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        데이터 로딩 중...
      </div>
    );
  }

  return (
    <AppProviders
      appState={appStateContextValue}
      selection={selectionContextValue}
      panel={panelContextValue}
      connection={connectionContextValue}
      quickNav={quickNavContextValue}
    >
      <div className={styles['app-container']}>
        {leftPanelOpen && (
        <LeftPanel
          pages={pages}
          currentPageId={currentPageId}
          onPageSelect={setCurrentPageId}
          onAddPage={addPage}
          onPageNameChange={updatePageName}
          onDeletePage={deletePage}
          width={leftPanelWidth}
          onResize={handleLeftPanelResize}
          onSearch={(query, category, results) => {}}
          onDeleteMemo={deleteMemoById}
          onDeleteCategory={deleteCategory}
          onNavigateToMemo={handleNavigateToMemo}
          onNavigateToCategory={handleNavigateToCategory}
          onStartTutorial={handleStartTutorialWrapper}
        />
      )}

      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className={`${styles['panel-toggle-button']} ${styles.left}`}
        style={{
          left: leftPanelOpen ? `${leftPanelWidth}px` : '0px'
        }}
      >
        {leftPanelOpen ? '◀' : '▶'}
      </button>

      <Canvas
        currentPage={currentPage}
        selectedMemoId={selectedMemoId}
        selectedMemoIds={selectedMemoIds}
        selectedCategoryId={selectedCategoryId}
        selectedCategoryIds={selectedCategoryIds}
        onMemoSelect={handleMemoSelect}
        onCategorySelect={selectCategory}
        onAddMemo={(position) => {
          addMemoBlock(position);
          handleSubStepEvent('memo-created');
        }}
        onAddCategory={addCategory}
        onDeleteMemo={deleteMemoBlock}
        onDeleteCategory={deleteCategory}
        onDeleteSelected={deleteSelectedItem}
        onDisconnectMemo={disconnectMemo}
        onMemoPositionChange={updateMemoPosition}
        onCategoryPositionChange={updateCategoryPosition}
        onCategoryLabelPositionChange={updateCategoryLabelPosition}
        onMemoSizeChange={updateMemoSize}
        onCategorySizeChange={updateCategorySize}
        onMemoDisplaySizeChange={updateMemoDisplaySize}
        onMemoTitleUpdate={updateMemoTitle}
        onMemoBlockUpdate={updateMemoBlockContent}
        onCategoryUpdate={updateCategory}
        onCategoryToggleExpanded={toggleCategoryExpanded}
        onMoveToCategory={moveToCategory}
        onDetectCategoryOnDrop={detectCategoryOnDrop}
        onDetectCategoryDropForCategory={detectCategoryDropForCategory}
        isConnecting={isConnecting}
        isDisconnectMode={isDisconnectMode}
        connectingFromId={connectingFromId}
        connectingFromDirection={connectingFromDirection}
        dragLineEnd={appState.dragLineEnd}
        onStartConnection={(memoId, direction) => {
          startConnection(memoId, direction);
          handleSubStepEvent('connection-started');
        }}
        onConnectMemos={(fromId, toId) => {
          connectMemos(fromId, toId);
          handleSubStepEvent('connection-completed');
        }}
        onCancelConnection={cancelConnection}
        onRemoveConnection={removeConnection}
        onUpdateDragLine={updateDragLine}
        isDragSelecting={appState.isDragSelecting}
        dragSelectStart={appState.dragSelectStart}
        dragSelectEnd={appState.dragSelectEnd}
        dragHoveredMemoIds={appState.dragHoveredMemoIds}
        dragHoveredCategoryIds={appState.dragHoveredCategoryIds}
        onDragSelectStart={handleDragSelectStart}
        onDragSelectMove={handleDragSelectMove}
        onDragSelectEnd={handleDragSelectEnd}
        activeImportanceFilters={appState.activeImportanceFilters}
        onToggleImportanceFilter={toggleImportanceFilter}
        showGeneralContent={appState.showGeneralContent}
        onToggleGeneralContent={() => appState.setShowGeneralContent(!appState.showGeneralContent)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoCanvasAction}
        onRedo={redoCanvasAction}
        isDraggingMemo={appState.isDraggingMemo}
        draggingMemoId={appState.draggingMemoId}
        onMemoDragStart={(memoId: string) => {
          appState.setIsDraggingMemo(true);
          appState.setDraggingMemoId(memoId);
        }}
        onMemoDragEnd={() => {
          appState.setIsDraggingMemo(false);
          appState.setDraggingMemoId(null);
        }}
        isShiftPressed={isShiftPressed}
        shiftDragAreaCacheRef={shiftDragAreaCache}
        onShiftDropCategory={handleCategoryAreaShiftDrop}
        isDraggingCategory={appState.isDraggingCategory}
        draggingCategoryId={appState.draggingCategoryId}
        onCategoryDragStart={() => {
          appState.setIsDraggingCategory(true);
        }}
        onCategoryDragEnd={() => {
          appState.setIsDraggingCategory(false);
          appState.setDraggingCategoryId(null);
        }}
        onCategoryPositionDragEnd={handleCategoryPositionDragEnd}
        onClearCategoryCache={clearCategoryCache}
        canvasOffset={canvasOffset}
        setCanvasOffset={setCanvasOffset}
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        onDeleteMemoById={deleteMemoById}
        onAddQuickNav={addQuickNavItem}
        isQuickNavExists={isQuickNavExists}
      />

      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className={`${styles['panel-toggle-button']} ${styles.right}`}
        style={{
          right: rightPanelOpen ? `${rightPanelWidth}px` : '0px'
        }}
      >
        {rightPanelOpen ? '▶' : '◀'}
      </button>

      <button
        data-tutorial="quick-nav-btn"
        onClick={() => setShowQuickNavPanel(!showQuickNavPanel)}
        className={styles['quick-nav-button']}
        style={{
          right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>단축 이동</span>
        {quickNavItems.length > 0 && (
          <span className={styles['quick-nav-badge']}>
            {quickNavItems.length}
          </span>
        )}
      </button>

      <QuickNavPanel
        quickNavItems={quickNavItems}
        pages={pages}
        currentPageId={currentPageId}
        rightPanelOpen={rightPanelOpen}
        rightPanelWidth={rightPanelWidth}
        showQuickNavPanel={showQuickNavPanel}
        onTogglePanel={() => setShowQuickNavPanel(!showQuickNavPanel)}
        onExecuteQuickNav={executeQuickNav}
        onDeleteQuickNavItem={deleteQuickNavItem}
      />

      {rightPanelOpen && (
        <RightPanel
          selectedMemo={selectedMemo}
          selectedMemos={selectedMemos}
          selectedCategory={selectedCategory}
          selectedCategories={selectedCategories}
          currentPage={currentPage}
          onMemoUpdate={updateMemo}
          onCategoryUpdate={updateCategory}
          onMemoSelect={handleMemoSelect}
          onCategorySelect={selectCategory}
          onFocusMemo={focusOnMemo}
          width={rightPanelWidth}
          onResize={handleRightPanelResize}
          isFullscreen={panelState.isRightPanelFullscreen}
          onToggleFullscreen={toggleRightPanelFullscreen}
          activeImportanceFilters={appState.activeImportanceFilters}
          showGeneralContent={appState.showGeneralContent}
          onResetFilters={resetFiltersToDefault}
        />
      )}

      {tutorialState.isActive && (
        <Tutorial
          steps={currentTutorialSteps}
          currentStep={tutorialState.currentStep}
          currentSubStep={tutorialState.currentSubStep || 0}
          onNext={handleTutorialNext}
          onPrev={handleTutorialPrev}
          onSkip={handleTutorialSkip}
          onComplete={handleTutorialComplete}
          onSwitchToCore={handleSwitchToBasic}
          canProceed={tutorialMode === 'core' ? true : canProceedTutorial()}
        />
      )}
      </div>
    </AppProviders>
  );
};

export default AppContent;
