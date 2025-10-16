import React from 'react';
import { Page, CategoryBlock, MemoBlock as MemoBlockType } from '../../types';
import { calculateCategoryArea } from '../../utils/categoryAreaUtils';
import { isInsideCollapsedCategory } from '../../utils/categoryHierarchyUtils';
import MemoBlock from '../MemoBlock';

/**
 * useCanvasRendering
 *
 * Canvas 컴포넌트의 렌더링 로직을 담당하는 훅
 *
 * **주요 기능:**
 * - 연결선 렌더링 (메모-메모, 메모-카테고리, 카테고리-카테고리)
 * - 카테고리 영역 렌더링 (재귀적으로 하위 카테고리 포함)
 * - 카테고리 라벨 및 펼침/접기 UI
 * - Shift+드래그 시각적 힌트
 * - 드래그 선택 하이라이트
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
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onMemoDisplaySizeChange?: (memoId: string, size: any) => void;
  onMemoTitleUpdate?: (memoId: string, title: string) => void;
  onMemoBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void;
  onMemoDragStart?: (memoId: string) => void;
  onMemoDragEnd?: () => void;
  onDeleteMemoById?: (id: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;

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

  // 기타
  canvasOffset?: { x: number; y: number };
  handleDropOnCategoryArea: (e: React.DragEvent, categoryId: string) => void;
  handleCategoryAreaDragOver: (e: React.DragEvent) => void;
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
    setIsDraggingCategoryArea,
    setShiftDragInfo,
    setDraggedCategoryAreas,
    setAreaContextMenu,
    canvasOffset,
    handleDropOnCategoryArea,
    handleCategoryAreaDragOver
  } = params;

  /**
   * 블록(메모 또는 카테고리)의 연결점 계산
   * 블록의 상하좌우 중심점을 반환합니다.
   */
  const getBlockConnectionPoints = React.useCallback((item: any) => {
    const width = item.size?.width || 200;
    const height = item.size?.height || 95;

    return {
      top: {
        x: item.position.x + width / 2,
        y: item.position.y
      },
      bottom: {
        x: item.position.x + width / 2,
        y: item.position.y + height
      },
      left: {
        x: item.position.x,
        y: item.position.y + height / 2
      },
      right: {
        x: item.position.x + width,
        y: item.position.y + height / 2
      }
    };
  }, []);

  /**
   * 연결점 계산 (카테고리 영역 정보 고려)
   * 카테고리의 경우 렌더링된 영역 정보를 우선 사용하고,
   * 없으면 블록 기준으로 계산합니다.
   */
  const getConnectionPoints = React.useCallback((item: any) => {
    // 카테고리인 경우 렌더링된 영역 정보를 우선 사용
    if ('isExpanded' in item && renderedCategoryAreas.current[item.id]) {
      const area = renderedCategoryAreas.current[item.id];
      return {
        top: {
          x: area.x + area.width / 2,
          y: area.y
        },
        bottom: {
          x: area.x + area.width / 2,
          y: area.y + area.height
        },
        left: {
          x: area.x,
          y: area.y + area.height / 2
        },
        right: {
          x: area.x + area.width,
          y: area.y + area.height / 2
        }
      };
    }

    // 메모 또는 영역이 없는 카테고리: 기존 블록 기준 계산 사용
    return getBlockConnectionPoints(item);
  }, [getBlockConnectionPoints, renderedCategoryAreas]);

  /**
   * 카테고리 영역 색상 생성
   * 카테고리 ID를 해시하여 일관된 색상을 반환합니다.
   */
  const getCategoryAreaColor = React.useCallback((categoryId: string): string => {
    const colors = [
      'rgba(59, 130, 246, 0.15)',   // 파란색
      'rgba(16, 185, 129, 0.15)',   // 초록색
      'rgba(245, 101, 101, 0.15)',  // 빨간색
      'rgba(139, 92, 246, 0.15)',   // 보라색
      'rgba(245, 158, 11, 0.15)',   // 노란색
      'rgba(236, 72, 153, 0.15)',   // 핑크색
      'rgba(20, 184, 166, 0.15)',   // 청록색
      'rgba(251, 146, 60, 0.15)',   // 오렌지색
    ];

    // 카테고리 ID를 해시하여 일관된 색상 선택
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
      hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  /**
   * 카테고리 영역 계산 (색상 포함)
   * utils의 calculateCategoryArea를 호출하고 색상을 추가합니다.
   */
  const calculateCategoryAreaWithColor = React.useCallback((category: CategoryBlock, visited: Set<string> = new Set()) => {
    if (!currentPage) return null;

    const area = calculateCategoryArea(category, currentPage, visited);
    if (!area) return null;

    // 최근 드래그한 카테고리만 로그 출력
    if (recentlyDraggedCategoryRef.current === category.id) {
      console.log('[calculateCategoryAreaWithColor 호출]', {
        categoryId: category.id,
        position: `(${category.position.x}, ${category.position.y})`,
        계산된영역: `위치(${area.x}, ${area.y}) 크기(${area.width}x${area.height})`
      });
    }

    return {
      ...area,
      color: getCategoryAreaColor(category.id)
    };
  }, [currentPage, areaUpdateTrigger, getCategoryAreaColor, recentlyDraggedCategoryRef]);

  /**
   * 카테고리가 다른 카테고리의 하위인지 확인
   */
  const isDescendantOf = React.useCallback((categoryId: string, ancestorId: string): boolean => {
    if (!currentPage?.categories) return false;

    let current = currentPage.categories.find(c => c.id === categoryId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = currentPage.categories.find(c => c.id === current!.parentId);
    }
    return false;
  }, [currentPage]);

  /**
   * 연결선 렌더링
   * 메모-메모, 메모-카테고리, 카테고리-카테고리 연결선을 모두 렌더링합니다.
   * 드래그 중인 연결선도 포함됩니다.
   */
  const renderConnectionLines = React.useCallback(() => {
    if (!currentPage) return null;

    const lines: any[] = [];

    // 기존 연결선들 (메모-메모)
    currentPage.memos.forEach(memo => {
      memo.connections.forEach(connId => {
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        const connectedCategory = currentPage.categories?.find(c => c.id === connId);

        // 메모-메모 연결만 여기서 처리 (메모-카테고리는 카테고리 섹션에서 처리)
        if (!connectedMemo || memo.id >= connId) return;

        // 메모가 접힌 카테고리 안에 있으면 연결선 숨기기
        if (isInsideCollapsedCategory(memo.id, currentPage) ||
            isInsideCollapsedCategory(connectedMemo.id, currentPage)) {
          return;
        }

        // 최신 크기 정보로 연결점 계산
        const fromPoints = getConnectionPoints(memo);
        const toPoints = getConnectionPoints(connectedMemo);

        const fromWidth = memo.size?.width || 200;
        const fromHeight = memo.size?.height || 95;
        const toWidth = connectedMemo.size?.width || 200;
        const toHeight = connectedMemo.size?.height || 95;

        // 원본 메모 좌표로 중심점 계산
        const centerFrom = {
          x: memo.position.x + fromWidth / 2,
          y: memo.position.y + fromHeight / 2
        };
        const centerTo = {
          x: connectedMemo.position.x + toWidth / 2,
          y: connectedMemo.position.y + toHeight / 2
        };

        const dx = centerTo.x - centerFrom.x;
        const dy = centerTo.y - centerFrom.y;

        let fromPoint, toPoint;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromPoint = fromPoints.right;
            toPoint = toPoints.left;
          } else {
            fromPoint = fromPoints.left;
            toPoint = toPoints.right;
          }
        } else {
          if (dy > 0) {
            fromPoint = fromPoints.bottom;
            toPoint = toPoints.top;
          } else {
            fromPoint = fromPoints.top;
            toPoint = toPoints.bottom;
          }
        }

        lines.push(
          <g key={`${memo.id}-${connId}`}>
            {/* 투명한 넓은 클릭 영역 */}
            {isDisconnectMode && (
              <line
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveConnection(memo.id, connId);
                }}
              />
            )}
            {/* 실제 보이는 연결선 */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isDisconnectMode ? "#ef4444" : "#9ca3af"}
              strokeWidth={isDisconnectMode ? "4" : "2"}
              style={{
                strokeDasharray: isDisconnectMode ? '5,5' : '4,4',
                pointerEvents: 'none'
              }}
            />
          </g>
        );
      });
    });

    // 카테고리 연결선들 (카테고리끼리 & 메모-카테고리)
    (currentPage.categories || []).forEach(category => {
      category.connections.forEach(connId => {
        // 연결된 대상이 카테고리인지 메모인지 확인
        const connectedCategory = currentPage.categories?.find(c => c.id === connId);
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        const connected = connectedCategory || connectedMemo;

        if (!connected) return; // 연결 대상이 없으면 무시
        if (category.id >= connId) return; // 중복 연결선 방지 (같은 연결을 두 번 그리지 않음)

        // 카테고리나 연결 대상이 접힌 카테고리 안에 있으면 연결선 숨기기
        if (isInsideCollapsedCategory(category.id, currentPage) ||
            isInsideCollapsedCategory(connId, currentPage)) {
          return;
        }

        // getConnectionPoints 사용 (영역이 있으면 영역 기준으로 계산됨)
        const fromPoints = getConnectionPoints(category);
        const toPoints = getConnectionPoints(connected);

        // 최적 연결점 선택을 위한 중심점 계산
        // fromPoints와 toPoints가 이미 영역을 고려하므로, 이를 기반으로 중심 계산
        const centerFrom = {
          x: (fromPoints.left.x + fromPoints.right.x) / 2,
          y: (fromPoints.top.y + fromPoints.bottom.y) / 2
        };
        const centerTo = {
          x: (toPoints.left.x + toPoints.right.x) / 2,
          y: (toPoints.top.y + toPoints.bottom.y) / 2
        };

        const dx = centerTo.x - centerFrom.x;
        const dy = centerTo.y - centerFrom.y;

        let fromPoint, toPoint;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromPoint = fromPoints.right;
            toPoint = toPoints.left;
          } else {
            fromPoint = fromPoints.left;
            toPoint = toPoints.right;
          }
        } else {
          if (dy > 0) {
            fromPoint = fromPoints.bottom;
            toPoint = toPoints.top;
          } else {
            fromPoint = fromPoints.top;
            toPoint = toPoints.bottom;
          }
        }

        lines.push(
          <g key={`category-${category.id}-${connId}`}>
            {/* 투명한 넓은 클릭 영역 */}
            {isDisconnectMode && (
              <line
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveConnection(category.id, connId);
                }}
              />
            )}
            {/* 실제 보이는 연결선 (카테고리는 보라색, 메모-카테고리는 초록색) */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isDisconnectMode ? "#ef4444" : (connectedMemo ? "#10b981" : "#a855f7")}
              strokeWidth={isDisconnectMode ? "4" : "2"}
              style={{
                strokeDasharray: isDisconnectMode ? '5,5' : (connectedMemo ? '6,3' : '8,4'),
                pointerEvents: 'none'
              }}
            />
          </g>
        );
      });
    });

    // 드래그 중인 라인 추가
    if (isConnecting && connectingFromId && dragLineEnd) {
      const connectingMemo = currentPage.memos.find(m => m.id === connectingFromId);
      const connectingCategory = (currentPage.categories || []).find(c => c.id === connectingFromId);

      let fromPoint;

      if (connectingMemo) {
        const fromPoints = getConnectionPoints(connectingMemo);

        // direction이 지정된 경우 해당 방향 사용, 아니면 자동 계산
        if (connectingFromDirection) {
          fromPoint = fromPoints[connectingFromDirection];
        } else {
          const connectingWidth = connectingMemo.size?.width || 200;
          const connectingHeight = connectingMemo.size?.height || 95;

          // 원본 메모 좌표로 중심점 계산
          const centerFrom = {
            x: connectingMemo.position.x + connectingWidth / 2,
            y: connectingMemo.position.y + connectingHeight / 2
          };
          // dragLineEnd를 원본 좌표로 변환
          const dx = dragLineEnd.x - centerFrom.x;
          const dy = dragLineEnd.y - centerFrom.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
          } else {
            fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
          }
        }
      } else if (connectingCategory) {
        // getConnectionPoints를 사용하여 영역 정보를 고려
        const fromPoints = getConnectionPoints(connectingCategory);

        // direction이 지정된 경우 해당 방향 사용, 아니면 자동 계산
        if (connectingFromDirection) {
          fromPoint = fromPoints[connectingFromDirection];
        } else {
          // 카테고리 중심점 계산
          const centerFrom = {
            x: (fromPoints.left.x + fromPoints.right.x) / 2,
            y: (fromPoints.top.y + fromPoints.bottom.y) / 2
          };

          const dx = dragLineEnd.x - centerFrom.x;
          const dy = dragLineEnd.y - centerFrom.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
          } else {
            fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
          }
        }
      }

      if (fromPoint) {

        const dragLine = (
          <line
            key="drag-line"
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={dragLineEnd.x}
            y2={dragLineEnd.y}
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="6,4"
            style={{
              animation: 'dash 1s linear infinite'
            }}
          />
        );
        lines.push(dragLine);
      }
    }

    return lines;
  }, [
    currentPage,
    isDisconnectMode,
    isConnecting,
    connectingFromId,
    connectingFromDirection,
    dragLineEnd,
    getConnectionPoints,
    onRemoveConnection
  ]);

  /**
   * 단일 카테고리 영역 렌더링 (재귀적)
   * 카테고리 영역, 라벨, 연결점, Shift+드래그 힌트 등을 렌더링하고
   * 하위 카테고리도 재귀적으로 렌더링합니다.
   */
  const renderSingleCategoryArea = React.useCallback((category: CategoryBlock): React.ReactNode[] => {
    const areas: React.ReactNode[] = [];

    // 현재 카테고리의 영역 렌더링 (하위 아이템 포함한 확장 가능한 영역)
    // 드래그 중인 카테고리는 캐시된 영역 사용 (크기 고정)
    let area: any = null;

    if (draggedCategoryAreas[category.id]) {
      // 카테고리 드래그: 캐시된 영역 사용
      const cached = draggedCategoryAreas[category.id];
      const deltaX = category.position.x - cached.originalPosition.x;
      const deltaY = category.position.y - cached.originalPosition.y;

      area = {
        x: cached.area.x + deltaX,
        y: cached.area.y + deltaY,
        width: cached.area.width,   // 캐시된 크기 유지
        height: cached.area.height, // 캐시된 크기 유지
        color: cached.area.color
      };
    } else if (isShiftPressed && shiftDragAreaCache.current[category.id]) {
      // Shift 드래그 중: 캐시된 영역의 크기 사용, 위치는 임시 오프셋 적용
      const cachedArea = shiftDragAreaCache.current[category.id];

      // Shift 드래그 중이고 현재 카테고리가 드래그 중이거나 그 하위 항목이면 오프셋 적용
      let currentPosition = category.position;
      if (shiftDragInfo && (shiftDragInfo.categoryId === category.id || isDescendantOf(category.id, shiftDragInfo.categoryId))) {
        currentPosition = {
          x: category.position.x + shiftDragInfo.offset.x,
          y: category.position.y + shiftDragInfo.offset.y
        };
      }

      // 캐시된 영역이 카테고리 블록 기준으로 얼마나 떨어져 있는지 계산
      const offsetX = cachedArea.x - (category.position.x - 20); // padding 20 고려
      const offsetY = cachedArea.y - (category.position.y - 20);

      area = {
        x: currentPosition.x - 20 + offsetX,
        y: currentPosition.y - 20 + offsetY,
        width: cachedArea.width,   // 캐시된 크기 유지
        height: cachedArea.height, // 캐시된 크기 유지
        color: cachedArea.color
      };
    } else {
      // 캐시된 영역이 없으면 동적 계산
      if (recentlyDraggedCategoryRef.current === category.id) {
        console.log('[renderSingleCategoryArea] 캐시 없음 - 동적 계산 시작');
      }

      area = calculateCategoryAreaWithColor(category);

      // 최근 드래그한 카테고리만 로그 출력
      if (recentlyDraggedCategoryRef.current === category.id) {
        console.log('[renderSingleCategoryArea] 동적 계산 완료:', {
          영역크기: area ? `${area.width}x${area.height}` : 'null',
          영역좌표: area ? `(${area.x}, ${area.y})` : 'null'
        });
      }

      // 하위 카테고리인데 자식이 없어서 area가 null인 경우, 기본 영역 생성
      if (!area && category.parentId) {
        const categoryWidth = category.size?.width || 200;
        const categoryHeight = category.size?.height || 80;
        const padding = 20;
        area = {
          x: category.position.x - padding,
          y: category.position.y - padding,
          width: categoryWidth + padding * 2,
          height: categoryHeight + padding * 2,
          color: `rgba(${Math.abs(category.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % 200 + 50}, ${Math.abs(category.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 7) % 200 + 50}, 255, 0.1)`
        };
      }

      // Shift 드래그 중이면 계산된 영역을 캐시에 저장 (메모 또는 카테고리 드래그)
      if (isShiftPressed && (isDraggingMemo || isDraggingCategory)) {
        shiftDragAreaCache.current[category.id] = area;
      }
    }

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

      if (isShiftPressed && (isDraggingMemo || isDraggingCategory)) {
        // 드래그 중인 아이템의 현재 부모 ID 확인
        if (isDraggingMemo && draggingMemoId) {
          const draggingMemo = currentPage?.memos.find(m => m.id === draggingMemoId);
          draggingItemParentId = draggingMemo?.parentId || null;
        } else if (isDraggingCategory && draggingCategoryId) {
          const draggingCategory = currentPage?.categories?.find(c => c.id === draggingCategoryId);
          draggingItemParentId = draggingCategory?.parentId || null;
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
      const isShiftDragTarget = isShiftPressed && dragTargetCategoryId === category.id && (isDraggingMemo || isDraggingCategory) && !isCurrentParent;

      // 드래그 선택 중 하이라이트
      const isDragHovered = dragHoveredCategoryIds.includes(category.id);

      // 드래그 중인 카테고리는 transform을 사용하여 GPU 가속 활용
      const isDragging = draggedCategoryAreas[category.id] !== undefined;
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
            transition: isDragging ? 'none' : 'all 0.2s ease',
            willChange: isDragging ? 'transform' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onDrop={(e) => handleDropOnCategoryArea(e, category.id)}
          onDragOver={handleCategoryAreaDragOver}
          onMouseDown={(e) => {
            if (e.button === 0 && !isConnecting) {
              // 영역 드래그 시작 - 카테고리 전체를 이동
              e.stopPropagation();
              setIsDraggingCategoryArea(category.id);

              let startX = e.clientX;
              let startY = e.clientY;
              const originalCategoryPosition = { x: category.position.x, y: category.position.y };
              let hasMoved = false;
              let isShiftMode = isShiftPressed;

              // 초기 Shift 상태에 따라 캐시 설정
              if (isShiftMode) {
                if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
                  currentPage.categories?.forEach(cat => {
                    if (cat.isExpanded) {
                      const catArea = calculateCategoryAreaWithColor(cat);
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

              let isDraggingArea = true; // 드래그 상태 추적

              const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!isDraggingArea) return; // 드래그 종료 후 이벤트 무시

                hasMoved = true;
                const currentShiftState = moveEvent.shiftKey;

                if (currentShiftState !== isShiftMode) {
                  isShiftMode = currentShiftState;

                  if (isShiftMode) {
                    if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
                      currentPage.categories?.forEach(cat => {
                        if (cat.isExpanded) {
                          const catArea = calculateCategoryAreaWithColor(cat);
                          if (catArea) {
                            shiftDragAreaCache.current[cat.id] = catArea;
                          }
                        }
                      });
                    }
                    setDraggedCategoryAreas(prev => {
                      const newAreas = { ...prev };
                      delete newAreas[category.id];
                      return newAreas;
                    });
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
                    shiftDragAreaCache.current = {};
                  }
                }

                const deltaX = (moveEvent.clientX - startX) / canvasScale;
                const deltaY = (moveEvent.clientY - startY) / canvasScale;

                const newPosition = {
                  x: originalCategoryPosition.x + deltaX,
                  y: originalCategoryPosition.y + deltaY
                };

                onCategoryPositionChange(category.id, newPosition);

                if (isShiftMode) {
                  setShiftDragInfo({
                    categoryId: category.id,
                    offset: { x: deltaX, y: deltaY }
                  });
                } else {
                  setShiftDragInfo(null);
                }
              };

              const handleMouseUp = (upEvent?: MouseEvent) => {
                if (!isDraggingArea) return; // 이미 종료된 경우 중복 실행 방지
                isDraggingArea = false; // 즉시 드래그 종료 플래그 설정

                setIsDraggingCategoryArea(null);
                setShiftDragInfo(null);

                if (hasMoved) {
                  const finalPosition = {
                    x: originalCategoryPosition.x + ((upEvent?.clientX || (window.event as MouseEvent).clientX) - startX) / canvasScale,
                    y: originalCategoryPosition.y + ((upEvent?.clientY || (window.event as MouseEvent).clientY) - startY) / canvasScale
                  };

                  onCategoryPositionDragEnd?.(category.id, finalPosition);

                  if (isShiftMode) {
                    onShiftDropCategory?.(category, finalPosition);
                    // 카테고리 드롭 감지 (카테고리-카테고리 종속 처리)
                    onDetectCategoryDropForCategory?.(category.id, finalPosition);
                  }
                }

                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mouseleave', handleMouseLeave);
              };

              // mouseup 이벤트가 누락되는 경우를 대비한 안전장치
              const handleMouseLeave = () => {
                if (isDraggingArea) {
                  handleMouseUp();
                }
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              document.addEventListener('mouseleave', handleMouseLeave);
            }
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
              padding: '20px'
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

      // Shift+드래그 중인지 확인
      const isCurrentCategoryBeingDragged = isDraggingCategory && draggingCategoryId === category.id;
      const isShiftDragging = isCurrentCategoryBeingDragged && isShiftPressed;

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
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            pointerEvents: 'auto',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
            border: isShiftDragging ? '2px solid #059669' : 'none'
          }}
          onClick={() => onCategorySelect(category.id)}
          onDoubleClick={() => {
            // 더블클릭 시 편집 모드로 전환하는 함수 호출
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCategorySelect(category.id);
            setAreaContextMenu({ x: e.clientX, y: e.clientY, categoryId: category.id });
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              // 라벨 드래그 시작 - 라벨만 이동
              e.stopPropagation();

              let startX = e.clientX;
              let startY = e.clientY;
              const originalLabelPosition = { x: category.position.x, y: category.position.y };
              let hasMoved = false;
              let isDragging = true;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!isDragging) return; // 드래그 종료 후 이벤트 무시

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

              const handleMouseUp = () => {
                isDragging = false; // 즉시 드래그 종료 플래그 설정
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
        >
          {isShiftDragging && (
            <span style={{ fontSize: '18px', fontWeight: 'bold', marginRight: '-4px' }}>+</span>
          )}
          <span>{category.title}</span>
          <button
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              fontSize: '10px',
              padding: '2px 4px',
              cursor: 'pointer'
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

      // Shift가 눌리지 않은 상태에서 드래그 중일 때 힌트 UI 표시
      if (isCurrentCategoryBeingDragged && !isShiftPressed) {
        areas.push(
          <div
            key={`hint-${category.id}`}
            style={{
              position: 'absolute',
              left: `${labelX + (category.size?.width || 200) + 10}px`,
              top: `${labelY}px`,
              backgroundColor: '#374151',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          >
            💡 Shift를 누르면 카테고리에 추가
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
    draggedCategoryAreas,
    isShiftPressed,
    shiftDragAreaCache,
    shiftDragInfo,
    isDescendantOf,
    recentlyDraggedCategoryRef,
    calculateCategoryAreaWithColor,
    isDraggingMemo,
    isDraggingCategory,
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
    handleCategoryAreaDragOver
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
            isDragHovered={dragHoveredMemoIds.includes(memo.id)}
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
