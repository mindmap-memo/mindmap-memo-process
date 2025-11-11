import { useEffect } from 'react';
import { Page, CategoryBlock, ImportanceLevel } from '../../types';
import { calculateCategoryArea } from '../../utils/categoryAreaUtils';
import { useCacheManagement } from './hooks/useCacheManagement';
import { useContextMenuEffect } from './hooks/useContextMenuEffect';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { POSITION_UPDATE_THROTTLE } from '../../utils/constants';

interface UseCanvasEffectsProps {
  // Context menu
  areaContextMenu: { x: number; y: number; categoryId: string } | null;
  setAreaContextMenu: (menu: { x: number; y: number; categoryId: string } | null) => void;

  // Canvas state
  currentTool: 'select' | 'pan' | 'zoom';
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;

  // Dragging state
  isDraggingMemo?: boolean;
  isDraggingCategory?: boolean;
  draggingMemoId?: string | null;
  draggingCategoryId?: string | null;
  isDraggingCategoryArea: string | null;
  isShiftPressed?: boolean;

  // Shift drag cache
  shiftDragAreaCache: React.MutableRefObject<{ [categoryId: string]: any }>;

  // Page data
  currentPage: Page | undefined;

  // Category cache management
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>>;
  onClearCategoryCache?: (categoryId: string) => void;
  setAreaUpdateTrigger: React.Dispatch<React.SetStateAction<number>>;

  // Panning
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;
  panStart: { x: number; y: number; offsetX: number; offsetY: number };

