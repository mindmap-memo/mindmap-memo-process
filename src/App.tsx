import React, { useState, useEffect } from 'react';
import { Page, MemoBlock, DataRegistry, MemoDisplaySize, ImportanceLevel, CategoryBlock, QuickNavItem, TutorialState } from './types';
import { globalDataRegistry } from './utils/dataRegistry';
import { STORAGE_KEYS } from './constants/defaultData';
import { saveToStorage } from './utils/storageUtils';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useAppState } from './hooks/useAppState';
import { usePanelState } from './hooks/usePanelState';
import { useDragState } from './hooks/useDragState';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';
import { useMemoHandlers } from './hooks/useMemoHandlers';
import { useConnectionHandlers } from './hooks/useConnectionHandlers';
import { useTutorialHandlers } from './hooks/useTutorialHandlers';
import { useQuickNavHandlers } from './hooks/useQuickNavHandlers';
import { usePanelHandlers } from './hooks/usePanelHandlers';
import { useCategoryHandlers } from './hooks/useCategoryHandlers';
import { usePageHandlers } from './hooks/usePageHandlers';
import { calculateCategoryArea, CategoryArea } from './utils/categoryAreaUtils';
import { resolveUnifiedCollisions } from './utils/collisionUtils';
import {
  canAddCategoryAsChild,
  addCategoryToParent,
  addMemoToCategory,
  isParentChild,
  getDirectChildMemos,
  getDirectChildCategories,
  isAncestor
} from './utils/categoryHierarchyUtils';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Canvas from './components/Canvas';
import { Tutorial } from './components/Tutorial';
import { tutorialSteps } from './utils/tutorialSteps';

