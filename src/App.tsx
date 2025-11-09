import React, { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useAppState } from './hooks/useAppState';
import { usePanelState } from './hooks/usePanelState';
import { useDragState } from './hooks/useDragState';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';
import { useMemoHandlers } from './hooks/useMemoHandlers';
import { useConnectionHandlers } from './hooks/useConnectionHandlers';
import { useTutorialHandlers } from './hooks/useTutorialHandlers';
import { useTutorialState } from './hooks/useTutorialState';
import { useCanvasHandlers } from './hooks/useCanvasHandlers';
import { useQuickNavHandlers } from './hooks/useQuickNavHandlers';
import { usePanelHandlers } from './hooks/usePanelHandlers';
import { useCategoryHandlers } from './hooks/useCategoryHandlers';
import { usePageHandlers } from './hooks/usePageHandlers';
import { useCollisionHandlers } from './hooks/useCollisionHandlers';
import { useShiftDragHandlers } from './hooks/useShiftDragHandlers';
import { useCategoryPositionHandlers } from './hooks/useCategoryPositionHandlers';
import { useGlobalEventHandlers } from './hooks/useGlobalEventHandlers';
import { useAutoSave } from './hooks/useAutoSave';
import { useTutorialValidation } from './hooks/useTutorialValidation';
import { useCategoryDrop } from './hooks/useCategoryDrop';
import { usePositionHandlers } from './hooks/usePositionHandlers';
import { useDeleteHandlers } from './hooks/useDeleteHandlers';
import { useSelectedItems } from './hooks/useSelectedItems';
import { useContextValues } from './hooks/useContextValues';
import { CategoryArea } from './utils/categoryAreaUtils';
import { AppProviders } from './contexts';
import LeftPanel from './components/LeftPanel/LeftPanel';
import RightPanel from './components/RightPanel/RightPanel';
import Canvas from './components/Canvas/Canvas';
import { Tutorial } from './components/Tutorial';
import { QuickNavPanel } from './components/QuickNavPanel';
import { useMigration } from './features/migration/hooks/useMigration';
import { MigrationPrompt } from './features/migration/components/MigrationPrompt';
import { useAnalytics } from './features/analytics/hooks/useAnalytics';
import { useAnalyticsTrackers } from './features/analytics/hooks/useAnalyticsTrackers';
import { useMediaQuery } from './hooks/useMediaQuery';
import { MobileLayout } from './components/MobileLayout/MobileLayout';
import styles from './scss/App.module.scss';

// 개발 환경에서만 디버깅 도구 로드
if (process.env.NODE_ENV === 'development') {
  import('./features/migration/utils/debugUtils');
}

// 모바일 개발자 도구 (Eruda) - 개발 환경 + Preview 환경에서 활성화
if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
  if (typeof window !== 'undefined') {
    import('eruda').then((eruda) => {
      eruda.default.init();
    });
  }
}