  // Global drag selection
  globalDragSelecting: boolean;
  setGlobalDragSelecting: (selecting: boolean) => void;
  globalDragStart: { x: number; y: number };
  globalDragWithShift: boolean;
  setGlobalDragWithShift: (withShift: boolean) => void;
  isDragSelecting: boolean;
  dragThresholdMet: boolean;
  setDragThresholdMet: (met: boolean) => void;
  setJustFinishedDragSelection: (finished: boolean) => void;
  onDragSelectStart: (position: { x: number; y: number }, isShiftPressed: boolean) => void;
  onDragSelectMove: (position: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;

  // Keyboard
  isSpacePressed: boolean;
  setIsSpacePressed: (pressed: boolean) => void;
  isAltPressed: boolean;
  setIsAltPressed: (pressed: boolean) => void;
  baseTool: 'select' | 'pan' | 'zoom';
  setCurrentTool: (tool: 'select' | 'pan' | 'zoom') => void;
  isMouseOverCanvas: boolean;
  isConnecting: boolean;
  onCancelConnection: () => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Selection
  selectedMemoId: string | null;
  selectedCategoryId: string | null;
  selectedMemoIds: string[];
  selectedCategoryIds: string[];
  onDeleteSelected: () => void;

  // Drag target detection
  setDragTargetCategoryId: (id: string | null) => void;

  // Mobile fullscreen mode
  fullscreen?: boolean;
}

/**
 * useCanvasEffects
 *
 * Canvas 컴포넌트의 모든 useEffect 로직을 관리하는 훅
 *
 * **관리하는 effect:**
 * 1. Shift 드래그 영역 캐시 정리
 * 2. 컨텍스트 메뉴 외부 클릭 처리
 * 3. 캔버스 휠 이벤트 (줌)
 * 4. 메모 위치 변경 시 영역 업데이트
 * 5. 카테고리 상태 변경 시 영역 업데이트
 * 6. 패닝 모드 글로벌 리스너
 * 7. 글로벌 드래그 선택 리스너
 * 8. 키보드 이벤트 핸들러
 * 9. Shift 드래그 중 타겟 감지
 */
export const useCanvasEffects = (props: UseCanvasEffectsProps) => {
  const {
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
    onClearCategoryCache,
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
  } = props;

  // 캐시 관리 (Shift 드래그, 메모/카테고리 변경 감지)
  useCacheManagement({
    isDraggingMemo,
    isDraggingCategory,
    isDraggingCategoryArea,
    shiftDragAreaCache,
    currentPage,
    setDraggedCategoryAreas,
    onClearCategoryCache,
    setAreaUpdateTrigger
  });

  // 컨텍스트 메뉴 외부 클릭 감지
  useContextMenuEffect({
    areaContextMenu,
    setAreaContextMenu
  });

  // 캔버스 휠 이벤트 (줌)
  useEffect(() => {
    const canvasElement = document.getElementById('main-canvas');
    if (!canvasElement) return;

    const wheelHandler = (e: WheelEvent) => {
      // Alt + 휠 또는 줌 도구 선택 시 확대/축소
      if (e.altKey || currentTool === 'zoom') {
        e.preventDefault();
        e.stopPropagation();

        const rect = canvasElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

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
    };

    canvasElement.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvasElement.removeEventListener('wheel', wheelHandler);
  }, [currentTool, canvasScale, canvasOffset, setCanvasScale, setCanvasOffset]);

  // 6. 패닝 모드 글로벌 리스너 (마우스 + 터치)
  useEffect(() => {
    if (isPanning) {
      // 마우스 이벤트 핸들러
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        const newOffset = {
          x: panStart.offsetX + deltaX,
          y: panStart.offsetY + deltaY
        };
        setCanvasOffset(newOffset);
      };

      const handleGlobalMouseUp = () => {
        setIsPanning(false);
      };

      // 터치 이벤트 핸들러
      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const deltaX = touch.clientX - panStart.x;
          const deltaY = touch.clientY - panStart.y;
          const newOffset = {
            x: panStart.offsetX + deltaX,
            y: panStart.offsetY + deltaY
          };
          setCanvasOffset(newOffset);
        }
      };

      const handleGlobalTouchEnd = () => {
        setIsPanning(false);
      };

      // 마우스가 윈도우를 벗어났을 때도 팬 종료
      const handleMouseLeave = () => {
        setIsPanning(false);
      };

      // 윈도우 포커스를 잃었을 때도 팬 종료
      const handleBlur = () => {
        setIsPanning(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('blur', handleBlur);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
        document.removeEventListener('touchcancel', handleGlobalTouchEnd);
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [isPanning, panStart, setCanvasOffset, setIsPanning]);

  // 7. 전역 드래그 선택을 위한 이벤트 리스너
  useEffect(() => {
    if (globalDragSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = Math.abs(e.clientX - globalDragStart.x);
        const deltaY = Math.abs(e.clientY - globalDragStart.y);

        // 충분히 드래그되었고 아직 드래그 선택이 시작되지 않았다면 시작
        if ((deltaX > 5 || deltaY > 5) && !isDragSelecting && !dragThresholdMet) {
          setDragThresholdMet(true);
          const canvasElement = document.querySelector('[data-canvas="true"]');
          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const localStartX = globalDragStart.x - rect.left;
            const localStartY = globalDragStart.y - rect.top;
            const worldStartX = (localStartX - canvasOffset.x) / canvasScale;
            const worldStartY = (localStartY - canvasOffset.y) / canvasScale;
            onDragSelectStart({ x: worldStartX, y: worldStartY }, globalDragWithShift);
          }
        }

        // 드래그 선택이 진행중이면 업데이트
        if (isDragSelecting && dragThresholdMet) {
          const canvasElement = document.querySelector('[data-canvas="true"]');
          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const worldX = (localX - canvasOffset.x) / canvasScale;
            const worldY = (localY - canvasOffset.y) / canvasScale;
            onDragSelectMove({ x: worldX, y: worldY });
          }
        }
      };

      const handleGlobalMouseUp = () => {
        const wasSelecting = isDragSelecting && dragThresholdMet;
        setGlobalDragSelecting(false);
        setGlobalDragWithShift(false);
        setDragThresholdMet(false);
        if (wasSelecting) {
          setJustFinishedDragSelection(true);
          onDragSelectEnd();
          // 짧은 지연 후 플래그 해제
          setTimeout(() => setJustFinishedDragSelection(false), 50);
        }
      };

      // 마우스가 윈도우를 벗어났을 때도 드래그 선택 종료
      const handleMouseLeave = () => {
        handleGlobalMouseUp();
      };

      // 윈도우 포커스를 잃었을 때도 드래그 선택 종료
      const handleBlur = () => {
        handleGlobalMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('blur', handleBlur);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [
    globalDragSelecting,
    globalDragStart,
    isDragSelecting,
    dragThresholdMet,
    canvasOffset,
    canvasScale,
    globalDragWithShift,
    onDragSelectStart,
    onDragSelectMove,
    onDragSelectEnd,
    setGlobalDragSelecting,
    setGlobalDragWithShift,
    setDragThresholdMet,
    setJustFinishedDragSelection
  ]);

  // 키보드 이벤트 처리
  useCanvasKeyboard({
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
    setIsPanning
  });

  // Shift 드래그 중 마우스 위치로 영역 충돌 감지
  useEffect(() => {
    if (isShiftPressed && (isDraggingMemo || isDraggingCategory || isDraggingCategoryArea) && currentPage) {
      // 드래그 시작 시의 부모 ID를 고정 (드래그 중 변경되지 않도록)
      let initialParentId: string | null = null;
      let draggingItemName: string = '';

      if (isDraggingMemo && draggingMemoId) {
        const draggingMemo = currentPage.memos.find(m => m.id === draggingMemoId);
        initialParentId = draggingMemo?.parentId || null;
        draggingItemName = draggingMemo?.title || '메모';
      } else if ((isDraggingCategory && draggingCategoryId) || isDraggingCategoryArea) {
        const categoryId = draggingCategoryId || isDraggingCategoryArea;
        if (categoryId) {
          const draggingCategory = currentPage.categories?.find(c => c.id === categoryId);
          initialParentId = draggingCategory?.parentId || null;
          draggingItemName = draggingCategory?.title || '카테고리';
        }
      }

      let lastUpdateTime = 0;

      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastUpdateTime < POSITION_UPDATE_THROTTLE) {
          return; // 너무 자주 업데이트하지 않음
        }
        lastUpdateTime = now;

        const canvasElement = document.querySelector('[data-canvas="true"]');
        if (!canvasElement) return;

        const rect = canvasElement.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - (canvasOffset?.x || 0)) / (canvasScale || 1);
        const mouseY = (e.clientY - rect.top - (canvasOffset?.y || 0)) / (canvasScale || 1);

        // 모든 카테고리 영역과 충돌 검사 - 겹치는 모든 영역 찾기
        const overlappingCategories: CategoryBlock[] = [];

        // 드래그 중인 카테고리 ID 확인
        const draggingCategoryIdCurrent = draggingCategoryId || isDraggingCategoryArea;

        // 드래그 중인 항목을 제외한 페이지 데이터 생성 (영역 계산 시 사용)
        // 메모: 드래그 중인 메모만 제외
        // 카테고리: 드래그 중인 카테고리만 제외 (부모는 제외하지 않음)
        const pageForAreaCalculation: Page = isDraggingMemo && draggingMemoId
          ? {
              ...currentPage,
              memos: currentPage.memos.filter(m => m.id !== draggingMemoId)
            }
          : draggingCategoryIdCurrent
          ? {
              ...currentPage,
              categories: (currentPage.categories || []).filter(c => c.id !== draggingCategoryIdCurrent)
            }
          : currentPage;

        for (const category of (currentPage.categories || [])) {
          if (!category.isExpanded) continue;

          // 드래그 중인 자기 자신 제외
          if (category.id === draggingCategoryIdCurrent) {
            continue;
          }

          // 드래그 시작 시의 부모는 제외 (고정된 초기 부모만 제외)
          if (category.id === initialParentId) {
            continue;
          }

          // 영역 계산 시 드래그 중인 항목을 제외한 데이터 사용
          const area = calculateCategoryArea(category, pageForAreaCalculation);
          if (!area) continue;

          // 마우스가 영역 안에 있는지 확인
          const isInArea = mouseX >= area.x && mouseX <= area.x + area.width &&
              mouseY >= area.y && mouseY <= area.y + area.height;

          if (isInArea) {
            overlappingCategories.push(category);
          }
        }

        // 겹치는 영역 중에서 자신을 제외하고 가장 깊은 레벨(가장 하위) 카테고리 선택
        let foundTarget: string | null = null;

        if (overlappingCategories.length > 0) {
          // 드래그 중인 카테고리 자신을 제외
          const candidateCategories = overlappingCategories.filter(cat =>
            !(draggingCategoryIdCurrent && cat.id === draggingCategoryIdCurrent)
          );

          if (candidateCategories.length > 0) {
            // 각 카테고리의 깊이를 계산
            const categoriesWithDepth = candidateCategories.map(category => {
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

            foundTarget = deepest.category.id;
          }
        }

        setDragTargetCategoryId(foundTarget);
      };

      document.addEventListener('mousemove', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [
    isShiftPressed,
    isDraggingMemo,
    isDraggingCategory,
    isDraggingCategoryArea,
    draggingMemoId,
    draggingCategoryId,
    currentPage,
    canvasOffset,
    canvasScale,
    setDragTargetCategoryId
  ]);

};
