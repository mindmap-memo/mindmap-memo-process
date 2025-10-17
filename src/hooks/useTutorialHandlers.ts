import { useCallback } from 'react';
import { TutorialState, Page } from '../types';

/**
 * useTutorialHandlers
 *
 * 인터랙티브 튜토리얼 관련 핸들러를 관리하는 커스텀 훅입니다.
 *
 * **관리하는 기능:**
 * - 튜토리얼 시작 (handleStartTutorial)
 * - 다음 단계로 진행 (handleTutorialNext)
 * - 튜토리얼 건너뛰기 (handleTutorialSkip)
 * - 튜토리얼 완료 (handleTutorialComplete)
 * - 진행 가능 여부 확인 (canProceedTutorial)
 *
 * @param props - tutorialState, validation 상태들, ref들
 * @returns 튜토리얼 관련 핸들러 함수들
 */

interface UseTutorialHandlersProps {
  tutorialState: TutorialState;
  setTutorialState: React.Dispatch<React.SetStateAction<TutorialState>>;
  canvasPanned: boolean;
  setCanvasPanned: React.Dispatch<React.SetStateAction<boolean>>;
  canvasZoomed: boolean;
  setCanvasZoomed: React.Dispatch<React.SetStateAction<boolean>>;
  memoCreated: boolean;
  setMemoCreated: React.Dispatch<React.SetStateAction<boolean>>;
  memoDragged: boolean;
  setMemoDragged: React.Dispatch<React.SetStateAction<boolean>>;
  initialCanvasOffset: React.MutableRefObject<{ x: number; y: number }>;
  initialCanvasScale: React.MutableRefObject<number>;
  initialMemoPositions: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  initialMemoCount: React.MutableRefObject<number>;
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  pages: Page[];
  currentPageId: string;
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;
}

