// ========================================
// 타이밍 관련 상수
// ========================================

/**
 * 롱프레스 인식 시간 (ms)
 * 0.5초 동안 누르고 있으면 롱프레스로 인식하여 Shift+드래그 모드 활성화
 */
export const LONG_PRESS_DURATION = 500;

/**
 * 드래그 시작 임계값 (px)
 * 이 거리 이상 움직여야 드래그로 인식
 */
export const DRAG_THRESHOLD = 5;

/**
 * 더블탭 인식 시간 (ms)
 * 이 시간 이내에 두 번 탭하면 더블탭으로 인식
 */
export const DOUBLE_TAP_DELAY = 300;

/**
 * 자동 저장 디바운스 시간 (ms)
 */
export const AUTO_SAVE_DEBOUNCE = 300;

/**
 * 스크롤 디바운스 시간 (ms)
 */
export const SCROLL_DEBOUNCE = 150;

/**
 * 위치 업데이트 throttle 시간 (ms)
 * 드래그 중 위치 업데이트 빈도 조절
 */
export const POSITION_UPDATE_THROTTLE = 50;

// ========================================
// 반응형 브레이크포인트
// ========================================

/**
 * 모바일 최대 너비 (px)
 * 768px 이하는 모바일 레이아웃
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * 태블릿 최대 너비 (px)
 * 1024px 이하는 태블릿 레이아웃
 */
export const TABLET_BREAKPOINT = 1024;

// ========================================
// UI 관련 상수
// ========================================

/**
 * 최소 터치 영역 크기 (px)
 * 모바일 접근성을 위한 최소 터치 타겟 크기
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * 기본 애니메이션 지속 시간 (ms)
 */
export const DEFAULT_ANIMATION_DURATION = 200;

// ========================================
// 메모 및 카테고리 기본 크기 상수
// ========================================

export const DEFAULT_MEMO_WIDTH = 200;
export const DEFAULT_MEMO_HEIGHT = 95;
export const DEFAULT_CATEGORY_WIDTH = 200;
export const DEFAULT_CATEGORY_HEIGHT = 95;

// 블록 크기 헬퍼 함수
export function getMemoSize(size?: { width?: number; height?: number }) {
  return {
    width: size?.width || DEFAULT_MEMO_WIDTH,
    height: size?.height || DEFAULT_MEMO_HEIGHT
  };
}

export function getCategorySize(size?: { width?: number; height?: number }) {
  return {
    width: size?.width || DEFAULT_CATEGORY_WIDTH,
    height: size?.height || DEFAULT_CATEGORY_HEIGHT
  };
}

// 경계 박스 계산
export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function getBoundingBox(
  position: { x: number; y: number },
  size: { width: number; height: number }
): BoundingBox {
  return {
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height
  };
}

// 사각형 교집합 확인
export function checkRectIntersection(box1: BoundingBox, box2: BoundingBox): boolean {
  return box1.left < box2.right &&
         box1.right > box2.left &&
         box1.top < box2.bottom &&
         box1.bottom > box2.top;
}
