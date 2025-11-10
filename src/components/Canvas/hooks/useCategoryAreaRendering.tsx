import React from 'react';
import { Page, CategoryBlock, MemoBlock as MemoBlockType, MemoDisplaySize } from '../../../types';
import MemoBlock from '../../MemoBlock';
import { createCategoryAreaDragHandler } from '../utils/categoryAreaDragHandlers';
import { useCategoryAreaColors } from './useCategoryAreaColors';
import { useCategoryLabelDrag } from './useCategoryLabelDrag';
import { detectDoubleTap } from '../../../utils/doubleTapUtils';
import { Edit2, Star, Trash2 } from 'lucide-react';

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
  onUpdateDragLine?: (mousePos: { x: number; y: number }) => void;
  onCancelConnection?: () => void;
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
  onDeleteQuickNav?: (targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onDeleteCategory: (categoryId: string) => void;
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

  // 롱프레스 상태
  isLongPressActive?: boolean;  // 롱프레스 활성화 상태
  longPressTargetId?: string | null;  // 롱프레스 대상 ID
  setIsLongPressActive?: (active: boolean, targetId?: string | null) => void;
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref 추가
}

export const useCategoryAreaRendering = (params: UseCategoryAreaRenderingParams) => {
  // 롱프레스 활성화 상태 추적
  const [longPressActiveCategoryId, setLongPressActiveCategoryId] = React.useState<string | null>(null);

  // 연결점 드래그 상태 추적
  const [isConnectionDragging, setIsConnectionDragging] = React.useState<string | null>(null);

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
    onUpdateDragLine,
    onCancelConnection,
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
    onOpenEditor,
    isLongPressActive,  // 롱프레스 활성화 상태
    longPressTargetId,  // 롱프레스 대상 ID
    setIsLongPressActive,
    setIsShiftPressed,  // Shift 상태 업데이트 함수
    isShiftPressedRef,  // Shift ref 추가
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

  // Refs for stable callbacks
  const isConnectingRef = React.useRef(isConnecting);
  const connectingFromIdRef = React.useRef(connectingFromId);
  const onConnectMemosRef = React.useRef(onConnectMemos);
  const onCancelConnectionRef = React.useRef(onCancelConnection);
  const canvasOffsetRef = React.useRef(canvasOffset);
  const canvasScaleRef = React.useRef(canvasScale);

  React.useEffect(() => {
    isConnectingRef.current = isConnecting;
    connectingFromIdRef.current = connectingFromId;
    onConnectMemosRef.current = onConnectMemos;
    onCancelConnectionRef.current = onCancelConnection;
    canvasOffsetRef.current = canvasOffset;
    canvasScaleRef.current = canvasScale;
  }, [isConnecting, connectingFromId, onConnectMemos, onCancelConnection, canvasOffset, canvasScale]);

  // 연결점 드래그 중일 때 document-level 이벤트 리스너 등록
  React.useEffect(() => {
    console.log('🔷 [카테고리 연결점 useEffect] 실행', {
      isConnectionDragging,
      hasOnUpdateDragLine: !!onUpdateDragLine
    });

    if (isConnectionDragging && onUpdateDragLine) {
      console.log('🔷 [카테고리 연결점] 이벤트 리스너 등록 시작', { categoryId: isConnectionDragging });
      const handleMouseMove = (e: MouseEvent) => {
        const canvasElement = document.querySelector('[data-canvas-container]') as HTMLElement;
        if (canvasElement) {
          const rect = canvasElement.getBoundingClientRect();
          const offset = canvasOffsetRef.current || { x: 0, y: 0 };
          const scale = canvasScaleRef.current;
          const mouseX = (e.clientX - rect.left - offset.x) / scale;
          const mouseY = (e.clientY - rect.top - offset.y) / scale;
          onUpdateDragLine({ x: mouseX, y: mouseY });
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!e.touches || e.touches.length === 0) return;

        const canvasElement = document.querySelector('[data-canvas-container]') as HTMLElement;
        if (canvasElement) {
          const rect = canvasElement.getBoundingClientRect();
          const offset = canvasOffsetRef.current || { x: 0, y: 0 };
          const scale = canvasScaleRef.current;
          const mouseX = (e.touches[0].clientX - rect.left - offset.x) / scale;
          const mouseY = (e.touches[0].clientY - rect.top - offset.y) / scale;
          onUpdateDragLine({ x: mouseX, y: mouseY });
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const categoryElement = element?.closest('[data-category-id]');
        const memoElement = element?.closest('[data-memo-id]');

        const currentIsConnecting = isConnectingRef.current;
        const currentConnectingFromId = connectingFromIdRef.current;
        const currentOnConnectMemos = onConnectMemosRef.current;
        const currentOnCancelConnection = onCancelConnectionRef.current;

        if ((categoryElement || memoElement) && currentIsConnecting && currentConnectingFromId) {
          const targetId = categoryElement?.getAttribute('data-category-id') || memoElement?.getAttribute('data-memo-id');

          if (targetId && targetId !== currentConnectingFromId) {
            currentOnConnectMemos?.(currentConnectingFromId, targetId);
          } else {
            currentOnCancelConnection?.();
          }
        } else {
          currentOnCancelConnection?.();
        }
        setIsConnectionDragging(null);
      };

      const handleTouchEnd = (e: TouchEvent) => {
        console.log('🟣 [카테고리 Document-level handleTouchEnd 시작]', {
          changedTouchesLength: e.changedTouches.length
        });

        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          const categoryElement = element?.closest('[data-category-id]');
          const memoElement = element?.closest('[data-memo-id]');

          console.log('🟣 [카테고리 터치엔드 대상 확인]', {
            elementTag: element?.tagName,
            hasCategoryElement: !!categoryElement,
            hasMemoElement: !!memoElement,
            categoryId: categoryElement?.getAttribute('data-category-id'),
            memoId: memoElement?.getAttribute('data-memo-id')
          });

          const currentIsConnecting = isConnectingRef.current;
          const currentConnectingFromId = connectingFromIdRef.current;
          const currentOnConnectMemos = onConnectMemosRef.current;
          const currentOnCancelConnection = onCancelConnectionRef.current;

          console.log('🟣 [카테고리 Ref 값 확인]', {
            currentIsConnecting,
            currentConnectingFromId,
            hasOnConnectMemos: !!currentOnConnectMemos,
            hasOnCancelConnection: !!currentOnCancelConnection
          });

          if ((categoryElement || memoElement) && currentIsConnecting && currentConnectingFromId) {
            const targetId = categoryElement?.getAttribute('data-category-id') || memoElement?.getAttribute('data-memo-id');

            console.log('🟣 [카테고리 대상 요소 발견]', { targetId, fromId: currentConnectingFromId });

            if (targetId && targetId !== currentConnectingFromId) {
              console.log('✅ [카테고리 연결 생성]', { fromId: currentConnectingFromId, toId: targetId });
              currentOnConnectMemos?.(currentConnectingFromId, targetId);
            } else {
              console.log('❌ [카테고리 연결 취소] 같은 요소이거나 유효하지 않음');
              currentOnCancelConnection?.();
            }
          } else {
            console.log('❌ [카테고리 연결 취소] 대상 요소 없음 또는 연결 상태 아님', {
              hasElement: !!(categoryElement || memoElement),
              isConnecting: currentIsConnecting,
              connectingFromId: currentConnectingFromId
            });
            currentOnCancelConnection?.();
          }
        }
        setIsConnectionDragging(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isConnectionDragging, onUpdateDragLine]);

  // 카테고리 영역 색상 훅 사용
  const { calculateCategoryAreaWithColor } = useCategoryAreaColors({
    currentPage,
    areaUpdateTrigger,
    recentlyDraggedCategoryRef
  });

  // 카테고리 라벨 드래그 훅 사용
  const { createMouseDragHandler, createTouchDragHandler } = useCategoryLabelDrag({
    canvasScale,
    canvasOffset,
    onCategorySelect,
    onCategoryLabelPositionChange,
    onDetectCategoryDropForCategory,
    onLongPressActivate: (categoryId) => setLongPressActiveCategoryId(categoryId),
    onLongPressDeactivate: () => setLongPressActiveCategoryId(null),
    setIsShiftPressed,
    isShiftPressedRef
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

      // Shift+드래그 중인지 확인
      // - 영역 드래그: isCurrentCategoryDragging && isShiftPressed
      // - 블록 드래그: isCurrentCategoryBlockDragging && isShiftPressed
      // - 롱프레스: 이 카테고리가 롱프레스 대상인지 확인 (드래그 없이도 UI 변경)
      const isThisCategoryLongPressed = isLongPressActive && longPressTargetId === category.id;

      // 타겟 영역 확인 (추가 UI)
      // 조건: 드래그 중 + 마우스가 올라간 영역이면서, 현재 부모가 아님
      // ⚠️ 롱프레스는 여기 포함하지 않음 (롱프레스는 자기 자신이므로 "추가" UI를 보여주면 안 됨)
      const isShiftDragTarget = isShiftPressed && dragTargetCategoryId === category.id && (isDraggingMemo || isDraggingCategory || isDraggingCategoryArea) && !isCurrentParent;

      // 롱프레스 또는 Shift 드래그 타겟 (초록색 테두리용)
      // - 롱프레스: 자기 자신 (드래그 없이도 초록색 표시)
      // - Shift 드래그 타겟: 다른 요소를 드래그해서 이 영역 위로 가져온 경우
      const isShiftModeActive = isShiftDragTarget || isThisCategoryLongPressed;

      // 드래그 선택 중 하이라이트
      const isDragHovered = dragHoveredCategoryIds?.includes(category.id) || false;

      // 드래그 중인 카테고리는 transform을 사용하여 GPU 가속 활용
      // 일반 드래그 또는 Shift+드래그 시 GPU 가속 적용
      const isDragging = draggedCategoryAreas[category.id] !== undefined;
      // 현재 카테고리가 드래그 중인지 확인
      const isCurrentCategoryDragging = isDraggingCategoryArea === category.id;
      // 현재 카테고리가 블록으로 드래그 중인지 확인 (CategoryBlock 컴포넌트)
      const isCurrentCategoryBlockDragging = isDraggingCategory && draggingCategoryId === category.id;

      const isShiftDragging = isThisCategoryLongPressed ||
                             (isCurrentCategoryDragging && (isShiftPressed || isThisCategoryLongPressed)) ||
                             (isCurrentCategoryBlockDragging && (isShiftPressed || isThisCategoryLongPressed));
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

      const calculatedBgColor = isParentBeingLeftBehind
        ? 'rgba(239, 68, 68, 0.2)'
        : (isShiftModeActive ? 'rgba(16, 185, 129, 0.2)' : (isDragHovered ? 'rgba(59, 130, 246, 0.3)' : area.color));

      areas.push(
        <div
          key={`area-${category.id}-${isShiftModeActive ? 'shift' : 'normal'}`}
          data-category-area="true"
          data-category-id={category.id}
          draggable={false}
          style={{
            position: 'absolute',
            left: `${basePosition.left}px`,
            top: `${basePosition.top}px`,
            width: `${area.width}px`,
            height: `${area.height}px`,
            backgroundColor: calculatedBgColor,
            border: longPressActiveCategoryId === category.id
              ? '3px solid rgba(16, 185, 129, 0.8)'
              : (isParentBeingLeftBehind
                ? '3px solid rgba(239, 68, 68, 0.6)'
                : (isShiftModeActive ? '3px solid rgba(16, 185, 129, 0.6)' : (isDragHovered ? '3px solid rgba(59, 130, 246, 0.6)' : '2px dashed rgba(139, 92, 246, 0.3)'))),
            borderRadius: '12px',
            pointerEvents: 'auto',
            cursor: 'move',
            zIndex: -1,
            transform: isDragging
              ? `translate(${deltaTransform.x}px, ${deltaTransform.y}px) ${(isShiftModeActive || isParentBeingLeftBehind || isDragHovered) ? 'scale(1.02)' : 'scale(1)'}`
              : (isShiftModeActive || isParentBeingLeftBehind || isDragHovered) ? 'scale(1.02)' : 'scale(1)',
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
          onTouchStart={(e) => {
            if (isConnecting || e.touches.length !== 1) return;

            e.stopPropagation();

            const touch = e.touches[0];
            const startX = touch.clientX;
            const startY = touch.clientY;
            const originalPosition = { x: category.position.x, y: category.position.y };
            let hasMoved = false;
            let isDragging = false;
            let longPressTimer: NodeJS.Timeout | null = null;
            let isLongPressActive = false;

            // 롱프레스 타이머 시작 (0.5초)
            longPressTimer = setTimeout(() => {
              isLongPressActive = true;
              // 롱프레스 감지 시 즉시 UI 업데이트
              setLongPressActiveCategoryId(category.id);
              console.log('[CategoryArea] 롱프레스 감지! Shift+드래그 모드 활성화', category.id);

              // Shift 상태도 함께 업데이트 (충돌 판정 예외 처리를 위해 필수!)
              // ⚠️ 중요: ref를 직접 업데이트하여 즉시 반영 (state는 비동기)
              if (isShiftPressedRef) {
                isShiftPressedRef.current = true;
                console.log('[CategoryArea] isShiftPressedRef.current = true 직접 설정');
              }
              setIsShiftPressed?.(true);
              console.log('[CategoryArea] setIsShiftPressed(true) 호출 완료');
            }, 500);

            const handleTouchMove = (moveEvent: TouchEvent) => {
              if (moveEvent.touches.length !== 1) return;

              const touch = moveEvent.touches[0];
              const distance = Math.sqrt(
                Math.pow(touch.clientX - startX, 2) +
                Math.pow(touch.clientY - startY, 2)
              );

              // 타이머 취소 (이동이 시작되면 롱프레스 취소)
              if (longPressTimer && distance >= 5) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }

              // 롱프레스가 활성화되었거나 임계값을 넘으면 드래그 시작
              if (!isDragging && (isLongPressActive || distance >= 5)) {
                isDragging = true;
                onCategorySelect(category.id);
                setIsDraggingCategoryArea(category.id);

                // Shift 모드일 때만 캐시 설정 (롱프레스 또는 Shift 키)
                const effectiveShiftMode = isShiftPressed || isLongPressActive;
                if (effectiveShiftMode) {
                  if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
                    currentPage.categories?.forEach(cat => {
                      if (cat.isExpanded) {
                        const catArea = calculateCategoryAreaWithColor(cat, new Set(), category.id);
                        if (catArea) {
                          shiftDragAreaCache.current[cat.id] = catArea;
                        }
                      }
                    });
                  }
                } else {
                  if (!draggedCategoryAreas[category.id]) {
                    const currentArea = area || calculateCategoryAreaWithColor(category);
                    if (currentArea) {
                      setDraggedCategoryAreas(prev => ({
                        ...prev,
                        [category.id]: {
                          area: currentArea,
                          originalPosition: { x: category.position.x, y: category.position.y }
                        }
                      }));
                    }
                  }
                }
              }

              if (isDragging) {
                if (!hasMoved) {
                  hasMoved = true;
                }

                const deltaX = (touch.clientX - startX) / canvasScale;
                const deltaY = (touch.clientY - startY) / canvasScale;

                const newPosition = {
                  x: originalPosition.x + deltaX,
                  y: originalPosition.y + deltaY
                };

                onCategoryPositionChange(category.id, newPosition);

                // Shift 모드 또는 롱프레스 상태 확인
                const effectiveShiftMode = isShiftPressed || isLongPressActive;
                if (effectiveShiftMode) {
                  setShiftDragInfo({
                    categoryId: category.id,
                    offset: { x: deltaX, y: deltaY }
                  });
                }

                moveEvent.preventDefault();
              }
            };

            const handleTouchEnd = (upEvent: TouchEvent) => {
              // 타이머 취소
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }

              // 롱프레스가 활성화되어 있었는지 확인
              const wasLongPressActive = isLongPressActive;

              // 실제 Shift 키 또는 롱프레스로 인한 가상 Shift 모드
              const effectiveShiftMode = isShiftPressed || wasLongPressActive;

              // 롱프레스 상태 초기화
              setLongPressActiveCategoryId(null);

              // 롱프레스가 활성화되어 있었다면 Shift도 리셋
              if (wasLongPressActive) {
                console.log('[CategoryArea] 롱프레스 종료 - Shift 리셋');
                // ref도 직접 리셋
                if (isShiftPressedRef) {
                  isShiftPressedRef.current = false;
                  console.log('[CategoryArea] isShiftPressedRef.current = false 직접 설정');
                }
                setIsShiftPressed?.(false);
              }

              if (isDragging && upEvent.changedTouches && upEvent.changedTouches.length > 0) {
                const touch = upEvent.changedTouches[0];
                const deltaX = (touch.clientX - startX) / canvasScale;
                const deltaY = (touch.clientY - startY) / canvasScale;

                const finalPosition = {
                  x: originalPosition.x + deltaX,
                  y: originalPosition.y + deltaY
                };

                const canvasElement = document.getElementById('main-canvas');
                if (canvasElement && canvasOffset) {
                  const rect = canvasElement.getBoundingClientRect();
                  const mouseX = (touch.clientX - rect.left - canvasOffset.x) / canvasScale;
                  const mouseY = (touch.clientY - rect.top - canvasOffset.y) / canvasScale;

                  onCategoryPositionDragEnd?.(category.id, finalPosition);

                  // effectiveShiftMode 사용 (롱프레스 또는 Shift 키)
                  if (effectiveShiftMode) {
                    onDetectCategoryDropForCategory?.(category.id, { x: mouseX, y: mouseY }, true);
                  }
                } else {
                  onCategoryPositionDragEnd?.(category.id, finalPosition);

                  // effectiveShiftMode 사용 (롱프레스 또는 Shift 키)
                  if (effectiveShiftMode) {
                    onDetectCategoryDropForCategory?.(category.id, finalPosition, true);
                  }
                }
              } else if (!hasMoved) {
                onCategorySelect(category.id);
              }

              // 상태 초기화
              setIsDraggingCategoryArea(null);
              setShiftDragInfo(null);

              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
              document.removeEventListener('touchcancel', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd);
          }}
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

            // 모바일(터치) 환경에서는 컨텍스트 메뉴 비활성화
            // @ts-ignore - nativeEvent의 sourceCapabilities 체크
            if (e.nativeEvent && e.nativeEvent.sourceCapabilities && e.nativeEvent.sourceCapabilities.firesTouchEvents) {
              return;
            }

            onCategorySelect(category.id);
            setAreaContextMenu({ x: e.clientX, y: e.clientY, categoryId: category.id });
          }}
          onTouchEnd={(e) => {
            // 카테고리 영역 더블탭 감지
            const isDoubleTap = detectDoubleTap(`area_${category.id}`);

            if (isDoubleTap) {
              e.preventDefault();
              e.stopPropagation();

              // 모바일에서는 에디터 열기
              if (onOpenEditor) {
                onOpenEditor();
              }
            }
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
            data-category-id={category.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              console.log('🟣 [카테고리 연결점 클릭]', { categoryId: category.id, isConnecting, connectingFromId });
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                console.log('🟣 [카테고리 연결 드래그 시작]', { categoryId: category.id });
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'top');
                  console.log('🟣 [카테고리 연결 시작점 설정]', { fromCategoryId: category.id });
                }
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if ((!isMobile || isConnecting) && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
              setIsConnectionDragging(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              console.log('🟣 [카테고리 연결점 터치 시작]', { categoryId: category.id, isConnecting, connectingFromId });
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                console.log('🟣 [카테고리 연결 드래그 시작 (터치)]', { categoryId: category.id });
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'top');
                  console.log('🟣 [카테고리 연결 시작점 설정 (터치)]', { fromCategoryId: category.id });
                }
              }
            }}
            onTouchEnd={(e) => {
              // stopPropagation 제거 - document-level handleTouchEnd가 실행되도록
              console.log('🟣 [카테고리 연결점 터치 종료]', { categoryId: category.id, connectingFromId });
              // 연결점 자체에서는 아무것도 하지 않음 - document-level handleTouchEnd에서 처리
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: 'absolute',
              top: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
          >
            <div style={{
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
              boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Bottom */}
          <div
            data-category-id={category.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'bottom');
                }
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if ((!isMobile || isConnecting) && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
              setIsConnectionDragging(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              console.log('🟣 [카테고리 연결점 터치 시작 (하단)]', { categoryId: category.id, isConnecting, connectingFromId });
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                console.log('🟣 [카테고리 연결 드래그 시작 (터치-하단)]', { categoryId: category.id });
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'bottom');
                  console.log('🟣 [카테고리 연결 시작점 설정 (터치-하단)]', { fromCategoryId: category.id });
                }
              }
            }}
            onTouchEnd={(e) => {
              // stopPropagation 제거 - document-level handleTouchEnd가 실행되도록
              console.log('🟣 [카테고리 연결점 터치 종료 (하단)]', { categoryId: category.id, connectingFromId });
              // 연결점 자체에서는 아무것도 하지 않음 - document-level handleTouchEnd에서 처리
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: 'absolute',
              bottom: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
          >
            <div style={{
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
              boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Left */}
          <div
            data-category-id={category.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'left');
                }
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if ((!isMobile || isConnecting) && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
              setIsConnectionDragging(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              console.log('🟣 [카테고리 연결점 터치 시작 (좌측)]', { categoryId: category.id, isConnecting, connectingFromId });
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                console.log('🟣 [카테고리 연결 드래그 시작 (터치-좌측)]', { categoryId: category.id });
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'left');
                  console.log('🟣 [카테고리 연결 시작점 설정 (터치-좌측)]', { fromCategoryId: category.id });
                }
              }
            }}
            onTouchEnd={(e) => {
              // stopPropagation 제거 - document-level handleTouchEnd가 실행되도록
              console.log('🟣 [카테고리 연결점 터치 종료 (좌측)]', { categoryId: category.id, connectingFromId });
              // 연결점 자체에서는 아무것도 하지 않음 - document-level handleTouchEnd에서 처리
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: 'absolute',
              left: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
          >
            <div style={{
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
              boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
          {/* Right */}
          <div
            data-category-id={category.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'right');
                }
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if ((!isMobile || isConnecting) && connectingFromId && connectingFromId !== category.id) {
                onConnectMemos(connectingFromId, category.id);
              }
              setIsConnectionDragging(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              console.log('🟣 [카테고리 연결점 터치 시작 (우측)]', { categoryId: category.id, isConnecting, connectingFromId });
              const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

              if (!isMobile || isConnecting) {
                console.log('🟣 [카테고리 연결 드래그 시작 (터치-우측)]', { categoryId: category.id });
                setIsConnectionDragging(category.id);
                if (!connectingFromId) {
                  onStartConnection?.(category.id, 'right');
                  console.log('🟣 [카테고리 연결 시작점 설정 (터치-우측)]', { fromCategoryId: category.id });
                }
              }
            }}
            onTouchEnd={(e) => {
              // stopPropagation 제거 - document-level handleTouchEnd가 실행되도록
              console.log('🟣 [카테고리 연결점 터치 종료 (우측)]', { categoryId: category.id, connectingFromId });
              // 연결점 자체에서는 아무것도 하지 않음 - document-level handleTouchEnd에서 처리
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: 'absolute',
              right: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
              zIndex: 15,
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
          >
            <div style={{
              width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
              backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
              borderRadius: '50%',
              border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
              boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>
      );
    }


    // 카테고리 이름 라벨은 항상 표시
    if (true) {
      // 라벨 위치는 영역의 좌상단 위쪽에 고정 (영역과 겹치지 않도록)
      const labelX = area?.x || category.position.x;
      const labelY = (area?.y || category.position.y) - 60; // 라벨 높이만큼 위로 이동하여 영역과 겹치지 않도록

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
            backgroundColor: (longPressActiveCategoryId === category.id || isShiftDragging) ? '#10b981' : '#8b5cf6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: `${14 / (canvasScale || 1)}px`,
            fontWeight: '600',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: isEditing ? 'text' : 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            border: (longPressActiveCategoryId === category.id || isShiftDragging) ? '3px solid #059669' : 'none'
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

            // 모바일(터치) 환경에서는 컨텍스트 메뉴 비활성화
            // @ts-ignore - nativeEvent의 sourceCapabilities 체크
            if (e.nativeEvent && e.nativeEvent.sourceCapabilities && e.nativeEvent.sourceCapabilities.firesTouchEvents) {
              return;
            }

            onCategorySelect(category.id);
            setAreaContextMenu({ x: e.clientX, y: e.clientY, categoryId: category.id });
          }}
          onMouseDown={isEditing ? undefined : createMouseDragHandler(category, isShiftPressed || false)}
          onTouchStart={isEditing ? undefined : createTouchDragHandler(category, isShiftPressed || false)}
          onTouchEnd={(e) => {
            // 라벨 더블탭 감지
            const isDoubleTap = detectDoubleTap(category.id);

            if (isDoubleTap) {
              e.preventDefault();
              e.stopPropagation();

              // 모바일에서는 에디터 열기
              if (onOpenEditor) {
                onOpenEditor();
              } else {
                // 데스크톱에서는 편집 모드
                setEditingCategoryId(category.id);
                setEditingCategoryTitle(category.title);
              }
            }
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
                fontSize: `${14 / (canvasScale || 1)}px`,
                fontWeight: '600',
                padding: '4px 8px',
                outline: 'none',
                width: 'auto',
                minWidth: '200px'
              }}
            />
          ) : (
            <span style={{ color: category.title ? 'white' : 'rgba(255,255,255,0.6)' }}>
              {category.title || '제목을 입력해주세요'}
            </span>
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

      // 선택된 카테고리일 때 액션 버튼 표시
      const isCategorySelected = selectedCategoryId === category.id || selectedCategoryIds.includes(category.id);
      if (isCategorySelected) {
        const buttonScale = 0.5 / (canvasScale || 1);
        areas.push(
          <div
            key={`action-buttons-${category.id}`}
            style={{
              position: 'absolute',
              top: `${labelY - 80}px`,
              left: `${labelX}px`,
              display: 'flex',
              flexDirection: 'row',
              gap: '14px',
              zIndex: 100,
              pointerEvents: 'auto',
              transform: `scale(${buttonScale})`,
              transformOrigin: 'bottom left'
            }}
          >
            <button
              data-action-button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenEditor) {
                  // 모바일: 에디터 열기
                  onOpenEditor();
                } else {
                  // PC: 제목 편집 모드
                  setEditingCategoryId(category.id);
                  setEditingCategoryTitle(category.title);
                }
              }}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                color: '#6b7280',
                minWidth: '60px',
                minHeight: '60px'
              }}
              title="편집"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.color = '#8b5cf6';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Edit2 size={26} />
            </button>
            <button
              data-action-button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                const isBookmarked = isQuickNavExists && isQuickNavExists(category.id, 'category');
                if (isBookmarked) {
                  onDeleteQuickNav?.(category.id, 'category');
                } else {
                  onAddQuickNav?.(category.title || '제목 없는 카테고리', category.id, 'category');
                }
              }}
              style={{
                background: (isQuickNavExists && isQuickNavExists(category.id, 'category')) ? '#fef3c7' : 'white',
                border: (isQuickNavExists && isQuickNavExists(category.id, 'category')) ? '2px solid #fbbf24' : '2px solid #e5e7eb',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                color: (isQuickNavExists && isQuickNavExists(category.id, 'category')) ? '#f59e0b' : '#6b7280',
                minWidth: '60px',
                minHeight: '60px'
              }}
              title={isQuickNavExists && isQuickNavExists(category.id, 'category') ? '즐겨찾기 해제' : '즐겨찾기'}
              onMouseEnter={(e) => {
                const isBookmarked = isQuickNavExists && isQuickNavExists(category.id, 'category');
                if (isBookmarked) {
                  e.currentTarget.style.backgroundColor = '#fde68a';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.3)';
                } else {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.color = '#8b5cf6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                const isBookmarked = isQuickNavExists && isQuickNavExists(category.id, 'category');
                if (isBookmarked) {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                } else {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <Star size={26} fill={(isQuickNavExists && isQuickNavExists(category.id, 'category')) ? 'currentColor' : 'none'} />
            </button>
            <button
              data-action-button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`"${category.title || '제목 없는 카테고리'}"를 삭제하시겠습니까?`)) {
                  onDeleteCategory(category.id);
                }
              }}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                color: '#6b7280',
                minWidth: '60px',
                minHeight: '60px'
              }}
              title="삭제"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Trash2 size={26} />
            </button>
          </div>
        );
      }

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
    isDraggingCategory,
    isLongPressActive,  // 롱프레스 상태 추가
    longPressTargetId,  // 롱프레스 대상 ID 추가
    longPressActiveCategoryId  // 카테고리 롱프레스 상태 추가
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
            onDeleteQuickNav={onDeleteQuickNav}
            isQuickNavExists={isQuickNavExists}
            onOpenEditor={onOpenEditor}
            setIsLongPressActive={setIsLongPressActive}
            setIsShiftPressed={setIsShiftPressed}
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
