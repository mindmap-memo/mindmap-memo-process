import { useState, useCallback } from 'react';
import { TutorialState } from '../types';
import { coreTutorialSteps, basicTutorialSteps } from '../utils/tutorialSteps';

interface UseTutorialStateProps {
  handleStartTutorial: () => void;
  handleTutorialNext: () => void;
  handleTutorialSkipBase: () => void;
  handleTutorialComplete: () => void;
  canProceedTutorial: () => boolean;
}

export const useTutorialState = (props: UseTutorialStateProps) => {
  const {
    handleStartTutorial,
    handleTutorialNext,
    handleTutorialSkipBase,
    handleTutorialComplete,
    canProceedTutorial
  } = props;

  // ===== 튜토리얼 상태 =====
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => {
    const completed = typeof window !== 'undefined'
      ? localStorage.getItem('tutorial-completed') === 'true'
      : false;

    // 마이그레이션이 필요한 경우(기존 사용자) 튜토리얼 자동으로 완료 처리
    const hasMigrationData = typeof window !== 'undefined'
      ? localStorage.getItem('mindmap-memo-pages') !== null
      : false;

    // 마이그레이션 데이터가 있으면 튜토리얼 완료 플래그 설정
    if (hasMigrationData && typeof window !== 'undefined') {
      localStorage.setItem('tutorial-completed', 'true');
    }

    return {
      isActive: !completed && !hasMigrationData, // 완료되지 않았고 마이그레이션 데이터가 없을 때만 자동 시작
      currentStep: 0,
      completed: completed || hasMigrationData, // 마이그레이션 데이터가 있으면 완료된 것으로 처리
      currentSubStep: 0
    };
  });

  // 튜토리얼 모드 (core: 핵심 기능 먼저, basic: 기본 기능 나중에)
  const [tutorialMode, setTutorialMode] = useState<'basic' | 'core'>('core');

  // handleStartTutorial을 래핑하여 tutorialMode를 리셋
  const handleStartTutorialWrapper = useCallback(() => {
    setTutorialMode('core'); // 항상 핵심 기능부터 시작
    handleStartTutorial();
  }, [handleStartTutorial]);

  // 현재 모드에 맞는 튜토리얼 단계 선택
  const currentTutorialSteps = tutorialMode === 'core' ? coreTutorialSteps : basicTutorialSteps;

  // 튜토리얼 건너뛰기 핸들러 (모드별 분기)
  const handleTutorialSkip = useCallback(() => {
    if (tutorialMode === 'core') {
      // 핵심 기능 모드에서는 "핵심 기능 완료" 단계로 이동
      const basicFeaturesIntroIndex = coreTutorialSteps.findIndex(step => step.id === 'basic-features-intro');
      if (basicFeaturesIntroIndex !== -1) {
        setTutorialState(prev => ({
          ...prev,
          currentStep: basicFeaturesIntroIndex,
          currentSubStep: 0
        }));
      }
    } else {
      // 기본 기능 모드에서는 바로 종료
      handleTutorialSkipBase();
    }
  }, [tutorialMode, handleTutorialSkipBase]);

  // 핵심 기능에서 기본 기능으로 전환하는 핸들러
  const handleSwitchToBasic = useCallback(() => {
    setTutorialMode('basic');
    setTutorialState(prev => ({ ...prev, currentStep: 0, currentSubStep: 0 }));
  }, []);

  // 튜토리얼 이전 단계 핸들러
  const handleTutorialPrev = useCallback(() => {
    if (tutorialState.currentStep > 0) {
      setTutorialState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        currentSubStep: 0
      }));
    }
  }, [tutorialState.currentStep]);

  // 서브스텝 이벤트 감지 핸들러
  const handleSubStepEvent = useCallback((eventType: string) => {
    if (!tutorialState.isActive) return;

    const currentStep = currentTutorialSteps[tutorialState.currentStep];
    if (!currentStep?.subSteps) return;

    const currentSubStep = tutorialState.currentSubStep || 0;
    const activeSubStep = currentStep.subSteps[currentSubStep];

    if (activeSubStep && activeSubStep.eventType === eventType) {
      // 서브스텝 완료
      const nextSubStep = currentSubStep + 1;

      if (nextSubStep >= currentStep.subSteps.length) {
        // 마지막 서브스텝이면 다음 단계로
        setTutorialState(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          currentSubStep: 0
        }));
      } else {
        // 다음 서브스텝으로
        setTutorialState(prev => ({
          ...prev,
          currentSubStep: nextSubStep
        }));
      }
    }
  }, [tutorialState.isActive, tutorialState.currentStep, tutorialState.currentSubStep, currentTutorialSteps]);

  return {
    tutorialState,
    setTutorialState,
    tutorialMode,
    setTutorialMode,
    currentTutorialSteps,
    handleStartTutorialWrapper,
    handleTutorialSkip,
    handleSwitchToBasic,
    handleTutorialPrev,
    handleSubStepEvent
  };
};