export const useTutorialHandlers = (props: UseTutorialHandlersProps) => {
  const {
    tutorialState,
    setTutorialState,
    canvasPanned,
    setCanvasPanned,
    canvasZoomed,
    setCanvasZoomed,
    memoCreated,
    setMemoCreated,
    memoDragged,
    setMemoDragged,
    initialCanvasOffset,
    initialCanvasScale,
    initialMemoPositions,
    initialMemoCount,
    canvasOffset,
    canvasScale,
    pages,
    currentPageId,
    setCurrentPageId,
    setPages,
    setCanvasOffset: setCanvasOffsetProp,
    setCanvasScale: setCanvasScaleProp
  } = props;

  /**
   * 현재 단계에서 다음으로 진행할 수 있는지 확인
   */
  const canProceedTutorial = useCallback(() => {
    const step = tutorialState.currentStep;

    // 2단계: 캔버스 이동
    if (step === 2) {
      return canvasPanned;
    }
    // 3단계: 캔버스 줌
    if (step === 3) {
      return canvasZoomed;
    }
    // 4단계: 메모 생성
    if (step === 4) {
      return memoCreated;
    }
    // 5단계: 메모 드래그
    if (step === 5) {
      return memoDragged;
    }

    // 다른 단계는 자유롭게 진행
    return true;
  }, [tutorialState.currentStep, canvasPanned, canvasZoomed, memoCreated, memoDragged]);

  /**
   * 튜토리얼 페이지 초기 상태 생성
   */
  const createInitialTutorialPage = (pageId: string): Page => {
    return {
      id: pageId,
      name: '튜토리얼',
      memos: [],
      categories: [],
      quickNavItems: []
    };
  };

  /**
   * 다음 튜토리얼 단계로 진행
   */
  const handleTutorialNext = useCallback(() => {
    const currentStep = tutorialState.currentStep;

    setTutorialState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1
    }));

    // 다음 단계로 넘어갈 때 validation 상태 리셋
    if (currentStep === 2) {
      // 캔버스 이동 완료 후
      setCanvasPanned(false);
      initialCanvasOffset.current = canvasOffset;
    }
    if (currentStep === 3) {
      // 캔버스 줌 완료 후
      setCanvasZoomed(false);
      initialCanvasScale.current = canvasScale;
      // 메모 개수 저장
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage) {
        initialMemoCount.current = currentPage.memos.length;
      }
    }
    if (currentStep === 4) {
      // 메모 생성 완료 후
      setMemoCreated(false);
      // 현재 메모 위치를 저장
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage) {
        initialMemoPositions.current.clear();
        currentPage.memos.forEach(memo => {
          initialMemoPositions.current.set(memo.id, { x: memo.position.x, y: memo.position.y });
        });
      }
    }
    if (currentStep === 5) {
      // 메모 드래그 완료 후
      setMemoDragged(false);
    }
  }, [tutorialState.currentStep, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged, initialCanvasOffset, initialCanvasScale, initialMemoPositions, initialMemoCount, canvasOffset, canvasScale, pages, currentPageId]);

  /**
   * 튜토리얼 건너뛰기
   */
  const handleTutorialSkip = useCallback(() => {
    // 튜토리얼 페이지 초기화
    const tutorialPage = pages.find(p => p.name.startsWith('튜토리얼'));
    if (tutorialPage) {
      const resetPage = createInitialTutorialPage(tutorialPage.id);
      setPages(prev => prev.map(p => p.id === tutorialPage.id ? resetPage : p));
    }

    setTutorialState({
      isActive: false,
      currentStep: 0,
      completed: true
    });
    localStorage.setItem('tutorial-completed', 'true');
    setCanvasPanned(false);
    setCanvasZoomed(false);
    setMemoCreated(false);
    setMemoDragged(false);
  }, [pages, setPages, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged]);

  /**
   * 튜토리얼 완료
   */
  const handleTutorialComplete = useCallback(() => {
    // 튜토리얼 페이지 초기화
    const tutorialPage = pages.find(p => p.name.startsWith('튜토리얼'));
    if (tutorialPage) {
      const resetPage = createInitialTutorialPage(tutorialPage.id);
      setPages(prev => prev.map(p => p.id === tutorialPage.id ? resetPage : p));
    }

    setTutorialState({
      isActive: false,
      currentStep: 0,
      completed: true
    });
    localStorage.setItem('tutorial-completed', 'true');
    setCanvasPanned(false);
    setCanvasZoomed(false);
    setMemoCreated(false);
    setMemoDragged(false);
  }, [pages, setPages, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged]);

  /**
   * 튜토리얼 전용 페이지 생성 또는 찾기
   */
  const getTutorialPage = useCallback((): Page => {
    // 기존에 튜토리얼 페이지가 있는지 확인 (이름이 "튜토리얼"로 시작하는 페이지)
    const existingTutorialPage = pages.find(p => p.name.startsWith('튜토리얼'));

    if (existingTutorialPage) {
      return existingTutorialPage;
    }

    // 없으면 새로 생성
    const tutorialPageId = `tutorial-${Date.now()}`;
    const tutorialPage = createInitialTutorialPage(tutorialPageId);

    // 페이지 추가
    setPages(prev => [...prev, tutorialPage]);

    return tutorialPage;
  }, [pages, setPages]);

  /**
   * 튜토리얼 시작
   */
  const handleStartTutorial = useCallback(() => {
    // 1. 튜토리얼 페이지 생성 또는 찾기
    const tutorialPage = getTutorialPage();

    // 2. 튜토리얼 페이지로 이동
    setCurrentPageId(tutorialPage.id);

    // 3. 캔버스 초기화 (중앙으로)
    setCanvasOffsetProp({ x: 0, y: 0 });
    setCanvasScaleProp(1);

    // 4. 튜토리얼 상태 시작
    setTutorialState({
      isActive: true,
      currentStep: 0,
      completed: false
    });

    setCanvasPanned(false);
    setCanvasZoomed(false);
    setMemoCreated(false);
    setMemoDragged(false);
    initialCanvasOffset.current = canvasOffset;
    initialCanvasScale.current = canvasScale;

    // 현재 메모 개수와 위치를 저장
    initialMemoCount.current = tutorialPage.memos.length;
    initialMemoPositions.current.clear();
    tutorialPage.memos.forEach(memo => {
      initialMemoPositions.current.set(memo.id, { x: memo.position.x, y: memo.position.y });
    });
  }, [getTutorialPage, setCurrentPageId, setCanvasOffsetProp, setCanvasScaleProp, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged, initialCanvasOffset, initialCanvasScale, initialMemoPositions, initialMemoCount, canvasOffset, canvasScale]);

  return {
    handleStartTutorial,
    handleTutorialNext,
    handleTutorialSkip,
    handleTutorialComplete,
    canProceedTutorial
  };
};
