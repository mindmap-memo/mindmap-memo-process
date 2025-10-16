import { useState, useRef } from 'react';

/**
 * useCanvasState
 *
 * Canvas 컴포넌트의 로컬 상태를 관리하는 훅
 *
 * **관리하는 상태:**
 * - 패닝 상태 (isPanning, panStart)
 * - 캔버스 오프셋 및 스케일 (로컬 상태)
 * - 도구 선택 (currentTool, baseTool)
 * - 키보드 입력 (Space, Alt)
 * - 드래그 상태 (카테고리 영역 드래그, Shift 드래그 등)
 * - 컨텍스트 메뉴 및 모달
 *
 * @returns Canvas 로컬 상태 및 setter 함수들
 */
export const useCanvasState = () => {
  // ===== 패닝 상태 =====
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // ===== 캔버스 뷰포트 (로컬 상태, 외부에서 제공되지 않을 때 사용) =====
  const [localCanvasOffset, setLocalCanvasOffset] = useState({ x: 0, y: 0 });
  const [localCanvasScale, setLocalCanvasScale] = useState(1);

  // ===== 도구 선택 =====
  const [currentTool, setCurrentTool] = useState<'select' | 'pan' | 'zoom'>('select');
  const [baseTool, setBaseTool] = useState<'select' | 'pan' | 'zoom'>('select');

  // ===== 키보드 입력 =====
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  // ===== 마우스 상태 =====
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);

  // ===== 영역 업데이트 트리거 =====
  const [areaUpdateTrigger, setAreaUpdateTrigger] = useState(0);

  // ===== 카테고리 드래그 상태 =====
  const [draggedCategoryAreas, setDraggedCategoryAreas] = useState<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>({});

  const [isDraggingCategoryArea, setIsDraggingCategoryArea] = useState<string | null>(null);

  // ===== Shift 드래그 정보 =====
  const [shiftDragInfo, setShiftDragInfo] = useState<{
    categoryId: string;
    offset: { x: number; y: number };
  } | null>(null);

  // ===== 드래그 타겟 =====
  const [dragTargetCategoryId, setDragTargetCategoryId] = useState<string | null>(null);

  // ===== 컨텍스트 메뉴 및 모달 =====
  const [areaContextMenu, setAreaContextMenu] = useState<{
    x: number;
    y: number;
    categoryId: string;
  } | null>(null);

  const [showAreaQuickNavModal, setShowAreaQuickNavModal] = useState<{
    categoryId: string;
    categoryName: string;
  } | null>(null);

  // ===== 글로벌 드래그 선택 =====
  const [globalDragSelecting, setGlobalDragSelecting] = useState(false);
  const [globalDragStart, setGlobalDragStart] = useState({ x: 0, y: 0 });
  const [globalDragWithShift, setGlobalDragWithShift] = useState(false);
  const [dragThresholdMet, setDragThresholdMet] = useState(false);
  const [justFinishedDragSelection, setJustFinishedDragSelection] = useState(false);

  // ===== Refs =====
  const shiftDragAreaCache = useRef<{ [categoryId: string]: any }>({});
  const renderedCategoryAreas = useRef<{
    [categoryId: string]: { x: number; y: number; width: number; height: number };
  }>({});

  return {
    // 패닝
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,

    // 캔버스 뷰포트 (로컬)
    localCanvasOffset,
    setLocalCanvasOffset,
    localCanvasScale,
    setLocalCanvasScale,

    // 도구
    currentTool,
    setCurrentTool,
    baseTool,
    setBaseTool,

    // 키보드
    isSpacePressed,
    setIsSpacePressed,
    isAltPressed,
    setIsAltPressed,

    // 마우스
    isMouseOverCanvas,
    setIsMouseOverCanvas,

    // 영역 업데이트
    areaUpdateTrigger,
    setAreaUpdateTrigger,

    // 카테고리 드래그
    draggedCategoryAreas,
    setDraggedCategoryAreas,
    isDraggingCategoryArea,
    setIsDraggingCategoryArea,

    // Shift 드래그
    shiftDragInfo,
    setShiftDragInfo,

    // 드래그 타겟
    dragTargetCategoryId,
    setDragTargetCategoryId,

    // 컨텍스트 메뉴 및 모달
    areaContextMenu,
    setAreaContextMenu,
    showAreaQuickNavModal,
    setShowAreaQuickNavModal,

    // 글로벌 드래그 선택
    globalDragSelecting,
    setGlobalDragSelecting,
    globalDragStart,
    setGlobalDragStart,
    globalDragWithShift,
    setGlobalDragWithShift,
    dragThresholdMet,
    setDragThresholdMet,
    justFinishedDragSelection,
    setJustFinishedDragSelection,

    // Refs
    shiftDragAreaCache,
    renderedCategoryAreas
  };
};
