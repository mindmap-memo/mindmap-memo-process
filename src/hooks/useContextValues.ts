import { useMemo } from 'react';
import { Page, MemoBlock, CategoryBlock, QuickNavItem, ImportanceLevel } from '../types';

/**
 * useContextValues
 *
 * React Context에 제공할 값들을 useMemo로 최적화하여 생성하는 커스텀 훅입니다.
 *
 * **생성하는 Context:**
 * - AppStateContext: 페이지, 캔버스, 전역 상태
 * - SelectionContext: 선택 상태 및 선택된 항목들
 * - PanelContext: 패널 관련 상태
 * - ConnectionContext: 연결 관련 상태
 * - QuickNavContext: 단축 이동 관련 상태
 *
 * @param props - 모든 필요한 상태와 상태 변경 함수들
 */

interface UseContextValuesProps {
  // AppState
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>;
  currentPage: Page | undefined;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasScale: number;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;
  dataRegistry: Record<string, any>;
  setDataRegistry: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isShiftPressed: boolean;
  setIsShiftPressed: React.Dispatch<React.SetStateAction<boolean>>;

  // Selection
  selectedMemoId: string | null;
  setSelectedMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMemoIds: string[];
  setSelectedMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategory: CategoryBlock | undefined;
  selectedCategories: CategoryBlock[];
  isDragSelecting: boolean;
  setIsDragSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  dragSelectStart: { x: number; y: number } | null;
  setDragSelectStart: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  dragSelectEnd: { x: number; y: number } | null;
  setDragSelectEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  dragHoveredMemoIds: string[];
  setDragHoveredMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  dragHoveredCategoryIds: string[];
  setDragHoveredCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isDragSelectingWithShift: boolean;
  setIsDragSelectingWithShift: React.Dispatch<React.SetStateAction<boolean>>;
  activeImportanceFilters: Set<ImportanceLevel>;
  setActiveImportanceFilters: React.Dispatch<React.SetStateAction<Set<ImportanceLevel>>>;
  showGeneralContent: boolean;
  setShowGeneralContent: React.Dispatch<React.SetStateAction<boolean>>;
  isDraggingMemo: boolean;
  setIsDraggingMemo: React.Dispatch<React.SetStateAction<boolean>>;
  draggingMemoId: string | null;
  setDraggingMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  isDraggingCategory: boolean;
  setIsDraggingCategory: React.Dispatch<React.SetStateAction<boolean>>;

  // Panel
  leftPanelOpen: boolean;
  setLeftPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  leftPanelWidth: number;
  setLeftPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  rightPanelWidth: number;
  setRightPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  isRightPanelFullscreen: boolean;
  setIsRightPanelFullscreen: React.Dispatch<React.SetStateAction<boolean>>;

  // Connection
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  isDisconnectMode: boolean;
  setIsDisconnectMode: React.Dispatch<React.SetStateAction<boolean>>;
  connectingFromId: string | null;
  setConnectingFromId: React.Dispatch<React.SetStateAction<string | null>>;
  connectingFromDirection: 'top' | 'right' | 'bottom' | 'left' | null;
  setConnectingFromDirection: React.Dispatch<React.SetStateAction<'top' | 'right' | 'bottom' | 'left' | null>>;
  dragLineEnd: { x: number; y: number } | null;
  setDragLineEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;