const App: React.FC = () => {
  // ===== 에러 추적 =====
  const [renderError, setRenderError] = React.useState<Error | null>(null);

  // 전역 에러 핸들러
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
      setRenderError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // ===== 세션 정보 =====
  const { data: session } = useSession();

  // ===== 애널리틱스 =====
  useAnalytics(); // 세션 자동 추적
  const analytics = useAnalyticsTrackers();

  // ===== 마이그레이션 관리 =====
  const migration = useMigration(!!session);
  const {
    status: migrationStatus,
    needsMigration,
    error: migrationError,
    result: migrationResult,
    migrate,
    skipMigration,
    deleteLegacyData,
  } = migration;

  // ===== 커스텀 훅으로 상태 관리 =====
  const appState = useAppState(!!session);
  const {
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    isInitialLoadDone,
    loadingProgress,
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
    isLongPressActive,
    longPressTargetId,
    setIsLongPressActive,
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
    saveCanvasState,
    isShiftPressed: appState.isShiftPressed,
    isDraggingMemo: appState.isDraggingMemo,
    isDraggingCategory: appState.isDraggingCategory
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
    updateQuickNavItem,
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

  // ===== 튜토리얼 상태 임시 (순환 의존성 해결을 위해) =====
  // 먼저 tutorialState만 초기화
  const tutorialValidationTemp = useTutorialValidation({
    tutorialState: { isActive: false, currentStep: 0, completed: true, currentSubStep: 0 },
    canvasOffset,
    canvasScale,
    pages,
    currentPageId
  });

  const tutorialHandlersTemp = useTutorialHandlers({
    tutorialState: { isActive: false, currentStep: 0, completed: true, currentSubStep: 0 },
    setTutorialState: () => {},
    canvasPanned: tutorialValidationTemp.canvasPanned,
    setCanvasPanned: tutorialValidationTemp.setCanvasPanned,
    canvasZoomed: tutorialValidationTemp.canvasZoomed,
    setCanvasZoomed: tutorialValidationTemp.setCanvasZoomed,
    memoCreated: tutorialValidationTemp.memoCreated,
    setMemoCreated: tutorialValidationTemp.setMemoCreated,
    memoDragged: tutorialValidationTemp.memoDragged,
    setMemoDragged: tutorialValidationTemp.setMemoDragged,
    initialCanvasOffset: tutorialValidationTemp.initialCanvasOffset,
    initialCanvasScale: tutorialValidationTemp.initialCanvasScale,
    initialMemoPositions: tutorialValidationTemp.initialMemoPositions,
    initialMemoCount: tutorialValidationTemp.initialMemoCount,
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

  // ===== 튜토리얼 상태 훅 (통합) =====
  const {
    tutorialState,
    tutorialMode,
    currentTutorialSteps,
    handleStartTutorialWrapper,
    handleTutorialSkip,
    handleSwitchToBasic,
    handleTutorialPrev,
    handleSubStepEvent
  } = useTutorialState({
    handleStartTutorial: tutorialHandlersTemp.handleStartTutorial,
    handleTutorialNext: tutorialHandlersTemp.handleTutorialNext,
    handleTutorialSkipBase: tutorialHandlersTemp.handleTutorialSkip,
    handleTutorialComplete: tutorialHandlersTemp.handleTutorialComplete,
    canProceedTutorial: tutorialHandlersTemp.canProceedTutorial
  });

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
    selectPage,
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

  // clearCategoryCache는 useDragState에서 가져온 것을 사용
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

  // ===== 데이터베이스 자동 저장 =====
  useAutoSave(pages, currentPageId, isInitialLoadDone);

  // ===== 카테고리 드롭 감지 =====
  // shiftDragAreaCache를 Map으로 변환하는 래퍼
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
    clearCategoryCache,
    isShiftPressed: appState.isShiftPressed,
    isShiftPressedRef: appState.isShiftPressedRef,  // ref 추가
    isDraggingMemo: appState.isDraggingMemo,
    isDraggingCategory: appState.isDraggingCategory
  });

  const {
    updateCategoryLabelPosition,
    handleCategoryPositionDragEnd,
    updateCategoryPositions
  } = categoryPositionHandlers;

  // ===== 메모 위치 업데이트 히스토리 타이머 관리 =====
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

  // ===== Canvas 핸들러 (wrapper 함수들) =====
  const canvasHandlers = useCanvasHandlers({
    setIsDraggingMemo: appState.setIsDraggingMemo,
    setDraggingMemoId: appState.setDraggingMemoId,
    setIsDraggingCategory: appState.setIsDraggingCategory,
    setDraggingCategoryId: appState.setDraggingCategoryId,
    handleSubStepEvent,
    trackMemoCreated: analytics.trackMemoCreated,
    trackCategoryCreated: analytics.trackCategoryCreated,
    trackConnectionCreated: analytics.trackConnectionCreated,
    addMemoBlock,
    addCategory,
    startConnection,
    connectMemos
  });

  const {
    handleAddMemo,
    handleAddCategory,
    handleStartConnection,
    handleConnectMemos,
    handleMemoDragStart,
    handleMemoDragEnd,
    handleCategoryDragStart,
    handleCategoryDragEnd
  } = canvasHandlers;

  // ===== 현재 페이지 ID가 유효한지 확인하고 수정 =====
  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  // ===== 현재 페이지와 선택된 항목들 (useSelectedItems 훅 사용) =====
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

  // ===== Context Values 준비 (useContextValues 훅 사용) =====
  const {
    appStateContextValue,
    selectionContextValue,
    panelContextValue,
    connectionContextValue,
    quickNavContextValue
  } = useContextValues({
    // AppState
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    currentPage,
    isInitialLoadDone,
    loadingProgress,
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,
    isShiftPressed,
    setIsShiftPressed: appState.setIsShiftPressed,
    isDraggingMemo: appState.isDraggingMemo,
    setIsDraggingMemo: appState.setIsDraggingMemo,
    draggingMemoId: appState.draggingMemoId,
    setDraggingMemoId: appState.setDraggingMemoId,
    isDraggingCategory: appState.isDraggingCategory,
    setIsDraggingCategory: appState.setIsDraggingCategory,
    draggingCategoryId: appState.draggingCategoryId,
    setDraggingCategoryId: appState.setDraggingCategoryId,

    // Selection
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
    handleMemoSelect,
    selectCategory,
    activeImportanceFilters: appState.activeImportanceFilters,
    setActiveImportanceFilters: appState.setActiveImportanceFilters,
    showGeneralContent: appState.showGeneralContent,
    setShowGeneralContent: appState.setShowGeneralContent,
    toggleImportanceFilter,
    toggleGeneralContent: () => appState.setShowGeneralContent(!appState.showGeneralContent),

    // Panel
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

    // Connection
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

    // QuickNav
    quickNavItems,
    showQuickNavPanel,
    setShowQuickNavPanel
  });

  // ===== 반응형 분기 =====
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 초기 로딩이 완료될 때까지 로딩 인디케이터 표시
  if (!isInitialLoadDone) {
    return (
      <div className={styles['loading-container']}>
        <div className={styles['loading-spinner']}></div>
        <div className={styles['loading-text']}>Mindmap Memo 로딩 중...</div>
        <div className={styles['loading-subtext']}>데이터를 불러오고 있습니다</div>
        <div className={styles['loading-bar-container']}>
          <div
            className={styles['loading-bar']}
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <div className={styles['loading-percentage']}>{loadingProgress}%</div>
      </div>
    );
  }

  // ===== 에러 화면 표시 =====
  if (renderError) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000',
        color: '#ff0000',
        padding: '20px',
        fontSize: '14px',
        fontFamily: 'monospace',
        overflow: 'auto',
        zIndex: 9999999
      }}>
        <h1 style={{ color: '#ff0000', marginBottom: '20px' }}>🚨 ERROR DETECTED</h1>
        <div style={{ marginBottom: '10px' }}><strong>Message:</strong> {renderError.message}</div>
        <div style={{ marginBottom: '10px' }}><strong>Stack:</strong></div>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#ffff00' }}>{renderError.stack}</pre>
        <button
          onClick={() => {
            setRenderError(null);
            window.location.reload();
          }}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#ff0000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          RELOAD PAGE
        </button>
      </div>
    );
  }

  // ===== 모바일 레이아웃 =====
  if (isMobile) {
    return (
      <>
        {/* 최상위 디버그 UI - AppProviders 외부 */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(255, 0, 0, 0.9)',
            color: '#fff',
            padding: '8px',
            fontSize: '11px',
            zIndex: 999999,
            borderBottom: '2px solid yellow',
            fontFamily: 'monospace'
          }}>
            <div><strong>APP.TSX DEBUG:</strong></div>
            <div>Pages: {pages ? `${pages.length} pages` : 'undefined'}</div>
            <div>CurrentPageId: {currentPageId || 'undefined'}</div>
            <div>CurrentPage: {currentPage ? `존재 (${currentPage.name})` : 'undefined'}</div>
            <div>isInitialLoadDone: {isInitialLoadDone ? 'true' : 'false'}</div>
            <div>LoadingProgress: {loadingProgress}%</div>
          </div>
        )}
        <AppProviders
          appState={appStateContextValue}
          selection={selectionContextValue}
          panel={panelContextValue}
          connection={connectionContextValue}
          quickNav={quickNavContextValue}
        >
          <MobileLayout
          tutorialState={tutorialState}
          tutorialMode={tutorialMode}
          handleStartTutorialWrapper={handleStartTutorialWrapper}
          handleCloseTutorial={handleTutorialSkip}
          handleNextStep={tutorialHandlersTemp.handleTutorialNext}
          handlePreviousStep={handleTutorialPrev}
          handleStepClick={(stepIndex) => {
            // setTutorialState 직접 호출은 불가능하므로 제거 (또는 useTutorialState에 추가 필요)
          }}
          handleNextSubStep={() => {}}
          handlePreviousSubStep={() => {}}
          TutorialComponent={Tutorial}
          migrationStatus={migrationStatus}
          needsMigration={needsMigration}
          migrationError={migrationError}
          migrationResult={migrationResult}
          migrate={migrate}
          skipMigration={skipMigration}
          deleteLegacyData={deleteLegacyData}
          MigrationPromptComponent={MigrationPrompt}
          showQuickNavPanel={showQuickNavPanel}
          setShowQuickNavPanel={setShowQuickNavPanel}
          QuickNavPanelComponent={QuickNavPanel}
          onExecuteQuickNav={executeQuickNav}
          onUpdateQuickNavItem={updateQuickNavItem}
          onDeleteQuickNavItem={deleteQuickNavItem}
          onAddPage={addPage}
          onPageNameChange={updatePageName}
          onDeletePage={deletePage}
          onAddMemo={handleAddMemo}
          onAddCategory={handleAddCategory}
          // Canvas 핸들러들
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
          onDeleteMemo={deleteMemoBlock}
          onDeleteCategory={deleteCategory}
          onDeleteSelected={deleteSelectedItem}
          onDisconnectMemo={disconnectMemo}
          onStartConnection={handleStartConnection}
          onConnectMemos={handleConnectMemos}
          onCancelConnection={cancelConnection}
          onRemoveConnection={removeConnection}
          onUpdateDragLine={updateDragLine}
          onCategoryPositionDragEnd={handleCategoryPositionDragEnd}
          onCategoryDragStart={handleCategoryDragStart}
          onCategoryDragEnd={handleCategoryDragEnd}
          onMemoDragStart={handleMemoDragStart}
          onMemoDragEnd={handleMemoDragEnd}
          onShiftDropCategory={handleCategoryAreaShiftDrop}
          onClearCategoryCache={clearCategoryCache}
          onDeleteMemoById={deleteMemoById}
          onAddQuickNav={addQuickNavItem}
          isQuickNavExists={isQuickNavExists}
          onMemoUpdate={updateMemo}
          onFocusMemo={focusOnMemo}
          onResetFilters={resetFiltersToDefault}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undoCanvasAction}
          onRedo={redoCanvasAction}
          shiftDragAreaCacheRef={shiftDragAreaCache}
          onDragSelectStart={handleDragSelectStart}
          onDragSelectMove={handleDragSelectMove}
          onDragSelectEnd={handleDragSelectEnd}
          isLongPressActive={isLongPressActive}
          longPressTargetId={longPressTargetId}
          setIsLongPressActive={setIsLongPressActive}
          setIsShiftPressed={setIsShiftPressed}
          isShiftPressedRef={appState.isShiftPressedRef}
        />
      </AppProviders>
      </>
    );
  }

  // ===== 데스크톱 레이아웃 =====
  return (
    <AppProviders
      appState={appStateContextValue}
      selection={selectionContextValue}
      panel={panelContextValue}
      connection={connectionContextValue}
      quickNav={quickNavContextValue}
    >
      <div className={styles['app-container']}>
        {/* 왼쪽 패널 */}
        {leftPanelOpen && (
        <LeftPanel
          pages={pages}
          currentPageId={currentPageId}
          onPageSelect={selectPage}
          onAddPage={addPage}
          onPageNameChange={updatePageName}
          onDeletePage={deletePage}
          width={leftPanelWidth}
          onResize={handleLeftPanelResize}
          onSearch={(query, category, results) => {
            // 검색 결과 처리 로직은 필요에 따라 추가
          }}
          onDeleteMemo={deleteMemoById}
          onDeleteCategory={deleteCategory}
          onNavigateToMemo={handleNavigateToMemo}
          onNavigateToCategory={handleNavigateToCategory}
          onStartTutorial={handleStartTutorialWrapper}
          userEmail={session?.user?.email || undefined}
          onLogout={async () => {
            if (window.confirm('Mindmap-Memo 로그아웃하시겠습니까?')) {
              await signOut({ callbackUrl: '/login' });
            }
          }}
        />
      )}

      {/* 숨기기/보이기 버튼 (왼쪽) */}
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className={`${styles['panel-toggle-button']} ${styles.left}`}
        style={{
          left: leftPanelOpen ? `${leftPanelWidth}px` : '0px'
        }}
      >
        {leftPanelOpen ? '◀' : '▶'}
      </button>

      {/* 중앙 캔버스 */}
      <Canvas
        currentPage={currentPage}
        selectedMemoId={selectedMemoId}
        selectedMemoIds={selectedMemoIds}
        selectedCategoryId={selectedCategoryId}
        selectedCategoryIds={selectedCategoryIds}
        onMemoSelect={handleMemoSelect}
        onCategorySelect={selectCategory}
        onAddMemo={handleAddMemo}
        onAddCategory={handleAddCategory}
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
        onStartConnection={handleStartConnection}
        onConnectMemos={handleConnectMemos}
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
        onMemoDragStart={handleMemoDragStart}
        onMemoDragEnd={handleMemoDragEnd}
        isShiftPressed={isShiftPressed}
        shiftDragAreaCacheRef={shiftDragAreaCache}
        onShiftDropCategory={handleCategoryAreaShiftDrop}
        isDraggingCategory={appState.isDraggingCategory}
        draggingCategoryId={appState.draggingCategoryId}
        onCategoryDragStart={handleCategoryDragStart}
        onCategoryDragEnd={handleCategoryDragEnd}
        onCategoryPositionDragEnd={handleCategoryPositionDragEnd}
        onClearCategoryCache={clearCategoryCache}
        canvasOffset={canvasOffset}
        setCanvasOffset={setCanvasOffset}
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        onDeleteMemoById={deleteMemoById}
        onAddQuickNav={addQuickNavItem}
        isQuickNavExists={isQuickNavExists}
        isLongPressActive={isLongPressActive}
        longPressTargetId={longPressTargetId}
        setIsLongPressActive={setIsLongPressActive}
        setIsShiftPressed={setIsShiftPressed}
        isShiftPressedRef={appState.isShiftPressedRef}
      />

      {/* 숨기기/보이기 버튼 (오른쪽) */}
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className={`${styles['panel-toggle-button']} ${styles.right}`}
        style={{
          right: rightPanelOpen ? `${rightPanelWidth}px` : '0px'
        }}
      >
        {rightPanelOpen ? '▶' : '◀'}
      </button>

      {/* 단축 이동 패널 */}
      <QuickNavPanel
        quickNavItems={quickNavItems}
        pages={pages}
        currentPageId={currentPageId}
        rightPanelOpen={rightPanelOpen}
        rightPanelWidth={rightPanelWidth}
        showQuickNavPanel={showQuickNavPanel}
        onTogglePanel={() => setShowQuickNavPanel(!showQuickNavPanel)}
        onExecuteQuickNav={executeQuickNav}
        onUpdateQuickNavItem={updateQuickNavItem}
        onDeleteQuickNavItem={deleteQuickNavItem}
      />

      {/* 오른쪽 패널 */}
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

      {/* 튜토리얼 오버레이 - 마이그레이션이 필요하지 않을 때만 표시 */}
      {tutorialState.isActive && !needsMigration && (
        <Tutorial
          steps={currentTutorialSteps}
          currentStep={tutorialState.currentStep}
          currentSubStep={tutorialState.currentSubStep || 0}
          onNext={tutorialHandlersTemp.handleTutorialNext}
          onPrev={handleTutorialPrev}
          onSkip={handleTutorialSkip}
          onComplete={tutorialHandlersTemp.handleTutorialComplete}
          onSwitchToCore={handleSwitchToBasic}
          canProceed={tutorialMode === 'core' ? true : tutorialHandlersTemp.canProceedTutorial()}
        />
      )}

      {/* 마이그레이션 프롬프트 */}
      {needsMigration && session && (
        <MigrationPrompt
          status={migrationStatus}
          error={migrationError}
          result={migrationResult}
          onMigrate={migrate}
          onSkip={skipMigration}
          onDeleteLegacy={deleteLegacyData}
          onClose={() => {
            // 성공 후 확인 버튼 클릭 시 프롬프트 닫기
            if (migrationStatus === 'success') {
              skipMigration(); // needsMigration을 false로 설정
            }
          }}
        />
      )}
      </div>
    </AppProviders>
  );
};

export default App;