import { useCallback } from 'react';
import { Page, CategoryBlock, ImportanceLevel } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';
import { useAnalyticsTrackers } from '../features/analytics/hooks/useAnalyticsTrackers';

/**
 * useSelectionHandlers
 *
 * 메모 및 카테고리 선택, 드래그 선택, 중요도 필터 관리
 */

interface UseSelectionHandlersProps {
  pages: Page[];
  currentPageId: string;
  selectedMemoId: string | null;
  setSelectedMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMemoIds: string[];
  setSelectedMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isDragSelecting: boolean;
  setIsDragSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  dragSelectStart: { x: number; y: number } | null;
  setDragSelectStart: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  dragSelectEnd: { x: number; y: number } | null;
  setDragSelectEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setDragHoveredMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  setDragHoveredCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isDragSelectingWithShift: boolean;
  setIsDragSelectingWithShift: React.Dispatch<React.SetStateAction<boolean>>;
  activeImportanceFilters: Set<ImportanceLevel>;
  setActiveImportanceFilters: React.Dispatch<React.SetStateAction<Set<ImportanceLevel>>>;
  showGeneralContent: boolean;
  setShowGeneralContent: React.Dispatch<React.SetStateAction<boolean>>;
  setCanvasOffset?: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setCanvasScale?: React.Dispatch<React.SetStateAction<number>>;
}