  // QuickNav
  quickNavItems: QuickNavItem[];
  setQuickNavItems: React.Dispatch<React.SetStateAction<QuickNavItem[]>>;
  showQuickNavPanel: boolean;
  setShowQuickNavPanel: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useContextValues = (props: UseContextValuesProps) => {
  // ===== AppState Context =====
  const appStateContextValue = useMemo(() => ({
    pages: props.pages,
    setPages: props.setPages,
    currentPageId: props.currentPageId,
    setCurrentPageId: props.setCurrentPageId,
    currentPage: props.currentPage,
    canvasOffset: props.canvasOffset,
    setCanvasOffset: props.setCanvasOffset,
    canvasScale: props.canvasScale,
    setCanvasScale: props.setCanvasScale,
    dataRegistry: props.dataRegistry,
    setDataRegistry: props.setDataRegistry,
    isShiftPressed: props.isShiftPressed,
    setIsShiftPressed: props.setIsShiftPressed
  }), [
    props.pages, props.setPages, props.currentPageId, props.setCurrentPageId,
    props.currentPage, props.canvasOffset, props.setCanvasOffset,
    props.canvasScale, props.setCanvasScale, props.dataRegistry, props.setDataRegistry,
    props.isShiftPressed, props.setIsShiftPressed
  ]);

  // ===== Selection Context =====
  const selectionContextValue = useMemo(() => ({
    selectedMemoId: props.selectedMemoId,
    setSelectedMemoId: props.setSelectedMemoId,
    selectedMemoIds: props.selectedMemoIds,
    setSelectedMemoIds: props.setSelectedMemoIds,
    selectedMemo: props.selectedMemo,
    selectedMemos: props.selectedMemos,
    selectedCategoryId: props.selectedCategoryId,
    setSelectedCategoryId: props.setSelectedCategoryId,
    selectedCategoryIds: props.selectedCategoryIds,
    setSelectedCategoryIds: props.setSelectedCategoryIds,
    selectedCategory: props.selectedCategory,
    selectedCategories: props.selectedCategories,
    isDragSelecting: props.isDragSelecting,
    setIsDragSelecting: props.setIsDragSelecting,
    dragSelectStart: props.dragSelectStart,
    setDragSelectStart: props.setDragSelectStart,
    dragSelectEnd: props.dragSelectEnd,
    setDragSelectEnd: props.setDragSelectEnd,
    dragHoveredMemoIds: props.dragHoveredMemoIds,
    setDragHoveredMemoIds: props.setDragHoveredMemoIds,
    dragHoveredCategoryIds: props.dragHoveredCategoryIds,
    setDragHoveredCategoryIds: props.setDragHoveredCategoryIds,
    isDragSelectingWithShift: props.isDragSelectingWithShift,
    setIsDragSelectingWithShift: props.setIsDragSelectingWithShift,
    activeImportanceFilters: props.activeImportanceFilters,
    setActiveImportanceFilters: props.setActiveImportanceFilters,
    showGeneralContent: props.showGeneralContent,
    setShowGeneralContent: props.setShowGeneralContent,
    isDraggingMemo: props.isDraggingMemo,
    setIsDraggingMemo: props.setIsDraggingMemo,
    draggingMemoId: props.draggingMemoId,
    setDraggingMemoId: props.setDraggingMemoId,
    isDraggingCategory: props.isDraggingCategory,
    setIsDraggingCategory: props.setIsDraggingCategory
  }), [
    props.selectedMemoId, props.setSelectedMemoId, props.selectedMemoIds, props.setSelectedMemoIds,
    props.selectedMemo, props.selectedMemos, props.selectedCategoryId, props.setSelectedCategoryId,
    props.selectedCategoryIds, props.setSelectedCategoryIds, props.selectedCategory, props.selectedCategories,
    props.isDragSelecting, props.setIsDragSelecting, props.dragSelectStart, props.setDragSelectStart,
    props.dragSelectEnd, props.setDragSelectEnd, props.dragHoveredMemoIds, props.setDragHoveredMemoIds,
    props.dragHoveredCategoryIds, props.setDragHoveredCategoryIds, props.isDragSelectingWithShift,
    props.setIsDragSelectingWithShift, props.activeImportanceFilters, props.setActiveImportanceFilters,
    props.showGeneralContent, props.setShowGeneralContent, props.isDraggingMemo, props.setIsDraggingMemo,
    props.draggingMemoId, props.setDraggingMemoId, props.isDraggingCategory, props.setIsDraggingCategory
  ]);

  // ===== Panel Context =====
  const panelContextValue = useMemo(() => ({
    leftPanelOpen: props.leftPanelOpen,
    setLeftPanelOpen: props.setLeftPanelOpen,
    rightPanelOpen: props.rightPanelOpen,
    setRightPanelOpen: props.setRightPanelOpen,
    leftPanelWidth: props.leftPanelWidth,
    setLeftPanelWidth: props.setLeftPanelWidth,
    rightPanelWidth: props.rightPanelWidth,
    setRightPanelWidth: props.setRightPanelWidth,
    isRightPanelFullscreen: props.isRightPanelFullscreen,
    setIsRightPanelFullscreen: props.setIsRightPanelFullscreen
  }), [
    props.leftPanelOpen, props.setLeftPanelOpen, props.rightPanelOpen, props.setRightPanelOpen,
    props.leftPanelWidth, props.setLeftPanelWidth, props.rightPanelWidth, props.setRightPanelWidth,
    props.isRightPanelFullscreen, props.setIsRightPanelFullscreen
  ]);

  // ===== Connection Context =====
  const connectionContextValue = useMemo(() => ({
    isConnecting: props.isConnecting,
    setIsConnecting: props.setIsConnecting,
    isDisconnectMode: props.isDisconnectMode,
    setIsDisconnectMode: props.setIsDisconnectMode,
    connectingFromId: props.connectingFromId,
    setConnectingFromId: props.setConnectingFromId,
    connectingFromDirection: props.connectingFromDirection,
    setConnectingFromDirection: props.setConnectingFromDirection,
    dragLineEnd: props.dragLineEnd,
    setDragLineEnd: props.setDragLineEnd
  }), [
    props.isConnecting, props.setIsConnecting, props.isDisconnectMode, props.setIsDisconnectMode,
    props.connectingFromId, props.setConnectingFromId, props.connectingFromDirection,
    props.setConnectingFromDirection, props.dragLineEnd, props.setDragLineEnd
  ]);

  // ===== QuickNav Context =====
  const quickNavContextValue = useMemo(() => ({
    quickNavItems: props.quickNavItems,
    setQuickNavItems: props.setQuickNavItems,
    showQuickNavPanel: props.showQuickNavPanel,
    setShowQuickNavPanel: props.setShowQuickNavPanel
  }), [
    props.quickNavItems, props.setQuickNavItems, props.showQuickNavPanel, props.setShowQuickNavPanel
  ]);

  return {
    appStateContextValue,
    selectionContextValue,
    panelContextValue,
    connectionContextValue,
    quickNavContextValue
  };
};
