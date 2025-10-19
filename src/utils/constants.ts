// 메모 및 카테고리 기본 크기 상수
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
