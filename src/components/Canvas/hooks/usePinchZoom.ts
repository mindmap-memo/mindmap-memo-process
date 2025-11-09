import { useEffect, useRef } from 'react';

interface UsePinchZoomProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  canvasScale: number;
  setCanvasScale: (scale: number) => void;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  isMobile?: boolean;
}

/**
 * usePinchZoom
 *
 * 모바일 캔버스에서 두 손가락 핀치 제스처로 확대/축소하는 기능을 제공합니다.
 *
 * **기능:**
 * - 두 손가락 터치로 핀치 줌 (확대/축소)
 * - 줌 중심점을 터치 중심으로 설정하여 자연스러운 확대/축소
 * - 최소/최대 줌 제한 (0.1배 ~ 3배)
 * - 한 손가락 드래그와 충돌하지 않도록 설계
 *
 * @param canvasRef - Canvas 컨테이너 ref
 * @param canvasScale - 현재 캔버스 스케일
 * @param setCanvasScale - 캔버스 스케일 설정 함수
 * @param canvasOffset - 현재 캔버스 오프셋
 * @param setCanvasOffset - 캔버스 오프셋 설정 함수
 * @param isMobile - 모바일 여부 (모바일에서만 핀치 줌 활성화)
 */
export const usePinchZoom = ({
  canvasRef,
  canvasScale,
  setCanvasScale,
  canvasOffset,
  setCanvasOffset,
  isMobile = false
}: UsePinchZoomProps) => {
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const touchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef<boolean>(false);

  useEffect(() => {
    // 모바일이 아니면 핀치 줌 비활성화
    if (!isMobile || !canvasRef.current) return;

    const canvas = canvasRef.current;

    /**
     * 두 터치 포인트 사이의 거리 계산
     */
    const getDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * 두 터치 포인트의 중심점 계산
     */
    const getCenter = (touch1: Touch, touch2: Touch) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // 두 손가락 터치만 처리
      if (e.touches.length === 2) {
        e.preventDefault(); // 기본 브라우저 줌 방지
        isPinchingRef.current = true;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // 초기 거리와 스케일 저장
        initialDistanceRef.current = getDistance(touch1, touch2);
        initialScaleRef.current = canvasScale;

        // 터치 중심점 저장 (캔버스 좌표계)
        const center = getCenter(touch1, touch2);
        const rect = canvas.getBoundingClientRect();
        touchCenterRef.current = {
          x: center.x - rect.left,
          y: center.y - rect.top
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 두 손가락 터치만 처리
      if (e.touches.length === 2 && initialDistanceRef.current !== null) {
        e.preventDefault(); // 기본 브라우저 줌 방지

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // 현재 거리 계산
        const currentDistance = getDistance(touch1, touch2);

        // 스케일 변화 계산 (초기 거리 대비 현재 거리 비율)
        const scaleChange = currentDistance / initialDistanceRef.current;
        let newScale = initialScaleRef.current * scaleChange;

        // 스케일 제한 (0.1배 ~ 3배)
        newScale = Math.max(0.1, Math.min(3, newScale));

        // 터치 중심점을 기준으로 줌 (좌표 변환)
        if (touchCenterRef.current) {
          const rect = canvas.getBoundingClientRect();
          const center = getCenter(touch1, touch2);

          // 캔버스 좌표계에서의 터치 중심점
          const canvasCenterX = (touchCenterRef.current.x - canvasOffset.x) / canvasScale;
          const canvasCenterY = (touchCenterRef.current.y - canvasOffset.y) / canvasScale;

          // 새로운 스케일에서의 오프셋 계산
          const newOffsetX = touchCenterRef.current.x - canvasCenterX * newScale;
          const newOffsetY = touchCenterRef.current.y - canvasCenterY * newScale;

          setCanvasOffset({ x: newOffsetX, y: newOffsetY });
        }

        setCanvasScale(newScale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // 손가락을 떼면 초기화
      if (e.touches.length < 2) {
        initialDistanceRef.current = null;
        initialScaleRef.current = canvasScale;
        touchCenterRef.current = null;
        isPinchingRef.current = false;
      }
    };

    // 이벤트 리스너 등록 (passive: false로 preventDefault 가능하게)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [canvasRef, canvasScale, setCanvasScale, canvasOffset, setCanvasOffset, isMobile]);
};
