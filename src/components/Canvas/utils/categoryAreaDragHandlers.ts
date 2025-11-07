import { CategoryBlock, Page } from '../../../types';

/**
 * categoryAreaDragHandlers
 *
 * 카테고리 영역 드래그 핸들러 유틸리티 함수들
 *
 * **제공하는 기능:**
 * - 카테고리 영역 드래그 시작 핸들러 생성
 * - Shift 모드 전환 및 캐시 관리
 * - 드래그 중 위치 업데이트
 * - 드래그 종료 및 충돌 검사
 */

export interface CreateCategoryAreaDragHandlerParams {
  category: CategoryBlock;
  isConnecting: boolean;
  isShiftPressed?: boolean;
  canvasScale: number;
  canvasOffset?: { x: number; y: number };
  currentPage?: Page;
  area: any;
  draggedCategoryAreas: {
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  };
  shiftDragAreaCache: React.MutableRefObject<{ [categoryId: string]: any }>;
  calculateCategoryAreaWithColor: (category: CategoryBlock, visited?: Set<string>, excludeCategoryId?: string) => any;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  setIsDraggingCategoryArea: (value: string | null) => void;
  setShiftDragInfo: (value: { categoryId: string; offset: { x: number; y: number } } | null) => void;
  setDraggedCategoryAreas: React.Dispatch<React.SetStateAction<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>>;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }) => void;
}

/**
 * 카테고리 영역 드래그 핸들러 생성 (마우스용)
 */
