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
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
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
    setCanvasScale: setCanvasScaleProp,
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth
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
    // 튜토리얼 페이지 삭제 및 다른 페이지로 이동
    const tutorialPage = pages.find(p => p.name.startsWith('튜토리얼'));
    if (tutorialPage) {
      // 튜토리얼 페이지가 아닌 첫 번째 페이지로 이동
      const otherPage = pages.find(p => !p.name.startsWith('튜토리얼'));
      if (otherPage) {
        setCurrentPageId(otherPage.id);
      }
      // 튜토리얼 페이지 삭제
      setPages(prev => prev.filter(p => !p.name.startsWith('튜토리얼')));
    }

    setTutorialState({
      isActive: false,
      currentStep: 0,
      completed: true
    });

    // localStorage에 튜토리얼 완료 상태 저장
    localStorage.setItem('tutorial-completed', 'true');

    setCanvasPanned(false);
    setCanvasZoomed(false);
    setMemoCreated(false);
    setMemoDragged(false);
  }, [pages, setPages, setCurrentPageId, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged]);

  /**
   * 튜토리얼 완료
   */
  const handleTutorialComplete = useCallback(() => {
    // 튜토리얼 페이지 삭제 및 다른 페이지로 이동
    const tutorialPage = pages.find(p => p.name.startsWith('튜토리얼'));
    if (tutorialPage) {
      // 튜토리얼 페이지가 아닌 첫 번째 페이지로 이동
      const otherPage = pages.find(p => !p.name.startsWith('튜토리얼'));
      if (otherPage) {
        setCurrentPageId(otherPage.id);
      }
      // 튜토리얼 페이지 삭제
      setPages(prev => prev.filter(p => !p.name.startsWith('튜토리얼')));
    }

    setTutorialState({
      isActive: false,
      currentStep: 0,
      completed: true
    });

    // localStorage에 튜토리얼 완료 상태 저장
    localStorage.setItem('tutorial-completed', 'true');

    setCanvasPanned(false);
    setCanvasZoomed(false);
    setMemoCreated(false);
    setMemoDragged(false);
  }, [pages, setPages, setCurrentPageId, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged]);

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

    // 3. 중요도 메모 위치 계산 (캔버스 초기화 전에 현재 보이는 화면 중앙 좌표 계산)
    const canvasWidth = window.innerWidth - leftPanelWidth - (rightPanelOpen ? rightPanelWidth : 0);
    const canvasHeight = window.innerHeight;
    const memoWidth = 320;
    const memoHeight = 450;

    // 현재 보이는 화면 중앙 좌표를 캔버스 좌표로 변환
    // 중앙에서 150px 오른쪽으로 이동
    const centerX = (-canvasOffset.x + canvasWidth / 2) / canvasScale - memoWidth / 2 + 150;
    const centerY = (-canvasOffset.y + canvasHeight / 2) / canvasScale - memoHeight / 2;

    // 4. 캔버스 초기화 (중앙으로)
    setCanvasOffsetProp({ x: 0, y: 0 });
    setCanvasScaleProp(1);

    // 5. 튜토리얼 상태 시작
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

    // 6. 튜토리얼 시작 시 중요도 설명 메모 자동 생성
    const timestamp = Date.now();
    const memoId = `memo-importance-guide-${timestamp}`;

    const newMemo: typeof tutorialPage.memos[0] = {
      id: memoId,
      title: '중요도 가이드',
      content: '', // 기존 호환성을 위해 유지
      tags: ['튜토리얼', '중요도'],
      displaySize: 'medium' as const, // 기본 표시 크기를 medium으로 설정
      blocks: [
        {
          id: `block-${timestamp}-1`,
          type: 'text' as const,
          content: '매우중요\n특히 중요한 내용에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 4, level: 'critical' as const }
          ]
        },
        {
          id: `block-${timestamp}-2`,
          type: 'text' as const,
          content: '중요\n중요하지만 매우중요보다는 낮은 우선순위의 내용입니다.',
          importanceRanges: [
            { start: 0, end: 2, level: 'important' as const }
          ]
        },
        {
          id: `block-${timestamp}-3`,
          type: 'text' as const,
          content: '의견\n개인적인 생각이나 판단에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 2, level: 'opinion' as const }
          ]
        },
        {
          id: `block-${timestamp}-4`,
          type: 'text' as const,
          content: '참고\n참고할 만한 부가 정보에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 2, level: 'reference' as const }
          ]
        },
        {
          id: `block-${timestamp}-5`,
          type: 'text' as const,
          content: '질문\n나중에 찾아봐야 할 의문사항에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 2, level: 'question' as const }
          ]
        },
        {
          id: `block-${timestamp}-6`,
          type: 'text' as const,
          content: '아이디어\n떠오른 아이디어나 영감에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 4, level: 'idea' as const }
          ]
        },
        {
          id: `block-${timestamp}-7`,
          type: 'text' as const,
          content: '데이터\n객관적인 수치나 사실에 적용하는 중요도입니다.',
          importanceRanges: [
            { start: 0, end: 3, level: 'data' as const }
          ]
        },
        {
          id: `block-${timestamp}-8`,
          type: 'file' as const,
          name: 'importance-levels.txt',
          size: 245,
          url: 'data:text/plain;base64,7KSR7JqU64-EIOugiOuypDog66ek7Jqw7KSR7JqULCDso7zsmrgsIOydmOqyhSwg7LC46rOgLCDsp4jrrLgsIOyVhOydtOuTlOyWtCwg642w7J207YSwCuq4sOyXheuTsOydtOuEsCBpc29tb3JwaGlzbQo=',
          importance: 'data' as const
        }
      ],
      connections: [],
      position: { x: centerX, y: centerY },
      size: { width: memoWidth, height: memoHeight }
    };

    setPages(prev => prev.map(p =>
      p.id === tutorialPage.id
        ? { ...p, memos: [...p.memos, newMemo] }
        : p
    ));
  }, [getTutorialPage, setCurrentPageId, setCanvasOffsetProp, setCanvasScaleProp, setTutorialState, setCanvasPanned, setCanvasZoomed, setMemoCreated, setMemoDragged, initialCanvasOffset, initialCanvasScale, initialMemoPositions, initialMemoCount, canvasOffset, canvasScale, leftPanelWidth, rightPanelOpen, rightPanelWidth, setPages]);

  return {
    handleStartTutorial,
    handleTutorialNext,
    handleTutorialSkip,
    handleTutorialComplete,
    canProceedTutorial
  };
};