const App: React.FC = () => {
  // 브라우저 기본 Ctrl/Command + 휠 줌 차단 (전역)
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // document 전체에 리스너 추가 (passive: false로 preventDefault 가능하게)
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

  // 한 번만 실행되는 localStorage 마이그레이션 (임시)
  useEffect(() => {
    const migrationDone = localStorage.getItem('categories-migration-done');
    if (!migrationDone) {
      console.log('🔄 카테고리 마이그레이션을 위해 localStorage 클리어 중...');
      localStorage.clear();
      localStorage.setItem('categories-migration-done', 'true');
      window.location.reload();
    }
  }, []);

  // ===== 커스텀 훅으로 상태 관리 =====
  const appState = useAppState();
  const {
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
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
    setQuickNavItems,
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
    setIsShiftPressed
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
    setDraggedCategoryAreas,
    shiftDragAreaCache,
    shiftDropProcessedMemos,
    dragStartMemoPositions,
    dragStartCategoryPositions,
    clearCategoryCache: clearCategoryCacheFromHook
  } = dragState;

  // 선택 핸들러 훅 사용
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
    setShowGeneralContent: appState.setShowGeneralContent
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
    quickNavItems,
    setQuickNavItems,
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
    currentPageId,
    quickNavItems,
    setQuickNavItems,
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

  // 튜토리얼 상태
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => {
    const completed = localStorage.getItem('tutorial-completed') === 'true';
    return {
      isActive: !completed, // 완료하지 않았으면 자동으로 시작
      currentStep: 0,
      completed: completed
    };
  });

  // 튜토리얼 validation 상태
  const [canvasPanned, setCanvasPanned] = useState(false);
  const [canvasZoomed, setCanvasZoomed] = useState(false);
  const [memoCreated, setMemoCreated] = useState(false);
  const [memoDragged, setMemoDragged] = useState(false);
  const initialCanvasOffset = React.useRef(canvasOffset);
  const initialCanvasScale = React.useRef(canvasScale);
  const initialMemoPositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialMemoCount = React.useRef(0);

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
    currentPageId
  });

  const {
    handleStartTutorial,
    handleTutorialNext,
    handleTutorialSkip,
    handleTutorialComplete,
    canProceedTutorial
  } = tutorialHandlers;

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
    setQuickNavItems,
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

  // 캔버스 이동 감지 (2단계 - canvas-pan)
  React.useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 2) {
      const dx = Math.abs(canvasOffset.x - initialCanvasOffset.current.x);
      const dy = Math.abs(canvasOffset.y - initialCanvasOffset.current.y);
      if (dx > 50 || dy > 50) {
        setCanvasPanned(true);
      }
    }
  }, [canvasOffset, tutorialState.isActive, tutorialState.currentStep]);

  // 캔버스 줌 감지 (3단계 - canvas-zoom)
  React.useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 3) {
      const scaleDiff = Math.abs(canvasScale - initialCanvasScale.current);
      if (scaleDiff > 0.1) {
        setCanvasZoomed(true);
      }
    }
  }, [canvasScale, tutorialState.isActive, tutorialState.currentStep]);

  // 메모 생성 감지 (4단계 - add-memo)
  React.useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 4) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage && currentPage.memos.length > initialMemoCount.current) {
        setMemoCreated(true);
      }
    }
  }, [pages, currentPageId, tutorialState.isActive, tutorialState.currentStep]);

  // 메모 드래그 감지 (5단계 - memo-drag)
  React.useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 5) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (!currentPage) return;

      // 메모 위치가 변경되었는지 확인
      for (const memo of currentPage.memos) {
        const initialPos = initialMemoPositions.current.get(memo.id);
        if (initialPos) {
          const dx = Math.abs(memo.position.x - initialPos.x);
          const dy = Math.abs(memo.position.y - initialPos.y);
          if (dx > 20 || dy > 20) {
            setMemoDragged(true);
            break;
          }
        }
      }
    }
  }, [pages, currentPageId, tutorialState.isActive, tutorialState.currentStep]);

  // clearCategoryCache는 useDragState에서 가져온 것을 사용
  const clearCategoryCache = clearCategoryCacheFromHook;


  // 카테고리 라벨만 이동 (영역은 변경하지 않음)
  const updateCategoryLabelPosition = (categoryId: string, position: { x: number; y: number }) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      return {
        ...page,
        categories: page.categories?.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              position
            };
          }
          return cat;
        }) || []
      };
    }));
  };

  // 카테고리 드래그 종료 시 드롭 감지 및 캐시 제거
  const handleCategoryPositionDragEnd = (categoryId: string, finalPosition: { x: number; y: number }) => {
    console.log('[App] handleCategoryPositionDragEnd - categoryId:', categoryId, 'finalPosition:', finalPosition);

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      clearCategoryCache(categoryId);
      previousFramePosition.current.delete(categoryId);
      return;
    }

    // 드랍 시점의 카테고리 및 하위 메모 위치 로그
    const childMemos = currentPage.memos.filter(m => m.parentId === categoryId);
    console.log('[App] 드랍 시 카테고리 최종 위치:', { x: Math.round(finalPosition.x), y: Math.round(finalPosition.y) });
    console.log('[App] 드랍 시 하위 메모 위치:', childMemos.map(m => ({ id: m.id, x: Math.round(m.position.x), y: Math.round(m.position.y) })));

    // 상대적 위치 계산
    if (childMemos.length > 0) {
      const relativeMemoPos = childMemos.map(m => ({
        id: m.id,
        relX: Math.round(m.position.x - finalPosition.x),
        relY: Math.round(m.position.y - finalPosition.y)
      }));
      console.log('[App] 카테고리 기준 상대 위치:', relativeMemoPos);
    }

    // Shift 드래그는 별도 처리 (이미 handleShiftDropCategory에서 처리됨)
    // 일반 드래그로는 종속 관계를 변경하지 않음 (위치만 밀어냄)

    // 드래그 종료 후 캐시 제거 - 메모 위치에 따라 자연스럽게 크기 조정
    // 다중 선택된 모든 카테고리의 캐시도 함께 제거
    const isMultiSelected = selectedCategoryIds.includes(categoryId);
    const categoriesToClear = isMultiSelected ? selectedCategoryIds : [categoryId];

    categoriesToClear.forEach(catId => {
      clearCategoryCache(catId);
      previousFramePosition.current.delete(catId);
      cacheCreationStarted.current.delete(catId);
    });

    // 드래그 종료 시 모든 위치 캐시 초기화
    dragStartMemoPositions.current.clear();
    dragStartCategoryPositions.current.clear();

    shiftDragAreaCache.current = {}; // Shift 드래그 캐시도 클리어
  };

  const [dragLineEnd, setDragLineEnd] = useState<{ x: number; y: number } | null>(null);

  // 중요도 필터 상태
  const [activeImportanceFilters, setActiveImportanceFilters] = useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [showGeneralContent, setShowGeneralContent] = useState<boolean>(true);
  const [isDragSelecting, setIsDragSelecting] = useState<boolean>(false);
  const [dragSelectStart, setDragSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSelectEnd, setDragSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragHoveredMemoIds, setDragHoveredMemoIds] = useState<string[]>([]);
  const [dragHoveredCategoryIds, setDragHoveredCategoryIds] = useState<string[]>([]);
  const [isDragSelectingWithShift, setIsDragSelectingWithShift] = useState<boolean>(false);
  const [isRightPanelFullscreen, setIsRightPanelFullscreen] = useState<boolean>(false);

  // 빠른 드래그 안정화를 위한 상태
  const lastDragTime = React.useRef<Map<string, number>>(new Map());
  const lastDragPosition = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const categoryExitTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 충돌 검사 디바운스를 위한 상태
  const collisionCheckTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCollisionCheck = React.useRef<Map<string, number>>(new Map());
  const collisionCheckCount = React.useRef<Map<string, number>>(new Map()); // 충돌 검사 횟수 추적
  const [dataRegistry, setDataRegistry] = useState<DataRegistry>({});
  const [isDraggingMemo, setIsDraggingMemo] = useState<boolean>(false);
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState<boolean>(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

  // Initialize data registry
  useEffect(() => {
    globalDataRegistry.setRegistry(dataRegistry);
    const unsubscribe = globalDataRegistry.subscribe(() => {
      setDataRegistry({ ...globalDataRegistry.getRegistry() });
    });
    return unsubscribe;
  }, [dataRegistry]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      // 모든 카테고리 종료 타이머 정리
      categoryExitTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryExitTimers.current.clear();

      // 카테고리 위치 업데이트 타이머 정리
      categoryPositionTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryPositionTimers.current.clear();

      // 충돌 검사 타이머 정리
      collisionCheckTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      collisionCheckTimers.current.clear();
    };
  }, []);

  // Shift 키 상태 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        console.log('[App] Shift 키 눌림');
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        console.log('[App] Shift 키 떼어짐');
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 카테고리 라벨 위치 자동 업데이트 (영역의 좌상단으로)
  // 메모가 이동할 때만 업데이트
  const updateCategoryPositions = React.useCallback(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return;

    const categoriesToUpdate: CategoryBlock[] = [];

    currentPage.categories.forEach(category => {
      const childMemos = currentPage.memos.filter(m => m.parentId === category.id);
      const childCategories = currentPage.categories?.filter(c => c.parentId === category.id) || [];
      const hasChildren = childMemos.length > 0 || childCategories.length > 0;

      if (hasChildren) {
        const area = calculateCategoryArea(category, currentPage);
        if (area) {
          // 영역의 좌상단 위치와 category.position이 다르면 업데이트 필요
          const padding = 20;
          const newX = area.x + padding;
          const newY = area.y + padding;

          if (Math.abs(category.position.x - newX) > 1 || Math.abs(category.position.y - newY) > 1) {
            categoriesToUpdate.push({
              ...category,
              position: { x: newX, y: newY }
            });
          }
        }
      }
    });

    // 업데이트가 필요한 카테고리가 있으면 한 번에 업데이트
    if (categoriesToUpdate.length > 0) {
      setPages(prev => prev.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            categories: page.categories?.map(cat => {
              const updated = categoriesToUpdate.find(u => u.id === cat.id);
              return updated || cat;
            }) || []
          };
        }
        return page;
      }));
    }
  }, [pages, currentPageId]);

  // ESC 키로 모든 선택 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ESC: 모든 선택 해제
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedMemoIds([]);
        setSelectedCategoryIds([]);
        // 드래그 선택 UI도 초기화
        setIsDragSelecting(false);
        setDragSelectStart(null);
        setDragSelectEnd(null);
        setDragHoveredMemoIds([]);
        setDragHoveredCategoryIds([]);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // localStorage 자동 저장 - 페이지 데이터
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAGES, pages);
  }, [pages]);

  // localStorage 자동 저장 - 현재 페이지 ID
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_PAGE_ID, currentPageId);
  }, [currentPageId]);

  // localStorage 자동 저장 - 패널 설정
  useEffect(() => {
    const settings = {
      leftPanelOpen,
      rightPanelOpen,
      leftPanelWidth,
      rightPanelWidth
    };
    saveToStorage(STORAGE_KEYS.PANEL_SETTINGS, settings);
  }, [leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth]);

  // localStorage 자동 저장 - 단축 이동 항목
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.QUICK_NAV_ITEMS, quickNavItems);
  }, [quickNavItems]);

  // 현재 페이지 ID가 유효한지 확인하고 수정
  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  const currentPage = pages.find(page => page.id === currentPageId);
  const selectedMemo = currentPage?.memos.find(memo => memo.id === selectedMemoId) ||
                      (selectedMemoIds.length === 1 ? currentPage?.memos.find(memo => memo.id === selectedMemoIds[0]) : undefined);
  const selectedMemos = currentPage?.memos.filter(memo => selectedMemoIds.includes(memo.id)) || [];
  const selectedCategory = currentPage?.categories?.find(category => category.id === selectedCategoryId) ||
                          (selectedCategoryIds.length === 1 ? currentPage?.categories?.find(category => category.id === selectedCategoryIds[0]) : undefined);
  // 단일 선택과 다중 선택을 합쳐서 중복 제거
  const allSelectedCategoryIds = selectedCategoryId
    ? [selectedCategoryId, ...selectedCategoryIds.filter(id => id !== selectedCategoryId)]
    : selectedCategoryIds;
  const selectedCategories = currentPage?.categories?.filter(category => allSelectedCategoryIds.includes(category.id)) || [];





  // 충돌하는 메모블록 밀어내기 함수
  const pushAwayConflictingMemos = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {

    const conflictingMemos = page.memos.filter(memo => {
      // 현재 카테고리에 속한 메모는 제외 (이미 올바른 위치에 있음)
      if (memo.parentId === categoryId) {
        return false;
      }

      // 메모와 카테고리 영역의 충돌 검사
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      const memoBounds = {
        left: memo.position.x,
        top: memo.position.y,
        right: memo.position.x + memoWidth,
        bottom: memo.position.y + memoHeight
      };

      const areaBounds = {
        left: categoryArea.x,
        top: categoryArea.y,
        right: categoryArea.x + categoryArea.width,
        bottom: categoryArea.y + categoryArea.height
      };

      // 실제 겹침 여부 확인 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(memoBounds.right <= areaBounds.left ||
                              memoBounds.left >= areaBounds.right ||
                              memoBounds.bottom <= areaBounds.top ||
                              memoBounds.top >= areaBounds.bottom);

      if (isOverlapping) {
      }

      return isOverlapping;
    });


    // 충돌하는 메모들을 영역 밖으로 밀어내기 (겹침 영역 기반)
    conflictingMemos.forEach(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;

      const memoBounds = {
        left: memo.position.x,
        top: memo.position.y,
        right: memo.position.x + memoWidth,
        bottom: memo.position.y + memoHeight
      };

      const areaBounds = {
        left: categoryArea.x,
        top: categoryArea.y,
        right: categoryArea.x + categoryArea.width,
        bottom: categoryArea.y + categoryArea.height
      };

      // 겹침 영역 계산
      const overlapLeft = Math.max(memoBounds.left, areaBounds.left);
      const overlapTop = Math.max(memoBounds.top, areaBounds.top);
      const overlapRight = Math.min(memoBounds.right, areaBounds.right);
      const overlapBottom = Math.min(memoBounds.bottom, areaBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;


      let newX = memo.position.x;
      let newY = memo.position.y;
      const safetyMargin = 5; // 최소 여백

      // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
      if (overlapWidth <= overlapHeight) {
        // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterX = memo.position.x + memoWidth / 2;
        const areaCenterX = categoryArea.x + categoryArea.width / 2;

        if (memoCenterX > areaCenterX) {
          // 오른쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x + overlapWidth + safetyMargin;
        } else {
          // 왼쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x - overlapWidth - safetyMargin;
        }
      } else {
        // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterY = memo.position.y + memoHeight / 2;
        const areaCenterY = categoryArea.y + categoryArea.height / 2;

        if (memoCenterY > areaCenterY) {
          // 아래쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y + overlapHeight + safetyMargin;
        } else {
          // 위쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y - overlapHeight - safetyMargin;
        }
      }

      const newPosition = { x: newX, y: newY };

      // 즉시 상태 업데이트
      setPages(prevPages => prevPages.map(p =>
        p.id === currentPageId
          ? {
              ...p,
              memos: p.memos.map(m =>
                m.id === memo.id
                  ? { ...m, position: newPosition }
                  : m
              )
            }
          : p
      ));
    });
  }, [currentPageId]);

  // 충돌하는 카테고리 영역 밀어내기 함수
  const pushAwayConflictingCategories = React.useCallback((movingCategoryId: string, movingCategoryArea: { x: number; y: number; width: number; height: number }, page: Page) => {

    // 카테고리 배열이 없으면 빈 배열로 초기화
    const categories = page.categories || [];
    if (categories.length === 0) {
      return;
    }

    const conflictingCategories = categories.filter(category => {
      if (category.id === movingCategoryId) return false;
      if (category.parentId === movingCategoryId || movingCategoryId === category.parentId) return false;

      const otherArea = calculateCategoryArea(category, page);
      if (!otherArea) {
        return false;
      }

      // 실제 영역 간 충돌 검사 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(movingCategoryArea.x + movingCategoryArea.width <= otherArea.x ||
                              movingCategoryArea.x >= otherArea.x + otherArea.width ||
                              movingCategoryArea.y + movingCategoryArea.height <= otherArea.y ||
                              movingCategoryArea.y >= otherArea.y + otherArea.height);

      if (isOverlapping) {
      }

      return isOverlapping;
    });


    // 충돌하는 카테고리들과 그 하위 요소들을 밀어내기
    conflictingCategories.forEach(category => {
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;

      const movingCenterX = movingCategoryArea.x + movingCategoryArea.width / 2;
      const movingCenterY = movingCategoryArea.y + movingCategoryArea.height / 2;
      const categoryCenterX = category.position.x + categoryWidth / 2;
      const categoryCenterY = category.position.y + categoryHeight / 2;

      const deltaX = categoryCenterX - movingCenterX;
      const deltaY = categoryCenterY - movingCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let offsetX: number, offsetY: number;

      // 겹침 영역 기반 밀어내기 계산
      const movingBounds = {
        left: movingCategoryArea.x,
        top: movingCategoryArea.y,
        right: movingCategoryArea.x + movingCategoryArea.width,
        bottom: movingCategoryArea.y + movingCategoryArea.height
      };

      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      // 겹침 영역 계산
      const overlapLeft = Math.max(movingBounds.left, categoryBounds.left);
      const overlapTop = Math.max(movingBounds.top, categoryBounds.top);
      const overlapRight = Math.min(movingBounds.right, categoryBounds.right);
      const overlapBottom = Math.min(movingBounds.bottom, categoryBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;


      const safetyMargin = 10; // 최소 여백

      if (distance === 0) {
        // 중심이 같은 경우 오른쪽으로 밀어내기
        offsetX = movingCategoryArea.width + safetyMargin;
        offsetY = 0;
      } else {
        // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
        if (overlapWidth <= overlapHeight) {
          // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterX > movingCenterX) {
            // 오른쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = overlapWidth + safetyMargin;
            offsetY = 0;
          } else {
            // 왼쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = -(overlapWidth + safetyMargin);
            offsetY = 0;
          }
        } else {
          // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterY > movingCenterY) {
            // 아래쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = overlapHeight + safetyMargin;
          } else {
            // 위쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = -(overlapHeight + safetyMargin);
          }
        }
      }

      const newCategoryPosition = {
        x: category.position.x + offsetX,
        y: category.position.y + offsetY
      };

      // 카테고리와 하위 요소들을 함께 이동 (즉시 상태 업데이트)
      setPages(prevPages => prevPages.map(page => {
        if (page.id !== currentPageId) return page;

        // 하위 메모들도 함께 이동
        const updatedMemos = page.memos.map(memo =>
          memo.parentId === category.id
            ? {
                ...memo,
                position: {
                  x: memo.position.x + offsetX,
                  y: memo.position.y + offsetY
                }
              }
            : memo
        );

        // 하위 카테고리들도 함께 이동
        const updatedCategories = (page.categories || []).map(cat =>
          cat.id === category.id
            ? { ...cat, position: newCategoryPosition }
            : cat.parentId === category.id
            ? {
                ...cat,
                position: {
                  x: cat.position.x + offsetX,
                  y: cat.position.y + offsetY
                }
              }
            : cat
        );

        return {
          ...page,
          memos: updatedMemos,
          categories: updatedCategories
        };
      }));
    });
  }, [currentPageId]);

  // 통합 충돌 감지 및 밀어내기 함수 (10번 제한)
  const pushAwayConflictingBlocks = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {
    // 10번 제한 안전장치
    const currentCount = collisionCheckCount.current.get(categoryId) || 0;
    if (currentCount >= 10) {
      return;
    }
    collisionCheckCount.current.set(categoryId, currentCount + 1);

    // 무한 충돌 방지 - 최근 1초 내에 충돌 검사를 했으면 스킵
    const now = Date.now();
    const lastCheck = lastCollisionCheck.current.get(categoryId) || 0;
    if (now - lastCheck < 1000) {
      return;
    }
    lastCollisionCheck.current.set(categoryId, now);

    // 10초 후 카운터 리셋
    setTimeout(() => {
      collisionCheckCount.current.set(categoryId, 0);
    }, 10000);


    // 1. 먼저 다른 카테고리 영역과의 충돌 검사 및 해결
    pushAwayConflictingCategories(categoryId, categoryArea, page);

    // 2. 그 다음 메모블록과의 충돌 검사 및 해결
    pushAwayConflictingMemos(categoryArea, categoryId, page);

  }, [currentPageId, pushAwayConflictingCategories, pushAwayConflictingMemos, collisionCheckCount, lastCollisionCheck]);







  // Shift 드래그로 카테고리에 카테고리 추가
  const handleShiftDropCategory = (draggedCategory: CategoryBlock, position: { x: number; y: number }, currentPage: Page, cachedAreas?: {[categoryId: string]: any}) => {
    // 카테고리 찾기
    const categoryWidth = draggedCategory.size?.width || 200;
    const categoryHeight = draggedCategory.size?.height || 80;
    const categoryBounds = {
      left: position.x,
      top: position.y,
      right: position.x + categoryWidth,
      bottom: position.y + categoryHeight
    };

    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    // 드래그 중인 카테고리와 그 모든 하위 카테고리들을 제외한 페이지 데이터 생성
    const getAllDescendantIds = (categoryId: string): string[] => {
      const descendants: string[] = [categoryId];
      const children = (currentPage.categories || []).filter(c => c.parentId === categoryId);
      children.forEach(child => {
        descendants.push(...getAllDescendantIds(child.id));
      });
      return descendants;
    };

    const excludedIds = getAllDescendantIds(draggedCategory.id);
    const pageWithoutDraggingCategory = {
      ...currentPage,
      categories: (currentPage.categories || []).filter(c => !excludedIds.includes(c.id)),
      memos: currentPage.memos.filter(m => !excludedIds.includes(m.parentId || ''))
    };

    // 타겟 카테고리 찾기 (자기 자신과 자신의 하위는 이미 pageWithoutDraggingCategory에서 제외됨)
    // 겹치는 모든 카테고리 찾기
    const overlappingCategories = pageWithoutDraggingCategory.categories?.filter(category => {

      // 1. 카테고리 블록과의 겹침 체크
      const catWidth = category.size?.width || 200;
      const catHeight = category.size?.height || 80;
      const catBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + catWidth,
        bottom: category.position.y + catHeight
      };

      if (isOverlapping(categoryBounds, catBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 카테고리를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingCategory);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(categoryBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    let targetCategory: CategoryBlock | null = null;

    if (overlappingCategories.length > 0) {
      // 각 카테고리의 깊이를 계산
      const categoriesWithDepth = overlappingCategories.map(category => {
        let depth = 0;
        let checkParent = category.parentId;
        while (checkParent) {
          depth++;
          const parentCat = currentPage.categories?.find(c => c.id === checkParent);
          checkParent = parentCat?.parentId;
        }
        return { category, depth };
      });

      // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
      const deepest = categoriesWithDepth.reduce((max, item) =>
        item.depth > max.depth ? item : max
      );

      targetCategory = deepest.category;
    }

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedCategory.parentId !== newParentId;

    // 다중 선택된 카테고리들도 함께 종속
    const categoriesToMove = selectedCategoryIds.includes(draggedCategory.id)
      ? [draggedCategory.id, ...selectedCategoryIds.filter(id => id !== draggedCategory.id)]
      : [draggedCategory.id];

    if (parentChanged) {
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          // 원래 위치 정보 가져오기 (드래그 시작 시 저장된 위치)
          const originalMemoPositions = dragStartMemoPositions.current.get(draggedCategory.id);
          const originalCategoryPositions = dragStartCategoryPositions.current.get(draggedCategory.id);

          // 부모 카테고리의 children 업데이트
          let updatedCategories = (p.categories || []).map(category => {
            // 드래그된 카테고리들의 parentId만 변경하고 위치는 원래대로
            if (categoriesToMove.includes(category.id)) {
              const originalPos = draggedCategoryAreas[category.id]?.originalPosition;
              return {
                ...category,
                parentId: newParentId,
                position: originalPos || category.position  // 원래 위치로 복원
              };
            }

            // 하위 카테고리들도 원래 위치로 복원
            if (originalCategoryPositions) {
              const originalPos = originalCategoryPositions.get(category.id);
              if (originalPos) {
                category = { ...category, position: originalPos };
              }
            }

            // 이전 부모들에서 제거 (다중 선택된 카테고리들 모두)
            if (categoriesToMove.some(catId => {
              const cat = p.categories?.find(c => c.id === catId);
              return cat?.parentId === category.id;
            })) {
              return {
                ...category,
                children: (category.children || []).filter(id => !categoriesToMove.includes(id))
              };
            }

            // 새 부모에 추가 (다중 선택된 카테고리들 모두)
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              const newChildren = [...currentChildren, ...categoriesToMove.filter(id => !currentChildren.includes(id))];
              return {
                ...category,
                children: newChildren,
                isExpanded: true  // 자동 확장
              };
            }

            return category;
          });

          // 하위 메모들도 원래 위치로 복원
          let updatedMemos = p.memos;
          if (originalMemoPositions) {
            updatedMemos = p.memos.map(memo => {
              const originalPos = originalMemoPositions.get(memo.id);
              if (originalPos) {
                return { ...memo, position: originalPos };
              }
              return memo;
            });
          }

          return {
            ...p,
            categories: updatedCategories,
            memos: updatedMemos
          };
        }
        return p;
      }));

      // Shift 드래그로 카테고리에 넣을 때만 펼침 (빼낼 때는 펼치지 않음)
      if (targetCategory && newParentId && !targetCategory.isExpanded) {
        toggleCategoryExpanded(targetCategory.id);
      }

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 카테고리 이동: ${draggedCategory.title} → ${targetName} (모든 하위 항목 포함)`);

      // 드롭 후 캐시 클리어 (중요!)
      clearCategoryCache(draggedCategory.id);
    } else {
      // 같은 카테고리 내에서 위치만 변경
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            categories: (p.categories || []).map(category =>
              category.id === draggedCategory.id
                ? { ...category, position }
                : category
            )
          };
        }
        return p;
      }));
    }
  };

  // Shift 드래그로 카테고리에 새 메모 추가
  const handleShiftDrop = (draggedMemo: MemoBlock, position: { x: number; y: number }, currentPage: Page, cachedAreas?: {[categoryId: string]: any}) => {
    // 카테고리 찾기
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };

    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    // 드래그 중인 메모를 제외한 페이지 데이터 생성
    const pageWithoutDraggingMemo = {
      ...currentPage,
      memos: currentPage.memos.filter(m => m.id !== draggedMemo.id)
    };

    // 카테고리 블록과 영역 모두 체크 - 겹치는 모든 카테고리 찾기
    const overlappingCategories = currentPage.categories?.filter(category => {
      // 1. 카테고리 블록과의 겹침 체크
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      if (isOverlapping(memoBounds, categoryBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용 (드래그 중인 메모 제외된 고정 영역)
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 메모를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingMemo);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(memoBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    // 깊이(depth)를 계산하여 가장 깊은 것을 선택
    let targetCategory: CategoryBlock | null = null;

    if (overlappingCategories.length > 0) {
      // 각 카테고리의 깊이를 계산
      const categoriesWithDepth = overlappingCategories.map(category => {
        let depth = 0;
        let checkParent = category.parentId;
        while (checkParent) {
          depth++;
          const parentCat = currentPage.categories?.find(c => c.id === checkParent);
          checkParent = parentCat?.parentId;
        }
        return { category, depth };
      });

      // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
      const deepest = categoriesWithDepth.reduce((max, item) =>
        item.depth > max.depth ? item : max
      );

      targetCategory = deepest.category;
    }

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedMemo.parentId !== newParentId;

    console.log('[handleShiftDrop] 함수 호출됨 - draggedMemo:', draggedMemo.id, 'draggedMemo.parentId:', draggedMemo.parentId, 'newParentId:', newParentId, 'parentChanged:', parentChanged);

    if (parentChanged) {
      // 원래 위치 가져오기 (드래그 시작 시 저장된 위치)
      const originalMemoPositions = dragStartMemoPositions.current.get(draggedMemo.id);

      // 다중 선택된 메모들도 함께 종속
      const memosToMove = selectedMemoIds.includes(draggedMemo.id)
        ? [draggedMemo.id, ...selectedMemoIds.filter(id => id !== draggedMemo.id)]
        : [draggedMemo.id];

      console.log('[handleShiftDrop] setPages 호출 시작 - 이동할 메모:', memosToMove);
      setPages(prev => {
        console.log('[handleShiftDrop] setPages 콜백 실행');
        return prev.map(p => {
          if (p.id === currentPageId) {
          // 메모의 parentId만 변경하고 위치는 원래대로 복원
          const updatedMemos = p.memos.map(memo => {
            if (memosToMove.includes(memo.id)) {
              const originalPos = originalMemoPositions?.get(memo.id);
              console.log('[handleShiftDrop] parentId 변경:', memo.id, '이전:', memo.parentId, '→ 새로운:', newParentId);
              return {
                ...memo,
                parentId: newParentId,
                position: originalPos || memo.position  // 원래 위치로 복원
              };
            }
            return memo;
          });

          // 카테고리의 children 배열 업데이트 (그리고 필요시 expand)
          const updatedCategories = (p.categories || []).map(category => {
            // 이전 부모에서 제거 (모든 이동 메모)
            if (memosToMove.some(memoId => {
              const memo = p.memos.find(m => m.id === memoId);
              return memo?.parentId === category.id;
            })) {
              console.log('[handleShiftDrop] 이전 부모 children 업데이트:', category.id);
              return {
                ...category,
                children: (category.children || []).filter(id => !memosToMove.includes(id))
              };
            }
            // 새 부모에 추가 + expand
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              const newChildren = [...currentChildren, ...memosToMove.filter(id => !currentChildren.includes(id))];
              console.log('[handleShiftDrop] 새 부모 children 업데이트:', category.id, 'before:', currentChildren, 'after:', newChildren);
              return {
                ...category,
                children: newChildren,
                isExpanded: true  // 여기서 expand 처리
              };
            }
            return category;
          });

            return {
              ...p,
              memos: updatedMemos,
              categories: updatedCategories
            };
          }
          return p;
        });
      });

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 메모 이동: ${draggedMemo.title} → ${targetName}`);

      // Shift 드래그로 처리된 메모 플래그 설정 (detectCategoryOnDrop에서 중복 처리 방지)
      shiftDropProcessedMemos.current.add(draggedMemo.id);
      // 잠시 후 플래그 제거 (다음 드래그를 위해)
      setTimeout(() => {
        shiftDropProcessedMemos.current.delete(draggedMemo.id);
      }, 100);

      // Shift 드래그 후 타이머 클리어 (일반 드래그 타이머와 충돌 방지)
      const existingTimer = categoryExitTimers.current.get(draggedMemo.id);
      if (existingTimer) {
        console.log('[handleShiftDrop] 기존 타이머 클리어:', draggedMemo.id);
        clearTimeout(existingTimer);
        categoryExitTimers.current.delete(draggedMemo.id);
      } else {
        console.log('[handleShiftDrop] 클리어할 타이머 없음:', draggedMemo.id);
      }
    } else {
      // 같은 카테고리 내에서 위치만 변경
      setPages(prev => prev.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            memos: p.memos.map(memo =>
              memo.id === draggedMemo.id
                ? { ...memo, position }
                : memo
            )
          };
        }
        return p;
      }));
    }
  };

  // 카테고리 영역 Shift+드래그 drop 처리 (Canvas에서 호출)
  const handleCategoryAreaShiftDrop = (category: CategoryBlock, position: { x: number; y: number }) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return;

    // 캐시된 영역이 있으면 사용
    const cachedAreas = shiftDragAreaCache.current;

    // handleShiftDropCategory 재사용
    handleShiftDropCategory(category, position, currentPage, cachedAreas);
  };

  // 카테고리 드래그 완료 시 카테고리 블록 겹침 감지 (Shift 드래그)
  const detectCategoryDropForCategory = (categoryId: string, position: { x: number; y: number }) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedCategory = currentPage.categories.find(c => c.id === categoryId);
    if (!draggedCategory) {
      return;
    }

    // Shift 키가 눌려있으면 카테고리-카테고리 종속 모드
    if (isShiftPressed) {
      handleShiftDropCategory(draggedCategory, position, currentPage, shiftDragAreaCache.current);
    }
  };

  // 드래그 완료 시 카테고리 블록 겹침 감지
  const detectCategoryOnDrop = (memoId: string, position: { x: number; y: number }) => {
    console.log('[detectCategoryOnDrop] 호출됨 - memoId:', memoId, 'isShiftPressed:', isShiftPressed, 'processed:', shiftDropProcessedMemos.current.has(memoId));

    // Shift 드래그로 이미 처리된 메모면 중복 처리 방지
    if (shiftDropProcessedMemos.current.has(memoId)) {
      console.log('[detectCategoryOnDrop] Shift 드래그로 이미 처리됨, 스킵:', memoId);
      return;
    }

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedMemo = currentPage.memos.find(m => m.id === memoId);
    if (!draggedMemo) {
      return;
    }

    // Shift 키가 눌려있으면 새 메모 복사 모드
    if (isShiftPressed) {
      handleShiftDrop(draggedMemo, position, currentPage, shiftDragAreaCache.current);
      return;
    }

    // 드래그 속도 계산을 위한 시간과 위치 추적
    const now = Date.now();
    const lastTime = lastDragTime.current.get(memoId) || now;
    const lastPos = lastDragPosition.current.get(memoId) || position;
    const timeDelta = now - lastTime;
    const distance = Math.sqrt(
      Math.pow(position.x - lastPos.x, 2) + Math.pow(position.y - lastPos.y, 2)
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // 현재 위치와 시간 업데이트
    lastDragTime.current.set(memoId, now);
    lastDragPosition.current.set(memoId, position);



    // 드래그된 메모의 경계 박스 계산
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };


    // 겹침 감지 함수 (여백 포함)
    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    const targetCategory = currentPage.categories.find(category => {
      // 카테고리의 경계 박스 계산
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };


      const overlapping = isOverlapping(memoBounds, categoryBounds, 20);

      return overlapping;
    });

    if (targetCategory) {
      // 같은 카테고리로 이동하려는 경우 - 실제 겹침이므로 정상적인 카테고리 내 이동
      if (draggedMemo.parentId === targetCategory.id) {
        return;
      }

      // 다른 카테고리로 이동하는 경우 - 방지 (자식 메모는 자동 이동 금지)
      if (draggedMemo.parentId && draggedMemo.parentId !== targetCategory.id) {
        // 자식 메모가 다른 카테고리와 겹치면 밀어내기만 수행하고 이동은 금지
        const categoryArea = calculateCategoryArea(targetCategory, currentPage);
        if (categoryArea) {
          pushAwayConflictingMemos(categoryArea, targetCategory.id, currentPage);
        }
        return; // 이동 중단
      }

      // 메모를 카테고리에 자동으로 추가
      moveToCategory(memoId, targetCategory.id);
      return;
    } else {
      // 카테고리 블록과 겹치지 않았을 때
      if (draggedMemo.parentId) {
        // 현재 소속된 카테고리의 영역에서도 벗어났는지 확인
        const currentCategory = currentPage.categories.find(cat => cat.id === draggedMemo.parentId);

        if (currentCategory) {
          // 현재 카테고리의 실제 영역 계산 (하위 메모들 포함)
          const childMemos = currentPage.memos.filter(memo => memo.parentId === currentCategory.id);

          const categoryWidth = currentCategory.size?.width || 200;
          const categoryHeight = currentCategory.size?.height || 80;

          let minX = currentCategory.position.x;
          let minY = currentCategory.position.y;
          let maxX = currentCategory.position.x + categoryWidth;
          let maxY = currentCategory.position.y + categoryHeight;

          // 하위 메모들의 경계 포함
          childMemos.forEach(memo => {
            const memoWidth = memo.size?.width || 200;
            const memoHeight = memo.size?.height || 95;
            minX = Math.min(minX, memo.position.x);
            minY = Math.min(minY, memo.position.y);
            maxX = Math.max(maxX, memo.position.x + memoWidth);
            maxY = Math.max(maxY, memo.position.y + memoHeight);
          });

          // 적절한 패딩 적용 (빠른 드래그 시 영역 이탈 방지하되 너무 크지 않게)
          const padding = 70;
          const categoryAreaBounds = {
            left: minX - padding,
            top: minY - padding,
            right: maxX + padding,
            bottom: maxY + padding
          };

          // 현재 카테고리 영역과 겹치는지 확인
          const stillInArea = isOverlapping(memoBounds, categoryAreaBounds, 0);

          if (!stillInArea) {
            // 빠른 드래그 시 안정화: 속도가 높으면 지연 처리
            const velocityThreshold = 1.0; // px/ms
            const exitDelay = velocity > velocityThreshold ? 300 : 100; // ms


            // 기존 타이머가 있으면 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            // 지연 후 카테고리에서 빼내기
            const timer = setTimeout(() => {
              // 지연 시간 후 다시 위치 확인
              const currentMemo = pages.find(p => p.id === currentPageId)?.memos.find(m => m.id === memoId);
              if (!currentMemo || !currentMemo.parentId) {
                categoryExitTimers.current.delete(memoId);
                return;
              }

              // 최종 위치에서 다시 영역 체크
              const currentMemoWidth = currentMemo.size?.width || 200;
              const currentMemoHeight = currentMemo.size?.height || 95;
              const currentMemoBounds = {
                left: currentMemo.position.x,
                top: currentMemo.position.y,
                right: currentMemo.position.x + currentMemoWidth,
                bottom: currentMemo.position.y + currentMemoHeight
              };

              const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
                return !(bounds1.right + margin < bounds2.left ||
                         bounds1.left - margin > bounds2.right ||
                         bounds1.bottom + margin < bounds2.top ||
                         bounds1.top - margin > bounds2.bottom);
              };

              const finalStillInArea = isOverlapping(currentMemoBounds, categoryAreaBounds, 0);

              if (!finalStillInArea) {
                console.log('[categoryExitTimer] 타이머 실행 - 영역 이탈 확인, moveToCategory 호출:', memoId);
                moveToCategory(memoId, null);
              } else {
                console.log('[categoryExitTimer] 타이머 실행 - 여전히 영역 안에 있음, 유지:', memoId);
              }

              categoryExitTimers.current.delete(memoId);
            }, exitDelay);

            categoryExitTimers.current.set(memoId, timer);
          } else {
            // 영역 내에 있으면 기존 타이머 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
              categoryExitTimers.current.delete(memoId);
            }
          }
        }
      } else {
      }
    }
  };

  // 카테고리 위치 업데이트 히스토리 타이머 관리
  const categoryPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 이전 프레임 위치 저장 (프레임 간 delta 계산용)
  const previousFramePosition = React.useRef<Map<string, {x: number, y: number}>>(new Map());

  // 캐시 생성 추적 (동기적으로)
  const cacheCreationStarted = React.useRef<Set<string>>(new Set());

  const updateCategoryPosition = (categoryId: string, position: { x: number; y: number }) => {
    console.log('[App] updateCategoryPosition 호출 - categoryId:', categoryId, 'position:', position, 'timestamp:', Date.now());

    // 먼저 현재 카테고리 위치를 찾아서 델타 값 계산 (state 업데이트 전의 원본 위치 기준)
    const currentPage = pages.find(p => p.id === currentPageId);
    const targetCategory = currentPage?.categories?.find(cat => cat.id === categoryId);

    let deltaX = 0;
    let deltaY = 0;
    let frameDeltaX = 0;
    let frameDeltaY = 0;

    if (targetCategory) {
      deltaX = position.x - targetCategory.position.x;
      deltaY = position.y - targetCategory.position.y;

      // 이전 프레임 위치와 비교하여 프레임 간 delta 계산
      const prevPos = previousFramePosition.current.get(categoryId);
      if (prevPos) {
        frameDeltaX = position.x - prevPos.x;
        frameDeltaY = position.y - prevPos.y;
      } else {
        // 첫 프레임이면 전체 delta 사용
        frameDeltaX = deltaX;
        frameDeltaY = deltaY;
      }

      // 현재 위치를 이전 프레임으로 저장
      previousFramePosition.current.set(categoryId, { x: position.x, y: position.y });

      // 첫 번째 위치 변경 시 드래그 시작으로 간주하고 영역 캐시 및 메모 원본 위치 저장
      if (!cacheCreationStarted.current.has(categoryId) && currentPage) {
        console.log('[App] 캐시 생성 시작 - categoryId:', categoryId, '원본 위치:', targetCategory.position);
        cacheCreationStarted.current.add(categoryId);

        const currentArea = calculateCategoryArea(targetCategory, currentPage);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: targetCategory.position.x, y: targetCategory.position.y }
            }
          }));
        }

        // 모든 하위 카테고리 ID 수집 (재귀적으로)
        const getAllDescendantCategoryIds = (parentId: string): string[] => {
          const directChildren = (currentPage.categories || [])
            .filter(cat => cat.parentId === parentId)
            .map(cat => cat.id);

          const allDescendants = [...directChildren];
          directChildren.forEach(childId => {
            allDescendants.push(...getAllDescendantCategoryIds(childId));
          });

          return allDescendants;
        };

        const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

        // 다중 선택된 모든 카테고리들의 하위 요소 ID 수집
        const isMultiSelected = selectedCategoryIds.includes(categoryId);
        const allSelectedCategoriesDescendants = new Set<string>();
        if (isMultiSelected) {
          selectedCategoryIds.forEach(selectedCatId => {
            allSelectedCategoriesDescendants.add(selectedCatId);
            getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
              allSelectedCategoriesDescendants.add(descId);
            });
          });
        }

        // 모든 하위 depth의 메모들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const memoPositions = new Map<string, {x: number, y: number}>();
        currentPage.memos.forEach(memo => {
          // 드래그 중인 카테고리의 하위 메모
          if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 다른 카테고리들의 하위 메모
          else if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 메모들
          else if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
        });
        dragStartMemoPositions.current.set(categoryId, memoPositions);

        // 모든 하위 depth의 카테고리들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const categoryPositions = new Map<string, {x: number, y: number}>();
        currentPage.categories?.forEach(cat => {
          // 드래그 중인 카테고리의 하위 카테고리
          if (allDescendantCategoryIds.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
          // 다중 선택된 다른 카테고리들과 그 하위 카테고리들
          else if (isMultiSelected && allSelectedCategoriesDescendants.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
        });
        dragStartCategoryPositions.current.set(categoryId, categoryPositions);

      }
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const pageTargetCategory = (page.categories || []).find(cat => cat.id === categoryId);
      if (!pageTargetCategory) return page;

      // 원본 카테고리 위치와 새 위치의 총 델타 계산
      const cachedData = draggedCategoryAreas[categoryId];
      const totalDeltaX = cachedData ? position.x - cachedData.originalPosition.x : deltaX;
      const totalDeltaY = cachedData ? position.y - cachedData.originalPosition.y : deltaY;

      // 모든 하위 카테고리 ID 수집 (재귀적으로)
      const getAllDescendantCategoryIds = (parentId: string): string[] => {
        const directChildren = (page.categories || [])
          .filter(cat => cat.parentId === parentId)
          .map(cat => cat.id);

        const allDescendants = [...directChildren];
        directChildren.forEach(childId => {
          allDescendants.push(...getAllDescendantCategoryIds(childId));
        });

        return allDescendants;
      };

      // 다중 선택된 카테고리들 확인
      const isMultiSelected = selectedCategoryIds.includes(categoryId);


      // 드래그 중인 카테고리의 하위 요소만 수집 (이들은 부모를 따라 이동)
      const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

      // 다중 선택된 "모든" 카테고리들의 하위 요소 수집
      const allSelectedCategoriesDescendants = new Set<string>();
      if (isMultiSelected) {
        selectedCategoryIds.forEach(selectedCatId => {
          allSelectedCategoriesDescendants.add(selectedCatId);
          getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
            allSelectedCategoriesDescendants.add(descId);
          });
        });
      }

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = page.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 모든 하위 depth의 메모들도 함께 이동 (절대 위치 계산)
      const updatedMemos = page.memos.map(memo => {
        // 1. 드래그 중인 카테고리의 하위 메모들 이동 (절대 위치)
        if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
          const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
          if (originalPos) {
            return {
              ...memo,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음 (드래그 종료 후 호출 방지)
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 메모들도 이동 (절대 위치)
        if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 메모들도 이동 (절대 위치, 선택된 카테고리의 하위 요소가 아닌 경우만)
        if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
          if (!isDescendantOfSelectedCategory(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }
        return memo;
      });

      // 모든 하위 depth의 카테고리들도 함께 이동 (절대 위치 계산)
      const updatedCategories = (page.categories || []).map(category => {
        if (category.id === categoryId) {
          console.log('[App setPages] 카테고리 위치 업데이트 - categoryId:', categoryId, 'position:', position);
          return { ...category, position };
        }

        // 1. 드래그 중인 카테고리의 하위 카테고리들 이동 (절대 위치)
        if (allDescendantCategoryIds.has(category.id) && category.id !== categoryId) {
          const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
          if (originalPos) {
            return {
              ...category,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 카테고리들도 이동 (절대 위치)
        if (isMultiSelected && allSelectedCategoriesDescendants.has(category.id)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(category.id)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 최상위 카테고리들도 이동 (절대 위치, 하위가 아닌 것만)
        if (isMultiSelected && selectedCategoryIds.includes(category.id) && category.id !== categoryId && !allDescendantCategoryIds.has(category.id)) {
          if (!isDescendantOfSelectedCategory(category.parentId)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        return category;
      });

      // 충돌 검사 수행 (Shift 누르면 충돌 검사 건너뛰기)
      if (!isShiftPressed) {
        const pageWithUpdates = {
          ...page,
          memos: updatedMemos,
          categories: updatedCategories
        };

        // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
        // 다중 선택된 모든 카테고리와 메모의 ID 수집
        const allMovingIds = isMultiSelected
          ? [...selectedCategoryIds, ...selectedMemoIds]
          : [categoryId];

        const collisionResult = resolveUnifiedCollisions(categoryId, 'area', pageWithUpdates, 10, allMovingIds);

        return {
          ...page,
          memos: collisionResult.updatedMemos,
          categories: collisionResult.updatedCategories
        };
      }

      return {
        ...page,
        memos: updatedMemos,
        categories: updatedCategories
      };
    }));

    // 기존 실시간 충돌 검사 로직 제거됨 (resolveAreaCollisions로 통합)
    /*
    // 실시간 면접촉 기반 고정 크기 충돌 검사 - 드래그 중에 작동
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      // 프레임 간 delta를 사용하여 실제 이동 방향 파악
      const capturedDeltaX = deltaX;
      const capturedDeltaY = deltaY;
      const capturedFrameDeltaX = frameDeltaX;
      const capturedFrameDeltaY = frameDeltaY;
      const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);


      setPages(prevPages => {
        const currentPage = prevPages.find(p => p.id === currentPageId);
        if (!currentPage) return prevPages;

        const movingCategory = currentPage.categories?.find(cat => cat.id === categoryId);
        if (!movingCategory) return prevPages;

        // 이동 중인 카테고리의 실제 표시 영역 (하위 메모들 포함)
        // 드래그 중인 카테고리는 캐시된 영역 사용 (크기 고정)
        let movingArea: any = null;

        if (draggedCategoryAreas[movingCategory.id]) {
          // 캐시된 영역이 있다면 현재 카테고리 위치에 맞게 좌표 조정
          const cached = draggedCategoryAreas[movingCategory.id];
          const deltaX = movingCategory.position.x - cached.originalPosition.x;
          const deltaY = movingCategory.position.y - cached.originalPosition.y;

          movingArea = {
            x: cached.area.x + deltaX,
            y: cached.area.y + deltaY,
            width: cached.area.width,   // 캐시된 크기 유지
            height: cached.area.height, // 캐시된 크기 유지
            color: cached.area.color
          };
        } else {
          // 캐시된 영역이 없으면 동적 계산
          movingArea = calculateCategoryArea(movingCategory, currentPage);
        }


        // 실제 영역이 없으면 충돌 검사 생략
        if (!movingArea) {
          return prevPages;
        }

        // 연쇄 충돌 처리: 우선순위 기반 반복 충돌 검사
        let hasCollision = false;
        const pushedMemoIds = new Set<string>(); // 밀려난 메모 추적

        // 초기 카테고리 상태 + 메모 상태 (충돌 계산용)
        let updatedCategories = [...(currentPage.categories || [])];
        let updatedMemosForCollision = [...currentPage.memos];

        // 우선순위 맵: 드래그 중인 카테고리가 최고 우선순위 (0)
        const priorityMap = new Map<string, number>();
        priorityMap.set(categoryId, 0);

        // 주 이동 방향 결정 (프레임 간 delta 사용)
        const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);

        // 최대 10회 반복 (연쇄 충돌)
        let iteration = 0;
        let continueCollisionCheck = true;

        while (continueCollisionCheck && iteration < 10) {
          continueCollisionCheck = false;
          iteration++;

          // 현재 반복에서 이동된 카테고리들
          const movedInThisIteration = new Map<string, {x: number, y: number}>();

          // 이전 상태 저장 (같은 반복 내에서 변경 전 값 참조)
          const previousCategories = [...updatedCategories];

          updatedCategories = updatedCategories.map(currentCat => {
            // 각 카테고리에 대해 우선순위가 높은 다른 카테고리들과 충돌 검사
            let resultCategory = { ...currentCat };
            let totalPushX = 0;
            let totalPushY = 0;
            let highestPusherPriority = Infinity;

            for (const otherCategory of previousCategories) {
              if (otherCategory.id === currentCat.id) continue;

              // 우선순위 확인: 현재 카테고리가 상대방보다 낮은 우선순위일 때만 밀림
              const currentPriority = priorityMap.get(currentCat.id) ?? Infinity;
              const otherPriority = priorityMap.get(otherCategory.id) ?? Infinity;

              if (currentPriority <= otherPriority) continue; // 우선순위가 같거나 높으면 밀리지 않음

              // 영역 계산 (이미 업데이트된 위치 기준 - 메모도 업데이트된 것 사용)
              const currentUpdated = updatedCategories.find(c => c.id === currentCat.id) || currentCat;
              const tempPage = { ...currentPage, memos: updatedMemosForCollision, categories: updatedCategories };
              const currentArea = calculateCategoryArea(currentUpdated, tempPage);
              const otherUpdated = updatedCategories.find(c => c.id === otherCategory.id) || otherCategory;
              const otherArea = calculateCategoryArea(otherUpdated, tempPage);

              if (!currentArea || !otherArea) continue;

              // 실제 영역 겹침 검사
              const isOverlapping = !(
                currentArea.x + currentArea.width <= otherArea.x ||
                currentArea.x >= otherArea.x + otherArea.width ||
                currentArea.y + currentArea.height <= otherArea.y ||
                currentArea.y >= otherArea.y + otherArea.height
              );

              if (!isOverlapping) continue;

              // 충돌한 면 판정
              let pushX = 0;
              let pushY = 0;

              // 밀려나는 영역의 경계
              const currentLeft = currentArea.x;
              const currentRight = currentArea.x + currentArea.width;
              const currentTop = currentArea.y;
              const currentBottom = currentArea.y + currentArea.height;

              // 밀어내는 영역의 경계
              const otherLeft = otherArea.x;
              const otherRight = otherArea.x + otherArea.width;
              const otherTop = otherArea.y;
              const otherBottom = otherArea.y + otherArea.height;

              // 주 이동 방향에 따라 해당 축만 충돌 검사
              if (isMainlyHorizontal) {
                // X축 충돌 검사
                const overlapRight = otherRight - currentLeft;
                if (overlapRight > 0 && otherLeft < currentLeft && otherRight < currentRight) {
                  pushX = overlapRight;
                }
                const overlapLeft = currentRight - otherLeft;
                if (overlapLeft > 0 && otherRight > currentRight && otherLeft > currentLeft) {
                  pushX = -overlapLeft;
                }
              } else {
                // Y축 충돌 검사
                const overlapBottom = otherBottom - currentTop;
                if (overlapBottom > 0 && otherTop < currentTop && otherBottom < currentBottom) {
                  pushY = overlapBottom;
                }
                const overlapTop = currentBottom - otherTop;
                if (overlapTop > 0 && otherBottom > currentBottom && otherTop > currentTop) {
                  pushY = -overlapTop;
                }
              }

              // 충돌이 감지되면 이동량 누적
              if (pushX !== 0 || pushY !== 0) {
                // 가장 우선순위가 높은 밀어내는 영역만 적용
                if (otherPriority < highestPusherPriority) {
                  totalPushX = pushX;
                  totalPushY = pushY;
                  highestPusherPriority = otherPriority;


                  // 우선순위 업데이트: 밀린 카테고리는 밀어낸 카테고리보다 1 낮은 우선순위
                  if (!priorityMap.has(currentCat.id)) {
                    priorityMap.set(currentCat.id, otherPriority + 1);
                  }
                }
              }
            }

            // 최종 이동량 적용
            if (totalPushX !== 0 || totalPushY !== 0) {
              const newPosition = {
                x: currentCat.position.x + totalPushX,
                y: currentCat.position.y + totalPushY
              };

              resultCategory = {
                ...resultCategory,
                position: newPosition
              };

              movedInThisIteration.set(currentCat.id, newPosition);
              hasCollision = true;
              continueCollisionCheck = true; // 다음 반복 필요

              // 영역이 밀릴 때 자식 메모도 함께 이동
              updatedMemosForCollision = updatedMemosForCollision.map(memo => {
                if (currentCat.children?.includes(memo.id)) {
                  return {
                    ...memo,
                    position: {
                      x: memo.position.x + totalPushX,
                      y: memo.position.y + totalPushY
                    }
                  };
                }
                return memo;
              });
            }

            return resultCategory;
          });
        }


        if (hasCollision) {

          // 충돌당한 카테고리들의 내부 메모들도 함께 이동
          const movedCategoryIds = new Set<string>();
          updatedCategories.forEach((cat, idx) => {
            const originalCat = (currentPage.categories || [])[idx];
            if (originalCat && (cat.position.x !== originalCat.position.x || cat.position.y !== originalCat.position.y)) {
              movedCategoryIds.add(cat.id);
            }
          });

          // 메모 충돌 처리: 영역과 메모 간 충돌 검사 (주 이동 방향 재사용)
          const updatedMemos = currentPage.memos.map(memo => {
            // 충돌당한 카테고리의 메모들만 이동 (충돌을 일으킨 카테고리 제외)
            if (memo.parentId && movedCategoryIds.has(memo.parentId) && memo.parentId !== categoryId) {
              const movedCategory = updatedCategories.find(c => c.id === memo.parentId);
              const originalCategory = (currentPage.categories || []).find(c => c.id === memo.parentId);
              if (movedCategory && originalCategory) {
                const memoDeltaX = movedCategory.position.x - originalCategory.position.x;
                const memoDeltaY = movedCategory.position.y - originalCategory.position.y;
                return {
                  ...memo,
                  position: {
                    x: memo.position.x + memoDeltaX,
                    y: memo.position.y + memoDeltaY
                  }
                };
              }
            }

            // 영역에 속하지 않은 독립 메모와의 충돌 처리
            if (!memo.parentId && memo.id !== categoryId) {
              const memoWidth = memo.size?.width || 200;
              const memoHeight = memo.size?.height || 150;
              const memoLeft = memo.position.x;
              const memoRight = memo.position.x + memoWidth;
              const memoTop = memo.position.y;
              const memoBottom = memo.position.y + memoHeight;

              // 영역과 메모의 충돌 검사
              const isOverlapping = !(
                movingArea.x + movingArea.width <= memoLeft ||
                movingArea.x >= memoRight ||
                movingArea.y + movingArea.height <= memoTop ||
                movingArea.y >= memoBottom
              );

              if (isOverlapping) {
                let pushX = 0;
                let pushY = 0;

                const movingAreaRight = movingArea.x + movingArea.width;
                const movingAreaBottom = movingArea.y + movingArea.height;

                // 주 이동 방향 결정 (프레임 간 delta 사용)
                const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);

                // 주 이동 방향에 따라 해당 축만 충돌 검사
                if (isMainlyHorizontal) {
                  // X축 충돌 검사
                  const overlapRight = movingAreaRight - memoLeft;
                  if (overlapRight > 0 && movingArea.x < memoLeft && movingAreaRight < memoRight) {
                    pushX = overlapRight;
                  }
                  const overlapLeft = memoRight - movingArea.x;
                  if (overlapLeft > 0 && movingAreaRight > memoRight && movingArea.x > memoLeft) {
                    pushX = -overlapLeft;
                  }
                } else {
                  // Y축 충돌 검사
                  const overlapBottom = movingAreaBottom - memoTop;
                  if (overlapBottom > 0 && movingArea.y < memoTop && movingAreaBottom < memoBottom) {
                    pushY = overlapBottom;
                  }
                  const overlapTop = memoBottom - movingArea.y;
                  if (overlapTop > 0 && movingAreaBottom > memoBottom && movingArea.y > memoTop) {
                    pushY = -overlapTop;
                  }
                }

                if (pushX !== 0 || pushY !== 0) {
                  pushedMemoIds.add(memo.id);
                  return {
                    ...memo,
                    position: {
                      x: memo.position.x + pushX,
                      y: memo.position.y + pushY
                    }
                  };
                }
              }
            }

            return memo;
          });

          return prevPages.map(page =>
            page.id === currentPageId
              ? { ...page, categories: updatedCategories, memos: updatedMemos }
              : page
          );
        }

        return prevPages;
      });
    }
    */

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = categoryPositionTimers.current.get(categoryId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('category_move', `카테고리 이동: ${categoryId}`);
      categoryPositionTimers.current.delete(categoryId);
    }, 200);

    categoryPositionTimers.current.set(categoryId, newTimer);
  };


  // 통합 삭제 함수 - 현재 선택된 아이템(메모 또는 카테고리) 삭제
  const deleteSelectedItem = () => {
    // 다중 선택된 항목들 삭제
    if (selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) {
      const memoCount = selectedMemoIds.length;
      const categoryCount = selectedCategoryIds.length;

      setPages(prev => prev.map(page => {
        if (page.id !== currentPageId) return page;

        return {
          ...page,
          memos: page.memos.filter(memo => !selectedMemoIds.includes(memo.id)),
          categories: (page.categories || []).filter(cat => !selectedCategoryIds.includes(cat.id))
        };
      }));

      // 단축 이동 목록에서 삭제된 메모/카테고리 제거
      setQuickNavItems(prev => prev.filter(item =>
        !selectedMemoIds.includes(item.targetId) && !selectedCategoryIds.includes(item.targetId)
      ));

      // 선택 상태 초기화
      setSelectedMemoIds([]);
      setSelectedCategoryIds([]);

      // 단일 선택도 초기화
      if (selectedMemoIds.includes(selectedMemoId || '')) {
        setSelectedMemoId(null);
      }
      if (selectedCategoryIds.includes(selectedCategoryId || '')) {
        setSelectedCategoryId(null);
      }

      // 실행 취소를 위한 상태 저장
      const description = `다중 삭제: 메모 ${memoCount}개, 카테고리 ${categoryCount}개`;
      setTimeout(() => saveCanvasState('bulk_delete', description), 0);
    }
    // 단일 선택 삭제
    else if (selectedMemoId) {
      deleteMemoBlock();
    } else if (selectedCategoryId) {
      deleteCategory(selectedCategoryId);
      setSelectedCategoryId(null);
    }
  };

  // 메모 위치 업데이트 히스토리 타이머 관리
  const memoPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateMemoPosition = (memoId: string, position: { x: number; y: number }) => {
    // 메모가 이동하면 부모 카테고리의 캐시 제거 (영역 재계산을 위해)
    const currentPage = pages.find(p => p.id === currentPageId);
    const movedMemo = currentPage?.memos.find(m => m.id === memoId);
    if (movedMemo?.parentId) {
      clearCategoryCache(movedMemo.parentId);
    }

    // 다중 선택된 메모들 확인
    const isMultiSelected = selectedMemoIds.includes(memoId);
    const deltaX = movedMemo ? position.x - movedMemo.position.x : 0;
    const deltaY = movedMemo ? position.y - movedMemo.position.y : 0;

    setPages(prev => {
      const currentPage = prev.find(p => p.id === currentPageId);
      if (!currentPage) {
        return prev.map(page =>
          page.id === currentPageId
            ? {
                ...page,
                memos: page.memos.map(memo =>
                  memo.id === memoId ? { ...memo, position } : memo
                )
              }
            : page
        );
      }

      const movedMemo = currentPage.memos.find(m => m.id === memoId);
      if (!movedMemo) return prev;

      // 영역과의 충돌 체크 (방향별)
      const categories = currentPage.categories || [];
      const memoWidth = movedMemo.size?.width || 200;
      const memoHeight = movedMemo.size?.height || 95;

      let restrictedX = false;
      let restrictedY = false;

      // 부모가 없는 메모만 영역 충돌 검사 (Shift 누르면 스킵)
      if (!movedMemo.parentId && !isShiftPressed) {
        for (const category of categories) {
          const categoryArea = calculateCategoryArea(category, currentPage);
          if (!categoryArea) continue;

          // 새 위치에서의 메모 영역
          const newMemoBounds = {
            left: position.x,
            top: position.y,
            right: position.x + memoWidth,
            bottom: position.y + memoHeight
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

          // 겹침이 있으면
          if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
            // X 방향 이동 체크
            const deltaX = position.x - movedMemo.position.x;
            if (deltaX !== 0) restrictedX = true;

            // Y 방향 이동 체크
            const deltaY = position.y - movedMemo.position.y;
            if (deltaY !== 0) restrictedY = true;
          }
        }
      }

      // 제한된 방향은 원래 위치 유지
      const finalPosition = {
        x: restrictedX ? movedMemo.position.x : position.x,
        y: restrictedY ? movedMemo.position.y : position.y
      };

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = currentPage.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 선택된 카테고리의 모든 하위 요소(메모, 카테고리) 찾기
      const getAllChildrenOfCategories = (categoryIds: string[]): { memos: Set<string>, categories: Set<string> } => {
        const childMemos = new Set<string>();
        const childCategories = new Set<string>();

        const addDescendants = (catId: string) => {
          // 이 카테고리의 직계 자식 메모들
          currentPage.memos.forEach(m => {
            if (m.parentId === catId) {
              childMemos.add(m.id);
            }
          });

          // 이 카테고리의 직계 자식 카테고리들
          currentPage.categories?.forEach(c => {
            if (c.parentId === catId) {
              childCategories.add(c.id);
              // 재귀적으로 하위 요소들도 추가
              addDescendants(c.id);
            }
          });
        };

        categoryIds.forEach(catId => addDescendants(catId));
        return { memos: childMemos, categories: childCategories };
      };

      const childrenOfSelectedCategories = isMultiSelected
        ? getAllChildrenOfCategories(selectedCategoryIds)
        : { memos: new Set<string>(), categories: new Set<string>() };

      console.log('🔍 선택된 카테고리의 하위 요소:', {
        selectedCategoryIds,
        childMemos: Array.from(childrenOfSelectedCategories.memos),
        childCategories: Array.from(childrenOfSelectedCategories.categories)
      });

      // 메모 위치 업데이트 (다중 선택 시 선택된 모든 메모 + 선택된 카테고리의 하위 메모들 함께 이동)
      const updatedPage = {
        ...currentPage,
        memos: currentPage.memos.map(memo => {
          if (memo.id === memoId) {
            return { ...memo, position: finalPosition };
          }

          // 1. 다중 선택된 다른 메모들 이동 (단, 선택된 카테고리의 하위 요소가 아닌 경우만)
          if (isMultiSelected && selectedMemoIds.includes(memo.id) && memo.id !== memoId) {
            if (!isDescendantOfSelectedCategory(memo.parentId)) {
              return {
                ...memo,
                position: {
                  x: memo.position.x + deltaX,
                  y: memo.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 메모들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.memos.has(memo.id)) {
            return {
              ...memo,
              position: {
                x: memo.position.x + deltaX,
                y: memo.position.y + deltaY
              }
            };
          }

          return memo;
        }),
        // 선택된 카테고리들 + 하위 카테고리들 함께 이동
        categories: (currentPage.categories || []).map(category => {
          // 1. 직접 선택된 카테고리 이동 (단, 다른 선택된 카테고리의 하위가 아닌 경우만)
          if (isMultiSelected && selectedCategoryIds.includes(category.id)) {
            if (!isDescendantOfSelectedCategory(category.parentId)) {
              return {
                ...category,
                position: {
                  x: category.position.x + deltaX,
                  y: category.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 카테고리들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.categories.has(category.id)) {
            return {
              ...category,
              position: {
                x: category.position.x + deltaX,
                y: category.position.y + deltaY
              }
            };
          }

          return category;
        })
      };

      // Shift 드래그 중에는 충돌 검사 안 함
      if (isShiftPressed) {
        return prev.map(page =>
          page.id === currentPageId
            ? updatedPage
            : page
        );
      }

      // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
      // 다중 선택된 모든 메모와 카테고리의 ID 수집
      const allMovingIds = isMultiSelected
        ? [...selectedMemoIds, ...selectedCategoryIds]
        : [memoId];

      const collisionResult = resolveUnifiedCollisions(memoId, 'memo', updatedPage, 10, allMovingIds);

      return prev.map(page =>
        page.id === currentPageId
          ? {
              ...page,
              categories: collisionResult.updatedCategories,
              memos: collisionResult.updatedMemos
            }
          : page
      );
    });

    // 메모 이동 후 부모 카테고리의 라벨 위치 업데이트
    if (movedMemo?.parentId) {
      setTimeout(() => updateCategoryPositions(), 0);
    }

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = memoPositionTimers.current.get(memoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('memo_move', `메모 이동: ${memoId}`);
      memoPositionTimers.current.delete(memoId);
    }, 200);

    memoPositionTimers.current.set(memoId, newTimer);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 왼쪽 패널 */}
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
          onSearch={(query, category, results) => {
            // 검색 결과 처리 로직은 필요에 따라 추가
          }}
          onDeleteMemo={deleteMemoById}
          onDeleteCategory={deleteCategory}
          onNavigateToMemo={handleNavigateToMemo}
          onNavigateToCategory={handleNavigateToCategory}
          onStartTutorial={handleStartTutorial}
        />
      )}

      {/* 접기/펼치기 버튼 (왼쪽) */}
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        style={{
          position: 'absolute',
          left: leftPanelOpen ? `${leftPanelWidth}px` : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          padding: '8px 6px',
          cursor: 'pointer',
          borderRadius: '0 6px 6px 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
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
        onAddMemo={addMemoBlock}
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
        dragLineEnd={dragLineEnd}
        onStartConnection={startConnection}
        onConnectMemos={connectMemos}
        onCancelConnection={cancelConnection}
        onRemoveConnection={removeConnection}
        onUpdateDragLine={updateDragLine}
        isDragSelecting={isDragSelecting}
        dragSelectStart={dragSelectStart}
        dragSelectEnd={dragSelectEnd}
        dragHoveredMemoIds={dragHoveredMemoIds}
        dragHoveredCategoryIds={dragHoveredCategoryIds}
        onDragSelectStart={handleDragSelectStart}
        onDragSelectMove={handleDragSelectMove}
        onDragSelectEnd={handleDragSelectEnd}
        activeImportanceFilters={activeImportanceFilters}
        onToggleImportanceFilter={toggleImportanceFilter}
        showGeneralContent={showGeneralContent}
        onToggleGeneralContent={() => setShowGeneralContent(!showGeneralContent)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoCanvasAction}
        onRedo={redoCanvasAction}
        isDraggingMemo={isDraggingMemo}
        draggingMemoId={draggingMemoId}
        onMemoDragStart={(memoId: string) => {
          setIsDraggingMemo(true);
          setDraggingMemoId(memoId);
        }}
        onMemoDragEnd={() => {
          setIsDraggingMemo(false);
          setDraggingMemoId(null);
          // 드래그 완료 후 충돌 검사 - 주석 처리 (무한 반복 문제)
          // setTimeout(() => {
          //   const currentPage = pages.find(p => p.id === currentPageId);
          //   if (currentPage) {
          //     // 모든 카테고리에 대해 충돌 검사 수행
          //     currentPage.categories?.forEach(category => {
          //       const categoryArea = calculateCategoryArea(category, currentPage);
          //       if (categoryArea) {
          //         // 카운터 리셋
          //         collisionCheckCount.current.set(category.id, 0);
          //         console.log('🔄 메모 드래그 완료 후 충돌 검사 시작:', category.id);
          //         pushAwayConflictingBlocks(categoryArea, category.id, currentPage);
          //       }
          //     });
          //   }
          // }, 100);
        }}
        isShiftPressed={isShiftPressed}
        shiftDragAreaCacheRef={shiftDragAreaCache}
        onShiftDropCategory={handleCategoryAreaShiftDrop}
        isDraggingCategory={isDraggingCategory}
        onCategoryDragStart={() => {
          setIsDraggingCategory(true);
        }}
        onCategoryDragEnd={() => {
          setIsDraggingCategory(false);
          // 드래그 완료 후 충돌 검사 - 일단 주석 처리 (영역 크기 변경 문제 해결)
          // setTimeout(() => {
          //   const currentPage = pages.find(p => p.id === currentPageId);
          //   if (currentPage) {
          //     // 모든 카테고리에 대해 충돌 검사 수행
          //     currentPage.categories?.forEach(category => {
          //       const categoryArea = calculateCategoryArea(category, currentPage);
          //       if (categoryArea) {
          //         // 카운터 리셋
          //         collisionCheckCount.current.set(category.id, 0);
          //         console.log('🔄 카테고리 드래그 완료 후 충돌 검사 시작:', category.id);
          //         pushAwayConflictingBlocks(categoryArea, category.id, currentPage);
          //       }
          //     });
          //   }
          // }, 100);
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

      {/* 접기/펼치기 버튼 (오른쪽) */}
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        style={{
          position: 'absolute',
          right: rightPanelOpen ? `${rightPanelWidth}px` : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          padding: '8px 6px',
          cursor: 'pointer',
          borderRadius: '6px 0 0 6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
      >
        {rightPanelOpen ? '▶' : '◀'}
      </button>

      {/* 단축 이동 버튼 */}
      <button
        data-tutorial="quick-nav-btn"
        onClick={() => setShowQuickNavPanel(!showQuickNavPanel)}
        style={{
          position: 'fixed',
          top: '20px',
          right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px',
          zIndex: 1001,
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#7c3aed';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#8b5cf6';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>단축 이동</span>
        {quickNavItems.length > 0 && (
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {quickNavItems.length}
          </span>
        )}
      </button>

      {/* 단축 이동 패널 - 작은 네모 버튼들 */}
      {showQuickNavPanel && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000
            }}
            onClick={() => setShowQuickNavPanel(false)}
          />

          {/* 패널 */}
          <div
            style={{
              position: 'fixed',
              top: '70px',
              right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px',
              zIndex: 1001,
              display: 'flex',
              gap: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {quickNavItems.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                padding: '16px 20px',
                color: '#9ca3af',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}>
                등록된 단축 이동이 없습니다
              </div>
            ) : (
              <>
                {/* 메모 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'memo').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quickNavItems
                      .filter(item => item.targetType === 'memo')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              executeQuickNav(item);
                              setShowQuickNavPanel(false);
                            }}
                            style={{
                              position: 'relative',
                              backgroundColor: 'white',
                              color: '#8b5cf6',
                              border: '2px solid #8b5cf6',
                              borderRadius: '8px',
                              padding: '8px 32px 8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                              transition: 'all 0.2s ease',
                              width: '140px',
                              textAlign: 'left',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                            }}
                            title={item.name}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%'
                            }}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span style={{ fontSize: '10px', opacity: 0.6 }}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  deleteQuickNavItem(item.id);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: 'none',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* 카테고리 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'category').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quickNavItems
                      .filter(item => item.targetType === 'category')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              executeQuickNav(item);
                              setShowQuickNavPanel(false);
                            }}
                            style={{
                              position: 'relative',
                              backgroundColor: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 32px 8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                              transition: 'all 0.2s ease',
                              width: '140px',
                              textAlign: 'left',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#7c3aed';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#8b5cf6';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                            }}
                            title={item.name}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%'
                            }}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  deleteQuickNavItem(item.id);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: 'none',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

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
          isFullscreen={isRightPanelFullscreen}
          onToggleFullscreen={toggleRightPanelFullscreen}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
          onResetFilters={resetFiltersToDefault}
        />
      )}

      {/* 튜토리얼 오버레이 */}
      {tutorialState.isActive && (
        <Tutorial
          steps={tutorialSteps}
          currentStep={tutorialState.currentStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
          onComplete={handleTutorialComplete}
          canProceed={canProceedTutorial()}
        />
      )}
    </div>
  );
};

export default App;