export const useSelectionHandlers = (props: UseSelectionHandlersProps) => {
  const analytics = useAnalyticsTrackers();
  const {
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
    isDragSelecting,
    setIsDragSelecting,
    dragSelectStart,
    setDragSelectStart,
    dragSelectEnd,
    setDragSelectEnd,
    setDragHoveredMemoIds,
    setDragHoveredCategoryIds,
    isDragSelectingWithShift,
    setIsDragSelectingWithShift,
    activeImportanceFilters,
    setActiveImportanceFilters,
    showGeneralContent,
    setShowGeneralContent,
    setCanvasOffset,
    setCanvasScale
  } = props;

  const currentPage = pages?.find(p => p.id === currentPageId);

  // 통합 메모 선택 핸들러 (멀티 선택 지원)
  const handleMemoSelect = useCallback((memoId: string, isShiftClick: boolean = false) => {
    // 카테고리 선택 해제
    setSelectedCategoryId(null);
    setSelectedCategoryIds([]);

    // 빈 문자열이거나 유효하지 않은 ID인 경우 모든 선택 해제
    if (!memoId || !currentPage?.memos.find(m => m.id === memoId)) {
      setSelectedMemoId(null);
      setSelectedMemoIds([]);
      setIsDragSelecting(false);
      setDragSelectStart(null);
      setDragSelectEnd(null);
      setDragHoveredMemoIds([]);
      setDragHoveredCategoryIds([]);
      return;
    }

    if (isShiftClick) {
      // Shift + 클릭: 멀티 선택
      setSelectedMemoIds(prev => {
        const currentSelection = selectedMemoId ? [selectedMemoId, ...prev] : prev;
        if (currentSelection.includes(memoId)) {
          return currentSelection.filter(id => id !== memoId);
        } else {
          return [...currentSelection, memoId];
        }
      });
      setSelectedMemoId(null);
    } else {
      // 일반 클릭: 단일 선택
      setSelectedMemoId(memoId);
      setSelectedMemoIds([]);
    }
  }, [currentPage, selectedMemoId, setSelectedMemoId, setSelectedMemoIds, setSelectedCategoryId, setSelectedCategoryIds, setIsDragSelecting, setDragSelectStart, setDragSelectEnd, setDragHoveredMemoIds, setDragHoveredCategoryIds]);

  // 카테고리 선택 핸들러
  const selectCategory = useCallback((categoryId: string | null, isShiftClick: boolean = false) => {
    // 메모 선택 해제
    setSelectedMemoId(null);
    setSelectedMemoIds([]);

    if (!categoryId) {
      setSelectedCategoryId(null);
      setSelectedCategoryIds([]);
      return;
    }

    if (isShiftClick) {
      // Shift + 클릭: 멀티 선택
      setSelectedCategoryIds(prev => {
        const currentSelection = selectedCategoryId ? [selectedCategoryId, ...prev] : prev;
        if (currentSelection.includes(categoryId)) {
          return currentSelection.filter(id => id !== categoryId);
        } else {
          return [...currentSelection, categoryId];
        }
      });
      setSelectedCategoryId(null);
    } else {
      // 일반 클릭: 단일 선택
      setSelectedCategoryId(categoryId);
      setSelectedCategoryIds([]);
    }
  }, [selectedCategoryId, setSelectedCategoryId, setSelectedCategoryIds, setSelectedMemoId, setSelectedMemoIds]);

  // 드래그 선택 시작
  const handleDragSelectStart = useCallback((position: { x: number; y: number }, isShiftPressed: boolean = false) => {
    setIsDragSelecting(true);
    setDragSelectStart(position);
    setDragSelectEnd(position);
    setIsDragSelectingWithShift(isShiftPressed);
  }, [setIsDragSelecting, setDragSelectStart, setDragSelectEnd, setIsDragSelectingWithShift]);

  // 드래그 선택 이동
  const handleDragSelectMove = useCallback((position: { x: number; y: number }) => {
    if (!isDragSelecting || !dragSelectStart || !currentPage) return;

    setDragSelectEnd(position);

    const minX = Math.min(dragSelectStart.x, position.x);
    const maxX = Math.max(dragSelectStart.x, position.x);
    const minY = Math.min(dragSelectStart.y, position.y);
    const maxY = Math.max(dragSelectStart.y, position.y);

    const hoveredMemos = currentPage.memos.filter(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      return memo.position.x < maxX && memo.position.x + memoWidth > minX &&
             memo.position.y < maxY && memo.position.y + memoHeight > minY;
    });

    const hoveredCategories = (currentPage.categories || []).filter(category => {
      const hasChildren = currentPage.memos.some(m => m.parentId === category.id) ||
                         currentPage.categories?.some(c => c.parentId === category.id);

      if (hasChildren && category.isExpanded) {
        const area = calculateCategoryArea(category, currentPage);
        if (area) {
          return area.x < maxX && area.x + area.width > minX &&
                 area.y < maxY && area.y + area.height > minY;
        }
      } else {
        const categoryWidth = category.size?.width || 200;
        const categoryHeight = category.size?.height || 95;
        return category.position.x < maxX && category.position.x + categoryWidth > minX &&
               category.position.y < maxY && category.position.y + categoryHeight > minY;
      }
      return false;
    });

    setDragHoveredMemoIds(hoveredMemos.map(m => m.id));
    setDragHoveredCategoryIds(hoveredCategories.map(c => c.id));
  }, [isDragSelecting, dragSelectStart, currentPage, setDragSelectEnd, setDragHoveredMemoIds, setDragHoveredCategoryIds]);

  // 드래그 선택 종료
  const handleDragSelectEnd = useCallback(() => {
    if (!isDragSelecting || !dragSelectStart || !dragSelectEnd || !currentPage) {
      setIsDragSelecting(false);
      setDragSelectStart(null);
      setDragSelectEnd(null);
      setDragHoveredMemoIds([]);
      setIsDragSelectingWithShift(false);
      return;
    }

    const minX = Math.min(dragSelectStart.x, dragSelectEnd.x);
    const maxX = Math.max(dragSelectStart.x, dragSelectEnd.x);
    const minY = Math.min(dragSelectStart.y, dragSelectEnd.y);
    const maxY = Math.max(dragSelectStart.y, dragSelectEnd.y);

    const memosInSelection = currentPage.memos.filter(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      return memo.position.x < maxX && memo.position.x + memoWidth > minX &&
             memo.position.y < maxY && memo.position.y + memoHeight > minY;
    });

    const categoriesInSelection = (currentPage.categories || []).filter(category => {
      const hasChildren = currentPage.memos.some(m => m.parentId === category.id) ||
                         currentPage.categories?.some(c => c.parentId === category.id);

      if (hasChildren && category.isExpanded) {
        const area = calculateCategoryArea(category, currentPage);
        if (area) {
          return area.x < maxX && area.x + area.width > minX &&
                 area.y < maxY && area.y + area.height > minY;
        }
      } else {
        const categoryWidth = category.size?.width || 200;
        const categoryHeight = category.size?.height || 95;
        return category.position.x < maxX && category.position.x + categoryWidth > minX &&
               category.position.y < maxY && category.position.y + categoryHeight > minY;
      }
      return false;
    });

    if (memosInSelection.length > 0 || categoriesInSelection.length > 0) {
      if (isDragSelectingWithShift) {
        // Shift + 드래그: 기존 선택 유지하면서 토글
        const currentMemoSelection = selectedMemoId ? [selectedMemoId, ...selectedMemoIds] : selectedMemoIds;
        const currentCategorySelection = selectedCategoryId ? [selectedCategoryId, ...selectedCategoryIds] : selectedCategoryIds;
        let newMemoSelection = [...currentMemoSelection];
        let newCategorySelection = [...currentCategorySelection];

        memosInSelection.forEach(memo => {
          if (newMemoSelection.includes(memo.id)) {
            newMemoSelection = newMemoSelection.filter(id => id !== memo.id);
          } else {
            newMemoSelection.push(memo.id);
          }
        });

        categoriesInSelection.forEach(category => {
          if (newCategorySelection.includes(category.id)) {
            newCategorySelection = newCategorySelection.filter(id => id !== category.id);
          } else {
            newCategorySelection.push(category.id);
          }
        });

        setSelectedMemoIds(newMemoSelection);
        setSelectedMemoId(null);
        setSelectedCategoryIds(newCategorySelection);
        setSelectedCategoryId(null);
      } else {
        // 일반 드래그: 기존 선택 해제하고 새로 선택
        setSelectedMemoIds(memosInSelection.map(m => m.id));
        setSelectedMemoId(null);
        setSelectedCategoryIds(categoriesInSelection.map(c => c.id));
        setSelectedCategoryId(null);
      }
    } else if (!isDragSelectingWithShift) {
      // 아무것도 선택하지 않았으면 기존 선택 해제
      setSelectedMemoIds([]);
      setSelectedMemoId(null);
      setSelectedCategoryIds([]);
      setSelectedCategoryId(null);
    }

    setIsDragSelecting(false);
    setDragSelectStart(null);
    setDragSelectEnd(null);
    setDragHoveredMemoIds([]);
    setIsDragSelectingWithShift(false);
  }, [isDragSelecting, dragSelectStart, dragSelectEnd, currentPage, isDragSelectingWithShift, selectedMemoId, selectedMemoIds, selectedCategoryId, selectedCategoryIds, setIsDragSelecting, setDragSelectStart, setDragSelectEnd, setDragHoveredMemoIds, setIsDragSelectingWithShift, setSelectedMemoId, setSelectedMemoIds, setSelectedCategoryId, setSelectedCategoryIds]);

  // 중요도 필터 토글
  const toggleImportanceFilter = useCallback((level: ImportanceLevel) => {
    setActiveImportanceFilters(prev => {
      const newSet = new Set(prev);
      const isAdding = !newSet.has(level);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }

      // Track analytics (only when adding filter)
      if (isAdding) {
        analytics.trackImportanceFilterUsed(Array.from(newSet));
      }

      return newSet;
    });
  }, [setActiveImportanceFilters, analytics]);

  // 필터 초기화
  const resetFiltersToDefault = useCallback(() => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
    setActiveImportanceFilters(new Set(allLevels));
    setShowGeneralContent(true);
  }, [setActiveImportanceFilters, setShowGeneralContent]);

  // 특정 메모로 화면 이동
  const focusOnMemo = useCallback((memoId: string) => {
    console.log('🎯 [focusOnMemo] 호출됨:', { memoId });
    const memo = currentPage?.memos.find(m => m.id === memoId);
    if (!memo) {
      console.error('❌ [focusOnMemo] 메모를 찾을 수 없음:', memoId);
      return;
    }
    console.log('✅ [focusOnMemo] 메모 찾음:', { title: memo.title, position: memo.position });

    // 메모 선택
    setSelectedMemoId(memoId);
    setSelectedMemoIds([]);
    console.log('✅ [focusOnMemo] 메모 선택 상태 설정 완료');

    // 캔버스를 메모 중심으로 이동
    if (setCanvasOffset && setCanvasScale) {
      console.log('🔄 [focusOnMemo] setCanvasOffset, setCanvasScale 존재 확인');
      // Canvas 컨테이너의 실제 크기 가져오기
      const canvasElement = document.getElementById('main-canvas');
      if (!canvasElement) {
        console.error('❌ [focusOnMemo] Canvas 요소를 찾을 수 없음');
        return;
      }
      console.log('✅ [focusOnMemo] Canvas 요소 찾음');

      const rect = canvasElement.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;

      // 메모 크기
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 150;

      // 메모 중심 좌표
      const memoCenterX = memo.position.x + memoWidth / 2;
      const memoCenterY = memo.position.y + memoHeight / 2;

      // scale을 1로 리셋할 것이므로 scale 1 기준으로 offset 계산
      const targetScale = 1;
      const newOffsetX = availableWidth / 2 - memoCenterX * targetScale;
      const newOffsetY = availableHeight / 2 - memoCenterY * targetScale;

      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      setCanvasScale(targetScale); // 초기 줌 레벨로 리셋
    }
  }, [currentPage, setSelectedMemoId, setSelectedMemoIds, setCanvasOffset, setCanvasScale]);

  // 특정 카테고리로 화면 이동
  const focusOnCategory = useCallback((categoryId: string) => {
    console.log('🎯 [focusOnCategory] 호출됨:', { categoryId });
    const category = currentPage?.categories?.find(c => c.id === categoryId);
    if (!category) {
      console.error('❌ [focusOnCategory] 카테고리를 찾을 수 없음:', categoryId);
      return;
    }
    console.log('✅ [focusOnCategory] 카테고리 찾음:', { title: category.title, position: category.position });

    // 카테고리 선택
    setSelectedCategoryId(categoryId);
    setSelectedCategoryIds([]);
    console.log('✅ [focusOnCategory] 카테고리 선택 상태 설정 완료');

    // 캔버스를 카테고리 중심으로 이동
    if (setCanvasOffset && setCanvasScale) {
      console.log('🔄 [focusOnCategory] setCanvasOffset, setCanvasScale 존재 확인');
      // Canvas 컨테이너의 실제 크기 가져오기
      const canvasElement = document.getElementById('main-canvas');
      if (!canvasElement) {
        console.error('❌ [focusOnCategory] Canvas 요소를 찾을 수 없음');
        return;
      }
      console.log('✅ [focusOnCategory] Canvas 요소 찾음');

      const rect = canvasElement.getBoundingClientRect();
      const availableWidth = rect.width;
      const availableHeight = rect.height;
      console.log('📐 [focusOnCategory] Canvas 크기:', { width: availableWidth, height: availableHeight });

      // 카테고리 크기
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 150;

      // 카테고리 중심 좌표
      const categoryCenterX = category.position.x + categoryWidth / 2;
      const categoryCenterY = category.position.y + categoryHeight / 2;
      console.log('📍 [focusOnCategory] 카테고리 중심:', { categoryCenterX, categoryCenterY });

      // scale을 1로 리셋할 것이므로 scale 1 기준으로 offset 계산
      const targetScale = 1;
      const newOffsetX = availableWidth / 2 - categoryCenterX * targetScale;
      const newOffsetY = availableHeight / 2 - categoryCenterY * targetScale;
      console.log('🔄 [focusOnCategory] 새 offset 계산:', { newOffsetX, newOffsetY, targetScale });

      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      setCanvasScale(targetScale);
      console.log('✅ [focusOnCategory] offset 및 scale 설정 완료');
    } else {
      console.warn('⚠️ [focusOnCategory] setCanvasOffset 또는 setCanvasScale이 없음');
    }
  }, [currentPage, setSelectedCategoryId, setSelectedCategoryIds, setCanvasOffset, setCanvasScale]);

  return {
    handleMemoSelect,
    selectCategory,
    handleDragSelectStart,
    handleDragSelectMove,
    handleDragSelectEnd,
    toggleImportanceFilter,
    resetFiltersToDefault,
    focusOnMemo,
    focusOnCategory
  };
};