export const createCategoryAreaDragHandler = (params: CreateCategoryAreaDragHandlerParams) => {
  const {
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
  } = params;

  return (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting) {
      // 영역 드래그 시작 - 카테고리 전체를 이동
      e.preventDefault();
      e.stopPropagation();

      let startX = e.clientX;
      let startY = e.clientY;
      const originalCategoryPosition = { x: category.position.x, y: category.position.y };
      let hasMoved = false;
      let isDraggingArea = false; // 임계값 통과 전까지는 false
      let isShiftMode = isShiftPressed || false;
      const DRAG_THRESHOLD = 5; // 드래그 임계값 (픽셀)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // 임계값 확인
        if (!isDraggingArea) {
          const distance = Math.sqrt(
            Math.pow(moveEvent.clientX - startX, 2) +
            Math.pow(moveEvent.clientY - startY, 2)
          );

          // 임계값을 넘으면 드래그 시작
          if (distance >= DRAG_THRESHOLD) {
            isDraggingArea = true;
            hasMoved = true;

            // 드래그 시작 시 카테고리 선택 및 초기화
            onCategorySelect(category.id);
            setIsDraggingCategoryArea(category.id);

            // 초기 Shift 상태에 따라 캐시 설정
            if (isShiftMode) {
              if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
                currentPage.categories?.forEach(cat => {
                  if (cat.isExpanded) {
                    // 드래그 중인 카테고리를 제외하고 영역 계산
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
        }

        if (!isDraggingArea) return; // 드래그 시작 전까지 위치 업데이트 안함

        hasMoved = true;
        const currentShiftState = moveEvent.shiftKey;

        if (currentShiftState !== isShiftMode) {
          isShiftMode = currentShiftState;

          if (isShiftMode) {
            if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
              currentPage.categories?.forEach(cat => {
                if (cat.isExpanded) {
                  // 드래그 중인 카테고리를 제외하고 영역 계산
                  const catArea = calculateCategoryAreaWithColor(cat, new Set(), category.id);
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
        // 드래그가 발생하지 않았을 때: 클릭으로 처리 (카테고리 선택)
        if (!hasMoved && !isDraggingArea) {
          onCategorySelect(category.id);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('mouseleave', handleMouseLeave);
          return;
        }

        if (!isDraggingArea) return; // 이미 종료된 경우 중복 실행 방지
        isDraggingArea = false; // 즉시 드래그 종료 플래그 설정

        // upEvent.shiftKey로 실시간 Shift 상태 확인
        const wasShiftPressed = upEvent?.shiftKey || isShiftMode;

        console.log('[Area handleMouseUp] 호출됨', {
          categoryId: category.id,
          hasMoved,
          isShiftMode,
          upEventShiftKey: upEvent?.shiftKey,
          wasShiftPressed
        });

        setIsDraggingCategoryArea(null);
        setShiftDragInfo(null);

        if (hasMoved) {
          const finalPosition = {
            x: originalCategoryPosition.x + ((upEvent?.clientX || (window.event as MouseEvent).clientX) - startX) / canvasScale,
            y: originalCategoryPosition.y + ((upEvent?.clientY || (window.event as MouseEvent).clientY) - startY) / canvasScale
          };

          // 마우스 포인터의 실제 위치 (캔버스 좌표계)
          const canvasElement = document.getElementById('main-canvas');
          if (canvasElement && canvasOffset) {
            const rect = canvasElement.getBoundingClientRect();
            const clientX = upEvent?.clientX || (window.event as MouseEvent).clientX;
            const clientY = upEvent?.clientY || (window.event as MouseEvent).clientY;

            // 캔버스 좌표계로 변환: (클라이언트 좌표 - 캔버스 시작점 - 캔버스 오프셋) / 스케일
            const mouseX = (clientX - rect.left - canvasOffset.x) / canvasScale;
            const mouseY = (clientY - rect.top - canvasOffset.y) / canvasScale;

            const mousePointerPosition = { x: mouseX, y: mouseY };

            onCategoryPositionDragEnd?.(category.id, finalPosition);

            if (wasShiftPressed) {
              console.log('[Area handleMouseUp] Shift 눌림 - detectCategoryDropForCategory 호출');
              // 마우스 포인터 위치로 전달 (점 충돌 검사용)
              onDetectCategoryDropForCategory?.(category.id, mousePointerPosition);
            }
          } else {
            onCategoryPositionDragEnd?.(category.id, finalPosition);

            if (wasShiftPressed) {
              console.log('[Area handleMouseUp] Shift 눌림 - detectCategoryDropForCategory 호출 (fallback)');
              // fallback: 캔버스 요소를 찾지 못한 경우 finalPosition 사용
              onDetectCategoryDropForCategory?.(category.id, finalPosition);
            }
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
  };
};

/**
 * 카테고리 영역 터치 드래그 핸들러 생성 (모바일용)
 */
export const createCategoryAreaTouchHandler = (params: CreateCategoryAreaDragHandlerParams) => {
  const {
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
  } = params;

  return (e: React.TouchEvent) => {
    console.log('[CategoryArea TouchStart]', { categoryId: category.id, touches: e.touches.length });

    if (!isConnecting && e.touches.length === 1) {
      // 영역 터치 드래그 시작 - 카테고리 전체를 이동
      e.stopPropagation();

      console.log('[CategoryArea TouchStart] 드래그 준비 시작');

      const touch = e.touches[0];
      let startX = touch.clientX;
      let startY = touch.clientY;
      const originalCategoryPosition = { x: category.position.x, y: category.position.y };
      let hasMoved = false;
      let isDraggingArea = false; // 임계값 통과 전까지는 false
      let isShiftMode = isShiftPressed || false;
      const DRAG_THRESHOLD = 5; // 드래그 임계값 (픽셀)

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return;

        const touch = moveEvent.touches[0];
        const distance = Math.sqrt(
          Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2)
        );

        // 임계값을 넘으면 드래그 시작
        if (!isDraggingArea && distance >= DRAG_THRESHOLD) {
          isDraggingArea = true;
          hasMoved = true;
          console.log('[CategoryArea TouchMove] 드래그 시작 (임계값 통과)');

          // 드래그 시작 시 카테고리 선택 및 초기화
          onCategorySelect(category.id);
          setIsDraggingCategoryArea(category.id);

          // 초기 Shift 상태에 따라 캐시 설정
          if (isShiftMode) {
            if (currentPage && Object.keys(shiftDragAreaCache.current).length === 0) {
              currentPage.categories?.forEach(cat => {
                if (cat.isExpanded) {
                  // 드래그 중인 카테고리를 제외하고 영역 계산
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

        // 드래그 중일 때만 위치 업데이트
        if (!isDraggingArea) return;

        const deltaX = (touch.clientX - startX) / canvasScale;
        const deltaY = (touch.clientY - startY) / canvasScale;

        const newPosition = {
          x: originalCategoryPosition.x + deltaX,
          y: originalCategoryPosition.y + deltaY
        };

        console.log('[CategoryArea TouchMove] 위치 업데이트', { newPosition });

        onCategoryPositionChange(category.id, newPosition);

        if (isShiftMode) {
          setShiftDragInfo({
            categoryId: category.id,
            offset: { x: deltaX, y: deltaY }
          });
        } else {
          setShiftDragInfo(null);
        }

        moveEvent.preventDefault(); // 스크롤 방지
      };

      const handleTouchEnd = (upEvent?: TouchEvent) => {
        // 드래그가 발생하지 않았을 때: 탭으로 처리 (카테고리 선택)
        if (!hasMoved && !isDraggingArea) {
          onCategorySelect(category.id);
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
          document.removeEventListener('touchcancel', handleTouchEnd);
          return;
        }

        if (!isDraggingArea) return; // 이미 종료된 경우 중복 실행 방지
        isDraggingArea = false; // 즉시 드래그 종료 플래그 설정

        const wasShiftPressed = isShiftMode;

        setIsDraggingCategoryArea(null);
        setShiftDragInfo(null);

        if (hasMoved && upEvent?.changedTouches.length) {
          const touch = upEvent.changedTouches[0];
          const finalPosition = {
            x: originalCategoryPosition.x + (touch.clientX - startX) / canvasScale,
            y: originalCategoryPosition.y + (touch.clientY - startY) / canvasScale
          };

          // 터치 포인터의 실제 위치 (캔버스 좌표계)
          const canvasElement = document.getElementById('main-canvas');
          if (canvasElement && canvasOffset) {
            const rect = canvasElement.getBoundingClientRect();
            const clientX = touch.clientX;
            const clientY = touch.clientY;

            // 캔버스 좌표계로 변환: (클라이언트 좌표 - 캔버스 시작점 - 캔버스 오프셋) / 스케일
            const mouseX = (clientX - rect.left - canvasOffset.x) / canvasScale;
            const mouseY = (clientY - rect.top - canvasOffset.y) / canvasScale;

            const touchPointerPosition = { x: mouseX, y: mouseY };

            onCategoryPositionDragEnd?.(category.id, finalPosition);

            if (wasShiftPressed) {
              // 터치 포인터 위치로 전달 (점 충돌 검사용)
              onDetectCategoryDropForCategory?.(category.id, touchPointerPosition);
            }
          } else {
            onCategoryPositionDragEnd?.(category.id, finalPosition);

            if (wasShiftPressed) {
              // fallback: 캔버스 요소를 찾지 못한 경우 finalPosition 사용
              onDetectCategoryDropForCategory?.(category.id, finalPosition);
            }
          }
        }

        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }
  };
};
