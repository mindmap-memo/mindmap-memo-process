import { useEffect } from 'react';
import { TutorialState, Page } from '../types';

/**
 * useTutorialValidation
 *
 * 튜토리얼 진행 조건 검증 로직을 관리하는 커스텀 훅입니다.
 * 사용자의 액션을 감지하여 validation 상태를 업데이트합니다.
 *
 * **감지하는 액션:**
 * - 캔버스 이동 (Pan)
 * - 캔버스 줌 (Zoom)
 * - 메모 생성 (Create)
 * - 메모 드래그 (Drag)
 *
 * @param props - tutorialState, validation setters, refs, 현재 상태들
 */

interface UseTutorialValidationProps {
  tutorialState: TutorialState;
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  pages: Page[];
  currentPageId: string;
  initialCanvasOffset: React.MutableRefObject<{ x: number; y: number }>;
  initialCanvasScale: React.MutableRefObject<number>;
  initialMemoCount: React.MutableRefObject<number>;
  initialMemoPositions: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  setCanvasPanned: React.Dispatch<React.SetStateAction<boolean>>;
  setCanvasZoomed: React.Dispatch<React.SetStateAction<boolean>>;
  setMemoCreated: React.Dispatch<React.SetStateAction<boolean>>;
  setMemoDragged: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useTutorialValidation = ({
  tutorialState,
  canvasOffset,
  canvasScale,
  pages,
  currentPageId,
  initialCanvasOffset,
  initialCanvasScale,
  initialMemoCount,
  initialMemoPositions,
  setCanvasPanned,
  setCanvasZoomed,
  setMemoCreated,
  setMemoDragged
}: UseTutorialValidationProps) => {
  // 캔버스 이동 감지 (2단계 - canvas-pan)
  useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 2) {
      const dx = Math.abs(canvasOffset.x - initialCanvasOffset.current.x);
      const dy = Math.abs(canvasOffset.y - initialCanvasOffset.current.y);
      if (dx > 50 || dy > 50) {
        setCanvasPanned(true);
      }
    }
  }, [canvasOffset, tutorialState.isActive, tutorialState.currentStep, initialCanvasOffset, setCanvasPanned]);

  // 캔버스 줌 감지 (3단계 - canvas-zoom)
  useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 3) {
      const scaleDiff = Math.abs(canvasScale - initialCanvasScale.current);
      if (scaleDiff > 0.1) {
        setCanvasZoomed(true);
      }
    }
  }, [canvasScale, tutorialState.isActive, tutorialState.currentStep, initialCanvasScale, setCanvasZoomed]);

  // 메모 생성 감지 (4단계 - add-memo)
  useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 4) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage && currentPage.memos.length > initialMemoCount.current) {
        setMemoCreated(true);
      }
    }
  }, [pages, currentPageId, tutorialState.isActive, tutorialState.currentStep, initialMemoCount, setMemoCreated]);

  // 메모 드래그 감지 (5단계 - memo-drag)
  useEffect(() => {
    if (tutorialState.isActive && tutorialState.currentStep === 5) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (!currentPage) return;

      // 메모 위치가 변경되었는지 확인
      for (const memo of currentPage.memos) {
        const initialPos = initialMemoPositions.current.get(memo.id);
        if (initialPos) {
          const dx = Math.abs(memo.position.x - initialPos.x);
          const dy = Math.abs(memo.position.y - initialPos.y);
          if (dx > 20 || dy > 20) {
            setMemoDragged(true);
            break;
          }
        }
      }
    }
  }, [pages, currentPageId, tutorialState.isActive, tutorialState.currentStep, initialMemoPositions, setMemoDragged]);
};
