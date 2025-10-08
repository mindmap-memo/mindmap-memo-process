import React from 'react';
import { Page, MemoDisplaySize, ImportanceLevel, CategoryBlock, MemoBlock as MemoBlockType, isMemoBlock, isCategoryBlock } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';
import MemoBlock from './MemoBlock';
import CategoryBlockComponent from './CategoryBlock';
import ImportanceFilter from './ImportanceFilter';

interface CanvasProps {
  currentPage: Page | undefined;
  selectedMemoId: string | null;
  selectedMemoIds: string[];
  selectedCategoryId: string | null; // 선택된 카테고리 ID
  selectedCategoryIds: string[]; // 다중 선택된 카테고리 ID들
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void; // 카테고리 선택 핸들러
  onAddMemo: (position?: { x: number; y: number }) => void;
  onAddCategory: (position?: { x: number; y: number }) => void; // 카테고리 생성 핸들러
  onDeleteMemo: () => void;
  onDeleteCategory: (categoryId: string) => void; // 카테고리 삭제 핸들러
  onDeleteSelected: () => void; // 통합 삭제 핸들러
  onDisconnectMemo: () => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void; // 카테고리 위치 변경
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onCategorySizeChange: (categoryId: string, size: { width: number; height: number }) => void; // 카테고리 크기 변경
  onCategoryUpdate: (category: CategoryBlock) => void; // 카테고리 업데이트
  onCategoryToggleExpanded: (categoryId: string) => void; // 카테고리 펼침/접기
  onMoveToCategory: (itemId: string, categoryId: string | null) => void; // 아이템을 카테고리로 이동
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void; // 드래그 완료 시 카테고리 감지
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void; // 카테고리 드래그 완료 시 처리
  onMemoDisplaySizeChange?: (memoId: string, size: MemoDisplaySize) => void;
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  dragLineEnd: { x: number; y: number } | null;
  onStartConnection: (memoId: string) => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCancelConnection: () => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onUpdateDragLine: (mousePos: { x: number; y: number }) => void;
  isDragSelecting: boolean;
  dragSelectStart: { x: number; y: number } | null;
  dragSelectEnd: { x: number; y: number } | null;
  dragHoveredMemoIds: string[];
  onDragSelectStart: (position: { x: number; y: number }, isShiftPressed: boolean) => void;
  onDragSelectMove: (position: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;
  activeImportanceFilters: Set<ImportanceLevel>;
  onToggleImportanceFilter: (level: ImportanceLevel) => void;
  showGeneralContent: boolean;
  onToggleGeneralContent: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDraggingMemo?: boolean;
  onMemoDragStart?: () => void;
  onMemoDragEnd?: () => void;
  isDraggingCategory?: boolean;
  onCategoryDragStart?: () => void;
  onCategoryDragEnd?: () => void;
  onCategoryPositionDragEnd?: (categoryId: string) => void;
  onClearCategoryCache?: (categoryId: string) => void;
  isShiftPressed?: boolean;
  shiftDragAreaCacheRef?: React.MutableRefObject<{[categoryId: string]: any}>;
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
  onMemoSizeChange,
  onCategorySizeChange,
  onCategoryUpdate,
  onCategoryToggleExpanded,
  onMoveToCategory,
  onDetectCategoryOnDrop,
  onDetectCategoryDropForCategory,
  onMemoDisplaySizeChange,
  isConnecting,
  isDisconnectMode,
  connectingFromId,
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
  onDragSelectStart,
  onDragSelectMove,
  onDragSelectEnd,
  activeImportanceFilters,
  onToggleImportanceFilter,
  showGeneralContent,
  onToggleGeneralContent,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDraggingMemo = false,
  onMemoDragStart,
  onMemoDragEnd,
  isDraggingCategory = false,
  onCategoryDragStart,
  onCategoryDragEnd,
  onCategoryPositionDragEnd,
  onClearCategoryCache,
  isShiftPressed = false,
  shiftDragAreaCacheRef
}) => {
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = React.useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = React.useState(1);
  const [currentTool, setCurrentTool] = React.useState<'select' | 'pan' | 'zoom'>('select');

  // 메모 블럭은 항상 표시하고, 내용 필터링은 MemoBlock 내부에서 처리
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isAltPressed, setIsAltPressed] = React.useState(false);
  const [baseTool, setBaseTool] = React.useState<'select' | 'pan' | 'zoom'>('select');
  const [isMouseOverCanvas, setIsMouseOverCanvas] = React.useState(false);
  const [areaUpdateTrigger, setAreaUpdateTrigger] = React.useState(0);

  // Shift 드래그 중 영역 캐시 (영역 크기가 변하지 않도록)
  // App.tsx에서 전달된 ref 사용하거나 로컬 ref 사용
  const localShiftDragAreaCache = React.useRef<{[categoryId: string]: any}>({});
  const shiftDragAreaCache = shiftDragAreaCacheRef || localShiftDragAreaCache;

  // Shift 드래그가 끝나면 캐시 클리어
  React.useEffect(() => {
    if (!isDraggingMemo || !isShiftPressed) {
      shiftDragAreaCache.current = {};
    }
  }, [isDraggingMemo, isShiftPressed, shiftDragAreaCache]);

  // 드래그 중인 카테고리의 영역 캐시 (드래그 중에 크기가 변하지 않도록)
  const [draggedCategoryAreas, setDraggedCategoryAreas] = React.useState<{[categoryId: string]: {area: any, originalPosition: {x: number, y: number}}}>({});

  // 드래그 중 상태 추적
  const [isDraggingCategoryArea, setIsDraggingCategoryArea] = React.useState<string | null>(null);

  // 메모 위치 변경 시 영역 업데이트 (카테고리 위치는 제외)
  React.useEffect(() => {
    if (currentPage) {
      // 메모가 속한 카테고리의 캐시 제거 (영역 크기 재계산)
      // 단, 드래그 중인 카테고리는 제외 (크기 고정 유지)
      const affectedCategoryIds = new Set<string>();
      currentPage.memos.forEach(memo => {
        if (memo.parentId && memo.parentId !== isDraggingCategoryArea) {
          affectedCategoryIds.add(memo.parentId);
        }
      });

      if (affectedCategoryIds.size > 0) {
        setDraggedCategoryAreas(prev => {
          const newAreas = { ...prev };
          affectedCategoryIds.forEach(catId => {
            // 드래그 중인 카테고리의 캐시는 제거하지 않음
            if (catId !== isDraggingCategoryArea) {
              delete newAreas[catId];
            }
          });
          return newAreas;
        });

        // App.tsx의 메모 위치 캐시도 동기화하여 제거 (별도 effect로 분리)
        affectedCategoryIds.forEach(catId => {
          if (catId !== isDraggingCategoryArea) {
            onClearCategoryCache?.(catId);
          }
        });
      }
    }
  }, [
    // 메모 위치만 감지 (카테고리 위치는 제외)
    currentPage?.memos?.map(m => `${m.id}:${m.position.x}:${m.position.y}:${m.size?.width}:${m.size?.height}:${m.parentId}`).join('|'),
    isDraggingCategoryArea,
    onClearCategoryCache
  ]);

  // 카테고리 상태 변경 시 영역 업데이트 트리거만 실행 (캐시 제거 안 함)
  React.useEffect(() => {
    if (currentPage) {
      setAreaUpdateTrigger(prev => prev + 1);
    }
  }, [
    currentPage?.categories?.map(c => `${c.id}:${c.size?.width}:${c.size?.height}:${c.isExpanded}`).join('|')
  ]);

  // 추가적으로 실시간 업데이트를 위한 효과
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAreaUpdateTrigger(prev => prev + 1);
    }, 100); // 100ms마다 강제 업데이트

    return () => clearInterval(interval);
  }, []);

  // Wheel 이벤트를 네이티브로 등록 (passive 경고 방지)
  React.useEffect(() => {
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
          const scaleDiff = newScale - canvasScale;
          const newOffsetX = canvasOffset.x - (mouseX - canvasOffset.x) * (scaleDiff / canvasScale);
          const newOffsetY = canvasOffset.y - (mouseY - canvasOffset.y) * (scaleDiff / canvasScale);

          setCanvasScale(newScale);
          setCanvasOffset({ x: newOffsetX, y: newOffsetY });
        }
      }
    };

    canvasElement.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvasElement.removeEventListener('wheel', wheelHandler);
  }, [currentTool, canvasScale, canvasOffset]);

  // 캔버스 최대 영역 (15000x15000px, SVG와 동일)
  const CANVAS_BOUNDS = { width: 15000, height: 15000, offsetX: -5000, offsetY: -5000 };

  // 메모 블록이 경계를 벗어나지 않도록 제한하는 함수
  const constrainToBounds = (position: { x: number; y: number }, memoSize: { width: number; height: number }) => {
    const { width, height, offsetX, offsetY } = CANVAS_BOUNDS;
    const memoWidth = memoSize.width || 200;
    const memoHeight = memoSize.height || 95;
    
    return {
      x: Math.max(offsetX, Math.min(position.x, offsetX + width - memoWidth)),
      y: Math.max(offsetY, Math.min(position.y, offsetY + height - memoHeight))
    };
  };

  // 경계 체크를 포함한 메모 위치 변경 핸들러
  const handleMemoPositionChange = (memoId: string, position: { x: number; y: number }) => {
    const memo = currentPage?.memos.find(m => m.id === memoId);
    if (memo) {
      const constrainedPosition = constrainToBounds(position, memo.size || { width: 200, height: 95 });
      onMemoPositionChange(memoId, constrainedPosition);
    } else {
      onMemoPositionChange(memoId, position);
    }
  };

  const getConnectionPoints = (memo: any) => {
    // 실제 메모 블록의 크기를 가져오기 (동적 크기 반영)
    const width = memo.size?.width || 200;
    const height = memo.size?.height || 95;
    
    // SVG가 overflow:visible이므로 오프셋 없이 원본 좌표 사용
    const points = {
      top: { 
        x: memo.position.x + width / 2,  // 가로 중앙
        y: memo.position.y  // 메모 블록 상단 경계
      },
      bottom: { 
        x: memo.position.x + width / 2,  // 가로 중앙
        y: memo.position.y + height  // 메모 블록 하단 경계
      },
      left: { 
        x: memo.position.x,  // 메모 블록 좌측 경계
        y: memo.position.y + height / 2  // 세로 중앙
      },
      right: { 
        x: memo.position.x + width,  // 메모 블록 우측 경계
        y: memo.position.y + height / 2  // 세로 중앙
      }
    };
    
    
    return points;
  };

  const renderConnectionLines = () => {
    if (!currentPage) return null;
    
    const lines: any[] = [];
    
    // 기존 연결선들
    currentPage.memos.forEach(memo => {
      memo.connections.forEach(connId => {
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        if (!connectedMemo || memo.id >= connId) return;
        
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

    // 카테고리 연결선들 (카테고리끼리만)
    (currentPage.categories || []).forEach(category => {
      category.connections.forEach(connId => {
        // 연결된 대상이 카테고리인지 확인 (메모와의 연결은 제외)
        const connectedCategory = currentPage.categories?.find(c => c.id === connId);

        if (!connectedCategory) return; // 카테고리끼리만 연결
        if (category.id >= connId) return; // 중복 연결선 방지

        // 카테고리의 연결점 계산
        const categoryWidth = category.size?.width || 200;
        const categoryHeight = category.size?.height || 80;
        const fromPoints = {
          top: {
            x: category.position.x + categoryWidth / 2,
            y: category.position.y
          },
          bottom: {
            x: category.position.x + categoryWidth / 2,
            y: category.position.y + categoryHeight
          },
          left: {
            x: category.position.x,
            y: category.position.y + categoryHeight / 2
          },
          right: {
            x: category.position.x + categoryWidth,
            y: category.position.y + categoryHeight / 2
          }
        };

        // 연결된 카테고리의 연결점 계산
        const connWidth = connectedCategory.size?.width || 200;
        const connHeight = connectedCategory.size?.height || 80;
        const toPoints = {
          top: {
            x: connectedCategory.position.x + connWidth / 2,
            y: connectedCategory.position.y
          },
          bottom: {
            x: connectedCategory.position.x + connWidth / 2,
            y: connectedCategory.position.y + connHeight
          },
          left: {
            x: connectedCategory.position.x,
            y: connectedCategory.position.y + connHeight / 2
          },
          right: {
            x: connectedCategory.position.x + connWidth,
            y: connectedCategory.position.y + connHeight / 2
          }
        };

        // 최적 연결점 선택
        const centerFrom = {
          x: category.position.x + categoryWidth / 2,
          y: category.position.y + categoryHeight / 2
        };
        const centerTo = {
          x: connectedCategory.position.x + connWidth / 2,
          y: connectedCategory.position.y + connHeight / 2
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
            {/* 실제 보이는 연결선 (카테고리는 주황색으로) */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isDisconnectMode ? "#ef4444" : "#ff9800"}
              strokeWidth={isDisconnectMode ? "4" : "2"}
              style={{
                strokeDasharray: isDisconnectMode ? '5,5' : '8,4',
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
      } else if (connectingCategory) {
        const categoryWidth = connectingCategory.size?.width || 200;
        const categoryHeight = connectingCategory.size?.height || 40;

        const fromPoints = {
          top: {
            x: connectingCategory.position.x + categoryWidth / 2,
            y: connectingCategory.position.y
          },
          bottom: {
            x: connectingCategory.position.x + categoryWidth / 2,
            y: connectingCategory.position.y + categoryHeight
          },
          left: {
            x: connectingCategory.position.x,
            y: connectingCategory.position.y + categoryHeight / 2
          },
          right: {
            x: connectingCategory.position.x + categoryWidth,
            y: connectingCategory.position.y + categoryHeight / 2
          }
        };

        // 카테고리 중심점 계산
        const centerFrom = {
          x: connectingCategory.position.x + categoryWidth / 2,
          y: connectingCategory.position.y + categoryHeight / 2
        };

        const dx = dragLineEnd.x - centerFrom.x;
        const dy = dragLineEnd.y - centerFrom.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
        } else {
          fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
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
  };

  // 카테고리 영역 색상 생성 (카테고리 ID 기반)
  const getCategoryAreaColor = (categoryId: string): string => {
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
  };


  // 카테고리 영역 계산 wrapper - utils 함수 사용 + 색상 추가
  const calculateCategoryAreaWithColor = React.useCallback((category: CategoryBlock, visited: Set<string> = new Set()) => {
    if (!currentPage) return null;

    const area = calculateCategoryArea(category, currentPage, visited);
    if (!area) return null;

    return {
      ...area,
      color: getCategoryAreaColor(category.id)
    };
  }, [currentPage, areaUpdateTrigger]);

  // 단일 카테고리 영역 렌더링 (재귀적으로 하위 카테고리도 포함)
  const renderSingleCategoryArea = (category: CategoryBlock): React.ReactNode[] => {
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
    } else if (isDraggingMemo && isShiftPressed && shiftDragAreaCache.current[category.id]) {
      // Shift + 메모 드래그: 캐시된 영역 사용 (영역 크기 고정)
      area = shiftDragAreaCache.current[category.id];
    } else {
      // 캐시된 영역이 없으면 동적 계산
      area = calculateCategoryAreaWithColor(category);

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

      // Shift 드래그 중이면 계산된 영역을 캐시에 저장
      if (isDraggingMemo && isShiftPressed) {
        shiftDragAreaCache.current[category.id] = area;
      }
    }

    // 하위 아이템이 있으면 항상 카테고리 라벨 표시 (펼침/접기 상관없이)
    const childMemos = currentPage?.memos.filter(memo => memo.parentId === category.id) || [];
    const childCategories = currentPage?.categories?.filter(cat => cat.parentId === category.id) || [];
    const hasChildren = childMemos.length > 0 || childCategories.length > 0;

    // 확장 가능한 영역 배경 (메모-카테고리 변환용)
    // 하위 카테고리인 경우: 자식이 없어도 항상 영역 표시 (부모 안에서 태그형 영역으로)
    // 최상위 카테고리인 경우: 자식이 있고 펼쳐졌을 때만 영역 표시
    const isChildCategory = !!category.parentId;
    const shouldShowArea = isChildCategory
      ? category.isExpanded  // 하위 카테고리는 펼쳐졌을 때만
      : (hasChildren && category.isExpanded); // 최상위는 자식 있고 펼쳐졌을 때

    if (area && shouldShowArea) {
      areas.push(
        <div
          key={`area-${category.id}`}
          style={{
            position: 'absolute',
            left: `${area.x}px`,
            top: `${area.y}px`,
            width: `${area.width}px`,
            height: `${area.height}px`,
            backgroundColor: area.color,
            border: '2px dashed rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            pointerEvents: 'auto',
            zIndex: -1,
            transition: 'all 0.1s ease'
          }}
          onDrop={(e) => handleDropOnCategoryArea(e, category.id)}
          onDragOver={handleCategoryAreaDragOver}
        />
      );
    }


    // 카테고리 이름 라벨은 항상 표시 (접어도 보임) - 마우스 드래그 사용
    // 하위 카테고리는 항상 라벨 표시, 최상위 카테고리는 자식 있을 때만
    if (hasChildren || isChildCategory) {
      areas.push(
        <div
          key={`label-${category.id}`}
          draggable={false}
          style={{
            position: 'absolute',
            top: `${area?.y || category.position.y}px`,
            left: `${area?.x || category.position.x}px`,
            backgroundColor: '#8b5cf6',
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
            zIndex: 10
          }}
          onClick={() => onCategorySelect(category.id)}
          onDoubleClick={() => {
            // 더블클릭 시 편집 모드로 전환하는 함수 호출
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              // 카테고리 라벨 드래그를 위한 임시 상태 설정

              // 드래그 시작 - 캐시가 없을 때만 영역 크기 저장
              setIsDraggingCategoryArea(category.id);
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
              } else {
              }

              // 카테고리 전체를 이동하는 마우스 드래그 구현
              let startX = e.clientX;
              let startY = e.clientY;
              const originalCategoryPosition = { x: category.position.x, y: category.position.y };

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = (moveEvent.clientX - startX) / canvasScale;
                const deltaY = (moveEvent.clientY - startY) / canvasScale;

                // 원래 카테고리 위치에서 delta만큼 이동
                const newPosition = {
                  x: originalCategoryPosition.x + deltaX,
                  y: originalCategoryPosition.y + deltaY
                };

                // 카테고리 위치 업데이트 (누적이 아닌 절대 위치)
                onCategoryPositionChange(category.id, newPosition);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // 드래그 종료 - 캐시 제거
                setIsDraggingCategoryArea(null);
                setDraggedCategoryAreas(prev => {
                  const newAreas = { ...prev };
                  delete newAreas[category.id];
                  return newAreas;
                });
                onClearCategoryCache?.(category.id);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
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
    }

    // 하위 카테고리들의 영역도 재귀적으로 렌더링
    if (currentPage?.categories) {
      const childCategories = currentPage.categories.filter(cat => cat.parentId === category.id);
      childCategories.forEach(childCategory => {
        areas.push(...renderSingleCategoryArea(childCategory));
      });
    }

    return areas;
  };

  // 카테고리 영역 렌더링
  const renderCategoryAreas = () => {
    if (!currentPage?.categories) return null;

    const allAreas: React.ReactNode[] = [];

    // 최상위 카테고리들부터 시작해서 재귀적으로 모든 영역 렌더링
    const topLevelCategories = currentPage.categories.filter(category => !category.parentId);
    topLevelCategories.forEach(category => {
      allAreas.push(...renderSingleCategoryArea(category));
    });

    return allAreas;
  };

  // 카테고리와 하위 아이템들을 재귀적으로 렌더링하는 함수
  const renderCategoryWithChildren = (category: CategoryBlock): React.ReactNode => {
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
            onDetectCategoryOnDrop={onDetectCategoryOnDrop}
            isConnecting={isConnecting}
            connectingFromId={connectingFromId}
            onStartConnection={onStartConnection}
            onConnectMemos={onConnectMemos}
            canvasScale={canvasScale}
            canvasOffset={canvasOffset}
            activeImportanceFilters={activeImportanceFilters}
            showGeneralContent={showGeneralContent}
            onDragStart={onMemoDragStart}
            onDragEnd={onMemoDragEnd}
            currentPage={currentPage}
            isDraggingAnyMemo={isDraggingMemo}
            isShiftPressed={isShiftPressed}
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

    return (
      <>
        {/* 하위 아이템이 없을 때만 CategoryBlock 렌더링, 있으면 라벨만 표시 */}
        {!hasChildren && (
          <CategoryBlockComponent
            key={category.id}
            category={category}
            hasChildren={hasChildren}
            isSelected={selectedCategoryId === category.id || selectedCategoryIds.includes(category.id)}
            isConnecting={isConnecting}
            isDisconnectMode={isDisconnectMode}
            connectingFromId={connectingFromId}
            onUpdate={onCategoryUpdate}
            onDelete={onDeleteCategory}
            onToggleExpanded={onCategoryToggleExpanded}
            onClick={onCategorySelect}
            onStartConnection={onStartConnection}
            onConnectItems={onConnectMemos}
            onRemoveConnection={onRemoveConnection}
            onPositionChange={(categoryId, position) => {
              // 첫 번째 위치 변경 시 드래그 시작으로 간주하고 영역 캐시
              if (!draggedCategoryAreas[categoryId]) {
                handleCategoryPositionStart(categoryId);
              }
              onCategoryPositionChange(categoryId, position);
            }}
            onPositionDragEnd={handleCategoryPositionEnd}
            onSizeChange={onCategorySizeChange}
            onMoveToCategory={onMoveToCategory}
            canvasScale={canvasScale}
            canvasOffset={canvasOffset}
            onDragStart={handleCategoryDragStart}
            onDragEnd={handleCategoryDragEnd}
            onDrop={(e) => handleDropOnCategory(e, category.id)}
            onDragOver={handleCategoryDragOver}
            isMemoBeingDragged={isDraggingMemo}
          >
            {childrenElements}
          </CategoryBlockComponent>
        )}
        {/* 하위 메모와 카테고리 렌더링 */}
        {childrenElements}
      </>
    );
  };

  // 카테고리 위치 변경 시작 (드래그 시작)
  const handleCategoryPositionStart = (categoryId: string) => {
    const category = currentPage?.categories?.find(cat => cat.id === categoryId);
    if (category) {
      // 캐시가 없을 때만 새로 계산 (있으면 기존 캐시 유지)
      if (!draggedCategoryAreas[categoryId]) {
        const currentArea = calculateCategoryAreaWithColor(category);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: category.position.x, y: category.position.y }
            }
          }));
        }
      } else {
      }
    }
  };

  // 카테고리 위치 변경 종료 (드래그 종료)
  const handleCategoryPositionEnd = (categoryId: string) => {

    // 드래그 종료 시 캐시 제거 (메모 위치에 따라 자연스럽게 크기 조정)
    setDraggedCategoryAreas(prev => {
      const newAreas = { ...prev };
      delete newAreas[categoryId];
      return newAreas;
    });

    // App의 캐시도 제거
    onCategoryPositionDragEnd?.(categoryId);
  };

  // 기존 카테고리 드래그 핸들러들 (실제로는 사용되지 않음 - 마우스 이벤트로 처리)
  const handleCategoryDragStart = (e: React.DragEvent) => {
    onCategoryDragStart?.();
  };

  const handleCategoryDragEnd = (e: React.DragEvent) => {
    onCategoryDragEnd?.();
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnCategory = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('드롭 처리 중 오류:', error);
    }
  };

  // 카테고리 영역 드래그 오버 핸들러
  const handleCategoryAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 영역에 추가적인 드래그 오버 효과를 줄 수 있음 (현재는 기본)
  };

  // 카테고리 영역에 드롭 핸들러
  const handleDropOnCategoryArea = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

      if (dragData.type === 'memo' || dragData.type === 'category') {
        onMoveToCategory(dragData.id, categoryId);

        // 메모를 카테고리 영역에 추가한 후 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
        if (categoryId) {
          setDraggedCategoryAreas(prev => {
            const newAreas = { ...prev };
            delete newAreas[categoryId];
            return newAreas;
          });
        }
      }
    } catch (error) {
      console.error('카테고리 영역 드롭 처리 중 오류:', error);
    }
  };


  // 전역 드래그 선택을 위한 상태
  const [globalDragSelecting, setGlobalDragSelecting] = React.useState(false);
  const [globalDragStart, setGlobalDragStart] = React.useState({ x: 0, y: 0 });
  const [globalDragWithShift, setGlobalDragWithShift] = React.useState(false);
  const [dragThresholdMet, setDragThresholdMet] = React.useState(false);
  const [justFinishedDragSelection, setJustFinishedDragSelection] = React.useState(false);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {

    const target = e.target as Element;
    
    // 스페이스바가 눌린 상태에서는 항상 팬 모드 (메모 블록 위에서도)
    if (isSpacePressed && !isConnecting) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - canvasOffset.x,
        y: e.clientY - canvasOffset.y
      });
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // 캔버스 배경 영역에서만 팬 도구 활성화
    const isCanvasBackground = target.hasAttribute('data-canvas') ||
                              target.tagName === 'svg' ||
                              target.tagName === 'line' ||
                              (target.tagName === 'DIV' &&
                               !target.closest('[data-memo-block="true"]') &&
                               !target.closest('[data-category-block="true"]') &&
                               !target.closest('button'));
    
    if (isCanvasBackground && !isConnecting) {
      if (currentTool === 'pan') {
        setIsPanning(true);
        setPanStart({
          x: e.clientX - canvasOffset.x,
          y: e.clientY - canvasOffset.y
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    
    // 선택 도구이고 연결 모드가 아닐 때 전역 드래그 선택 시작 준비 (캔버스 배경에서만)
    if (currentTool === 'select' && !isConnecting && !isPanning && isCanvasBackground) {
      setGlobalDragSelecting(true);
      setGlobalDragStart({ x: e.clientX, y: e.clientY });
      setGlobalDragWithShift(e.shiftKey);
      setDragThresholdMet(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    
    // Alt + 휠 또는 줌 도구 선택 시 확대/축소
    if (e.altKey || currentTool === 'zoom') {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // 줌 델타 계산 (휠 방향에 따라)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.01, Math.min(5, canvasScale * zoomFactor));
      
      if (newScale !== canvasScale) {
        // 마우스 위치를 기준으로 줌
        const scaleDiff = newScale - canvasScale;
        const newOffsetX = canvasOffset.x - (mouseX - canvasOffset.x) * (scaleDiff / canvasScale);
        const newOffsetY = canvasOffset.y - (mouseY - canvasOffset.y) * (scaleDiff / canvasScale);
        
        
        setCanvasScale(newScale);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isConnecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      // 화면 좌표를 원본 좌표로 변환 (SVG가 동일한 transform을 사용하므로)
      const mouseX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
      const mouseY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
      onUpdateDragLine({ x: mouseX, y: mouseY });
    }
    
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setCanvasOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Canvas 전체에서 카테고리 라벨 드롭 처리
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (dragData.type === 'category') {
        // 드롭 위치를 캔버스 좌표로 변환
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
        const y = (e.clientY - rect.top - canvasOffset.y) / canvasScale;

        onCategoryPositionChange(dragData.id, { x, y });

        // Shift 드래그면 카테고리-카테고리 종속 감지
        if (onDetectCategoryDropForCategory) {
          onDetectCategoryDropForCategory(dragData.id, { x, y });
        }
      }
    } catch (error) {
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  React.useEffect(() => {
    if (isPanning) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const newOffset = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        };
        setCanvasOffset(newOffset);
      };

      const handleGlobalMouseUp = () => {
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
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('blur', handleBlur);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [isPanning, panStart]);

  // 전역 드래그 선택을 위한 이벤트 리스너
  React.useEffect(() => {
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
  }, [globalDragSelecting, globalDragStart, isDragSelecting, dragThresholdMet, canvasOffset, canvasScale, globalDragWithShift, onDragSelectStart, onDragSelectMove, onDragSelectEnd]);

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        setIsSpacePressed(true);
        setCurrentTool('pan');
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && !isAltPressed) {
        setIsAltPressed(true);
        setCurrentTool('zoom');
      }
      if (e.code === 'Escape') {
        // 모든 선택 해제
        onMemoSelect('', false); // 빈 문자열로 호출해서 선택 해제
        // 모든 드래그 상태 리셋
        setIsPanning(false);
        if (isConnecting) {
          onCancelConnection();
        }
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        setIsSpacePressed(false);
        // Alt가 눌려있으면 zoom, 아니면 baseTool로
        if (isAltPressed) {
          setCurrentTool('zoom');
        } else {
          setCurrentTool(baseTool);
        }
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && isAltPressed) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsAltPressed(false);
        // Space가 눌려있으면 pan, 아니면 baseTool로
        if (isSpacePressed) {
          setCurrentTool('pan');
        } else {
          setCurrentTool(baseTool);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      document.removeEventListener('keyup', handleKeyUp, { capture: true } as any);
    };
  }, [baseTool, isSpacePressed, isAltPressed, isMouseOverCanvas]);

  return (
    <div 
      data-canvas="true"
      tabIndex={0}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#ffffff',
        cursor: isPanning ? 'grabbing' : 
                (isSpacePressed || currentTool === 'pan') ? 'grab' :
                currentTool === 'zoom' ? 'crosshair' : 'default'
      }}
      onClick={(e) => {
        const target = e.target as Element;
        const isCanvasBackground = target.hasAttribute('data-canvas') ||
                                  target.tagName === 'svg' ||
                                  (target.tagName === 'DIV' && !target.closest('[data-memo-block="true"]') && !target.closest('button'));
        
        if (isCanvasBackground) {
          if (isConnecting) {
            onCancelConnection();
          } else if (!isDragSelecting && !isSpacePressed && currentTool !== 'pan' && !justFinishedDragSelection) {
            // 캔버스 배경 클릭 시 모든 선택 해제 (드래그 선택 중이 아니고, 방금 드래그 선택을 끝내지 않았고, 스페이스바가 안 눌려있고, 팬 모드가 아닐 때만)
            onMemoSelect('', false);
            onCategorySelect('', false);
          }
        }
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      id="main-canvas"
      onMouseEnter={() => setIsMouseOverCanvas(true)}
      onMouseLeave={() => setIsMouseOverCanvas(false)}
      onWheel={handleWheel}
      onDrop={handleCanvasDrop}
      onDragOver={handleCanvasDragOver}
    >
      {/* 메모 블록들과 연결선 */}
      <div style={{
        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        pointerEvents: 'auto'
      }}>
        {/* 카테고리 영역들 */}
        {renderCategoryAreas()}

        {/* SVG로 연결선 그리기 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: isDisconnectMode ? 'auto' : 'none',
            zIndex: isDisconnectMode ? 1 : 0
          }}
        >
          <defs>
            <style>
              {`
                @keyframes dash {
                  to {
                    stroke-dashoffset: -24;
                  }
                }
              `}
            </style>
          </defs>
          {renderConnectionLines()}
        </svg>

        {currentPage?.memos.filter(memo => {
          // parentId가 없으면 항상 표시
          if (!memo.parentId) return true;

          // parentId가 있으면 해당 카테고리가 펼쳐져 있을 때만 표시
          const parentCategory = currentPage?.categories?.find(cat => cat.id === memo.parentId);
          return parentCategory?.isExpanded || false;
        }).map(memo => (
          <MemoBlock
            key={memo.id}
            memo={memo}
            isSelected={selectedMemoId === memo.id || selectedMemoIds.includes(memo.id)}
            isDragHovered={dragHoveredMemoIds.includes(memo.id)}
            onClick={(isShiftClick?: boolean) => onMemoSelect(memo.id, isShiftClick)}
            onPositionChange={onMemoPositionChange}
            onSizeChange={onMemoSizeChange}
            onDisplaySizeChange={onMemoDisplaySizeChange}
            onDetectCategoryOnDrop={onDetectCategoryOnDrop}
            isConnecting={isConnecting}
            connectingFromId={connectingFromId}
            onStartConnection={onStartConnection}
            onConnectMemos={onConnectMemos}
            canvasScale={canvasScale}
            canvasOffset={canvasOffset}
            activeImportanceFilters={activeImportanceFilters}
            showGeneralContent={showGeneralContent}
            onDragStart={onMemoDragStart}
            onDragEnd={onMemoDragEnd}
            currentPage={currentPage}
            isDraggingAnyMemo={isDraggingMemo}
            isShiftPressed={isShiftPressed}
          />
        ))}

        {/* 카테고리 블록들 렌더링 */}
        {currentPage?.categories?.filter(category => !category.parentId).map(category =>
          renderCategoryWithChildren(category)
        )}

        {/* 드래그 선택 영역 - 메모 블록과 같은 transform 공간 안에 위치 */}
        {isDragSelecting && dragSelectStart && dragSelectEnd && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(dragSelectStart.x, dragSelectEnd.x)}px`,
              top: `${Math.min(dragSelectStart.y, dragSelectEnd.y)}px`,
              width: `${Math.abs(dragSelectEnd.x - dragSelectStart.x)}px`,
              height: `${Math.abs(dragSelectEnd.y - dragSelectStart.y)}px`,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.6)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </div>


      {/* 하단 도구 버튼들 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        zIndex: 1000
      }}>
        {/* 도구 버튼들 */}
        <button
          onClick={() => {
            setCurrentTool('select');
            setBaseTool('select');
          }}
          style={{
            backgroundColor: currentTool === 'select' ? '#8b5cf6' : 'white',
            color: currentTool === 'select' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
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
          style={{
            backgroundColor: currentTool === 'pan' ? '#8b5cf6' : 'white',
            color: currentTool === 'pan' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
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
          style={{
            backgroundColor: currentTool === 'zoom' ? '#8b5cf6' : 'white',
            color: currentTool === 'zoom' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
          title="확대/축소 도구 (Alt + Scroll)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        
        <div style={{ width: '1px', height: '44px', backgroundColor: '#e5e7eb', margin: '0 4px' }}></div>
        
        {/* 기능 버튼들 */}
        <button
          onClick={() => {
            const canvas = document.querySelector('[data-canvas="true"]') as HTMLElement;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const centerX = (rect.width / 2 - canvasOffset.x) / canvasScale;
              const centerY = (rect.height / 2 - canvasOffset.y) / canvasScale;
              onAddMemo({ x: centerX - 100, y: centerY - 50 });
            } else {
              onAddMemo();
            }
          }}
          style={{
            backgroundColor: 'white',
            color: '#8b5cf6',
            border: '2px solid #8b5cf6',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          + 블록 생성
        </button>
        <button
          onClick={() => {
            const canvas = document.querySelector('[data-canvas="true"]') as HTMLElement;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const centerX = (rect.width / 2 - canvasOffset.x) / canvasScale;
              const centerY = (rect.height / 2 - canvasOffset.y) / canvasScale;
              onAddCategory({ x: centerX - 100, y: centerY - 20 });
            } else {
              onAddCategory();
            }
          }}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          카테고리 생성
        </button>
        <button
          onClick={onDisconnectMemo}
          style={{
            backgroundColor: isDisconnectMode ? '#fee2e2' : 'white',
            color: isDisconnectMode ? '#dc2626' : '#6b7280',
            border: `1px solid ${isDisconnectMode ? '#fca5a5' : '#d1d5db'}`,
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          {isDisconnectMode ? '연결 해제 모드' : '연결 해제'}
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={!selectedMemoId && !selectedCategoryId && selectedMemoIds.length === 0 && selectedCategoryIds.length === 0}
          style={{
            backgroundColor: 'white',
            color: (selectedMemoId || selectedCategoryId || selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) ? '#ef4444' : '#9ca3af',
            border: '1px solid #d1d5db',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: (selectedMemoId || selectedCategoryId || selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          삭제 {(selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) && `(${selectedMemoIds.length + selectedCategoryIds.length})`}
        </button>
      </div>

      {/* Canvas Undo/Redo Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        display: 'flex',
        gap: '8px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(4px)'
      }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
          style={{
            padding: '6px 12px',
            backgroundColor: canUndo ? '#3b82f6' : '#e5e7eb',
            color: canUndo ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ↶ 실행취소
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Shift+Z)"
          style={{
            padding: '6px 12px',
            backgroundColor: canRedo ? '#3b82f6' : '#e5e7eb',
            color: canRedo ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ↷ 다시실행
        </button>
      </div>

      {/* 중요도 필터 UI */}
      <ImportanceFilter
        activeFilters={activeImportanceFilters}
        onToggleFilter={onToggleImportanceFilter}
        showGeneralContent={showGeneralContent}
        onToggleGeneralContent={onToggleGeneralContent}
      />
    </div>
  );
};

export default Canvas;