import React from 'react';
import { Page, CategoryBlock, MemoBlock as MemoBlockType, MemoDisplaySize } from '../../types';
import { useConnectionPoints } from './hooks/useConnectionPoints';
import { useCategoryAreaColors } from './hooks/useCategoryAreaColors';
import { useCategoryAreaCalculation } from './hooks/useCategoryAreaCalculation';
import { useConnectionLineRendering } from './hooks/useConnectionLineRendering';
import { useCategoryAreaRendering } from './hooks/useCategoryAreaRendering';

/**
 * useCanvasRendering
 *
 * Canvas 컴포넌트의 렌더링 로직을 조합하는 메인 훅
 *
 * **주요 기능:**
 * - 연결선 렌더링 훅 조합
 * - 카테고리 영역 렌더링 훅 조합
 * - 연결점 계산 훅 조합
 *
 * @param params - 렌더링에 필요한 모든 매개변수
 * @returns 렌더링 함수들을 담은 객체
 */

interface UseCanvasRenderingParams {
  // Page 데이터
  currentPage: Page | undefined;

  // 연결 관련 상태
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  connectingFromDirection: 'top' | 'bottom' | 'left' | 'right' | null;
  dragLineEnd: { x: number; y: number } | null;

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

  // 영역 업데이트 트리거
  areaUpdateTrigger: number;

  // 캔버스 스케일
  canvasScale: number;

  // 최근 드래그한 카테고리 Ref
  recentlyDraggedCategoryRef: React.MutableRefObject<string | null>;

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
  onRemoveConnection: (fromId: string, toId: string) => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onStartConnection?: (id: string, direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryToggleExpanded: (categoryId: string) => void;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onShiftDropCategory?: (category: CategoryBlock, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
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

  // 롱프레스 상태
  isLongPressActive?: boolean;  // 롱프레스 활성화 상태
  longPressTargetId?: string | null;  // 롱프레스 대상 ID
  setIsLongPressActive?: (active: boolean, targetId?: string | null) => void;
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref 추가
}

export const useCanvasRendering = (params: UseCanvasRenderingParams) => {
  const {
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
    isLongPressActive,  // 롱프레스 활성화 상태
    longPressTargetId,  // 롱프레스 대상 ID
    setIsLongPressActive,
    setIsShiftPressed,  // Shift 상태 업데이트 함수
    isShiftPressedRef  // Shift ref 추가
  } = params;

  // 🔍 디버깅: useCanvasRendering 훅 실행 추적
  console.log('[useCanvasRendering] 훅 실행됨:', {
    isLongPressActive,
    longPressTargetId
  });

  // 연결점 계산 훅 사용
  const { getBlockConnectionPoints, getConnectionPoints } = useConnectionPoints({
    renderedCategoryAreas
  });

  // 카테고리 영역 색상 훅 사용
  const { getCategoryAreaColor, calculateCategoryAreaWithColor, isDescendantOf } = useCategoryAreaColors({
    currentPage,
    areaUpdateTrigger,
    recentlyDraggedCategoryRef
  });

  // 카테고리 영역 계산 훅 사용
  const { calculateArea } = useCategoryAreaCalculation({
    draggedCategoryAreas,
    isShiftPressed,
    shiftDragAreaCache,
    shiftDragInfo,
    isDescendantOf,
    isDraggingMemo,
    isDraggingCategory,
    draggingCategoryId,
    calculateCategoryAreaWithColor
  });

  // 연결선 렌더링 훅 사용
  const { renderConnectionLines } = useConnectionLineRendering({
    currentPage,
    isConnecting,
    isDisconnectMode,
    connectingFromId,
    connectingFromDirection,
    dragLineEnd,
    onRemoveConnection,
    onConnectMemos,
    getConnectionPoints
  });

  // 카테고리 영역 렌더링 훅 사용
  const { renderSingleCategoryArea, renderCategoryAreas, renderCategoryWithChildren } = useCategoryAreaRendering({
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
    onOpenEditor,
    onCategoryUpdate,
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
    calculateArea,
    isLongPressActive,  // 롱프레스 활성화 상태
    longPressTargetId,  // 롱프레스 대상 ID
    setIsLongPressActive,
    setIsShiftPressed,  // Shift 상태 업데이트 함수
    isShiftPressedRef  // Shift ref 추가
  });

  return {
    getBlockConnectionPoints,
    getConnectionPoints,
    getCategoryAreaColor,
    calculateCategoryAreaWithColor,
    renderConnectionLines,
    renderSingleCategoryArea,
    renderCategoryAreas,
    renderCategoryWithChildren
  };
};
