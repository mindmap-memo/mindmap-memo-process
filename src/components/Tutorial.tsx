import React, { useEffect, useState } from 'react';
import { TutorialStep } from '../types';
import styles from '../scss/components/Tutorial.module.scss';

interface TutorialProps {
  steps: TutorialStep[];
  currentStep: number;
  currentSubStep?: number; // 현재 서브스텝
  onNext: () => void;
  onPrev?: () => void; // 이전 단계로
  onSkip: () => void;
  onComplete: () => void;
  onSwitchToCore?: () => void; // 기본 기능 완료 후 핵심 기능으로 전환
  onSubStepComplete?: () => void; // 서브스텝 완료 시 호출
  canProceed?: boolean; // validation 통과 여부
}

export const Tutorial: React.FC<TutorialProps> = ({
  steps,
  currentStep,
  currentSubStep = 0,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  onSwitchToCore,
  onSubStepComplete,
  canProceed = true
}) => {
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const [subStepTargetPosition, setSubStepTargetPosition] = useState<DOMRect | null>(null);
  const step = steps[currentStep];
  const activeSubStep = step?.subSteps?.[currentSubStep];

  useEffect(() => {
    if (!step) return;

    // 타겟 요소 하이라이트 위치 계산
    if (step.targetElement) {
      const element = document.querySelector(step.targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightPosition(rect);
      }
    } else {
      setHighlightPosition(null);
    }
  }, [step]);

  // 서브스텝 타겟 위치 계산
  useEffect(() => {
    if (!activeSubStep || !activeSubStep.targetElement) {
      setSubStepTargetPosition(null);
      return;
    }

    const updateSubStepPosition = () => {
      const element = document.querySelector(activeSubStep.targetElement!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setSubStepTargetPosition(rect);
      } else {
        setSubStepTargetPosition(null);
      }
    };

    updateSubStepPosition();

    // 타겟 요소 위치가 변경될 수 있으므로 주기적으로 업데이트
    const interval = setInterval(updateSubStepPosition, 100);
    return () => clearInterval(interval);
  }, [activeSubStep]);

  if (!step) return null;

  const isLastStep = currentStep === steps.length - 1;

  // 캔버스 관련 단계인지 확인 (캔버스 dim 해제가 필요한 단계)
  const canvasSteps = ['canvas-intro', 'canvas-pan', 'canvas-zoom', 'add-memo', 'memo-drag', 'connections', 'disconnect-mode', 'categories', 'category-area', 'undo-redo', 'select-memo'];
  const isCanvasStep = canvasSteps.includes(step.id);

  // 인터랙티브 단계인지 확인 (사용자가 직접 조작해야 하는 단계 - 툴팁 우상단 고정용)
  const interactiveCanvasSteps = ['canvas-pan', 'canvas-zoom', 'add-memo', 'memo-drag', 'connections', 'disconnect-mode', 'categories', 'category-area', 'undo-redo'];
  const isInteractiveStep = interactiveCanvasSteps.includes(step.id);

  // 캔버스를 타겟으로 하면서 캔버스 관련 단계인지 확인 (좌우 패널만 dim 처리)
  const isCanvasTarget = step.targetElement === '[data-tutorial="canvas"]' && isCanvasStep;

  // 툴팁 위치 계산 (화면 밖으로 나가지 않도록)
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 20;
    const tooltipWidth = 400;

    // 인터랙티브 단계는 우상단 모서리에 고정
    if (isInteractiveStep) {
      return {
        position: 'fixed',
        top: `${padding}px`,
        right: `${padding}px`,
        zIndex: 10002,
        maxWidth: `${tooltipWidth}px`
      };
    }

    if (!highlightPosition) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
        maxWidth: `${tooltipWidth}px`
      };
    }

    const position = step.position || 'bottom';

    // 기본 위치 계산
    let left = 0;
    let top = 0;
    let transform = '';

    if (position === 'center') {
      // center인 경우 화면 중앙
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
        maxWidth: `${tooltipWidth}px`
      };
    }

    switch (position) {
      case 'top':
        left = Math.max(padding + tooltipWidth / 2, Math.min(window.innerWidth - padding - tooltipWidth / 2, highlightPosition.left + highlightPosition.width / 2));
        top = Math.max(padding, highlightPosition.top - 20);
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        left = Math.max(padding + tooltipWidth / 2, Math.min(window.innerWidth - padding - tooltipWidth / 2, highlightPosition.left + highlightPosition.width / 2));
        top = Math.min(window.innerHeight - padding, highlightPosition.bottom + 20);
        transform = 'translateX(-50%)';
        break;
      case 'left':
        left = Math.max(padding, highlightPosition.left - 20);
        top = Math.max(padding, Math.min(window.innerHeight - padding, highlightPosition.top + highlightPosition.height / 2));
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        left = Math.min(window.innerWidth - padding, highlightPosition.right + 20);
        top = Math.max(padding, Math.min(window.innerHeight - padding, highlightPosition.top + highlightPosition.height / 2));
        transform = 'translateY(-50%)';
        break;
      default:
        left = Math.max(padding + tooltipWidth / 2, Math.min(window.innerWidth - padding - tooltipWidth / 2, highlightPosition.left + highlightPosition.width / 2));
        top = Math.min(window.innerHeight - padding, highlightPosition.bottom + 20);
        transform = 'translateX(-50%)';
    }

    return {
      position: 'fixed',
      zIndex: 10002,
      maxWidth: `${tooltipWidth}px`,
      left: `${left}px`,
      top: `${top}px`,
      transform
    };
  };

  // 커서 애니메이션 위치 계산
  const getCursorPosition = () => {
    // 서브스텝이 있으면 커서 표시 안 함 (서브스텝 애니메이션 사용)
    if (step.subSteps && step.subSteps.length > 0) return null;

    if (!highlightPosition) return null;

    // 인터랙티브 단계에서는 커서 표시 안 함 (사용자가 직접 조작해야 하므로)
    if (isInteractiveStep) return null;

    // center position이면 커서 표시 안 함
    if (step.position === 'center') return null;

    // 우측 패널 관련 단계에서는 커서 표시 안 함
    const rightPanelSteps = ['right-panel-intro', 'memo-title-tags', 'text-editing', 'file-attachment', 'connection-navigation'];
    if (rightPanelSteps.includes(step.id)) return null;

    // 타겟 요소의 중앙으로 커서 이동
    return {
      x: highlightPosition.left + highlightPosition.width / 2,
      y: highlightPosition.top + highlightPosition.height / 2
    };
  };

  const cursorPosition = getCursorPosition();

  // 화살표 위치 계산 (툴팁에서 타겟으로)
  const getArrowPath = () => {
    if (!highlightPosition || step.position === 'center') return null;

    // 인터랙티브 캔버스 단계에서는 화살표 표시 안 함
    if (isInteractiveStep) return null;

    // 우측 패널 관련 단계에서는 화살표 표시 안 함
    const rightPanelSteps = ['right-panel-intro', 'memo-title-tags', 'text-editing', 'file-attachment', 'connection-navigation'];
    if (rightPanelSteps.includes(step.id)) return null;

    const tooltipStyle = getTooltipStyle();

    // 툴팁의 중심점 계산
    let tooltipX = 0;
    let tooltipY = 0;

    if (tooltipStyle.left && tooltipStyle.top) {
      tooltipX = parseFloat(tooltipStyle.left as string);
      tooltipY = parseFloat(tooltipStyle.top as string);
    }

    // 타겟의 중심점
    const targetX = highlightPosition.left + highlightPosition.width / 2;
    const targetY = highlightPosition.top + highlightPosition.height / 2;

    return {
      startX: tooltipX,
      startY: tooltipY,
      endX: targetX,
      endY: targetY
    };
  };

  const arrowPath = getArrowPath();

  // 설명 텍스트에서 번호를 강조하는 함수
  const renderDescription = (description: string) => {
    // "1. ", "2. ", "3. " 패턴을 찾아서 강조
    const parts = description.split(/(\d+\.)/);
    let numberIndex = 0;

    return parts.map((part, index) => {
      if (/^\d+\.$/.test(part)) {
        // 숫자. 패턴인 경우
        numberIndex++;
        return (
          <span key={index} className={`step-number step-number-${numberIndex}`}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* 하이라이트 영역 (타겟 요소 주변만 dim 처리, 타겟은 클릭 가능) */}
      {highlightPosition ? (
        <>
          {isCanvasTarget ? (
            // 캔버스를 타겟으로 할 때: 좌우 패널만 dim 처리
            <>
              {/* 좌측 패널 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: highlightPosition.left,
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'none'
                }}
              />
              {/* 우측 패널 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: highlightPosition.right,
                  width: window.innerWidth - highlightPosition.right,
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'none'
                }}
              />
              {/* 캔버스 테두리 강조 */}
              <div
                className={styles['highlight-border']}
                style={{
                  top: highlightPosition.top - 4,
                  left: highlightPosition.left - 4,
                  width: highlightPosition.width + 8,
                  height: highlightPosition.height + 8,
                  pointerEvents: 'none'
                }}
              />
            </>
          ) : (
            // 일반 타겟: 타겟 주변만 dim 처리
            <>
              {/* 상단 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: highlightPosition.top,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {/* 좌측 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: highlightPosition.top,
                  left: 0,
                  width: highlightPosition.left,
                  height: highlightPosition.height,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {/* 우측 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: highlightPosition.top,
                  left: highlightPosition.right,
                  width: window.innerWidth - highlightPosition.right,
                  height: highlightPosition.height,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {/* 하단 dim */}
              <div
                style={{
                  position: 'fixed',
                  top: highlightPosition.bottom,
                  left: 0,
                  width: '100vw',
                  height: window.innerHeight - highlightPosition.bottom,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {/* 하이라이트 테두리 (타겟 요소를 강조, 타겟보다 낮은 z-index) */}
              <div
                className={styles['highlight-border']}
                style={{
                  top: highlightPosition.top - 4,
                  left: highlightPosition.left - 4,
                  width: highlightPosition.width + 8,
                  height: highlightPosition.height + 8,
                  pointerEvents: 'none'
                }}
              />
            </>
          )}

          {/* 커서 애니메이션 */}
          {cursorPosition && !activeSubStep && (
            <div
              className={styles['tutorial-cursor']}
              style={{
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                  fill="#4A90E2"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}

          {/* 서브스텝 애니메이션 */}
          {activeSubStep && subStepTargetPosition && (
            <>
              {/* 서브스텝 타겟 하이라이트 */}
              <div
                className={styles['substep-highlight']}
                style={{
                  top: subStepTargetPosition.top - 4,
                  left: subStepTargetPosition.left - 4,
                  width: subStepTargetPosition.width + 8,
                  height: subStepTargetPosition.height + 8,
                  pointerEvents: 'none'
                }}
              />

              {/* 서브스텝별 커서 애니메이션 */}
              {activeSubStep.animationType === 'cursor-click' && (
                <div
                  className={styles['substep-cursor-click']}
                  style={{
                    left: `${subStepTargetPosition.left + subStepTargetPosition.width / 2}px`,
                    top: `${subStepTargetPosition.top + subStepTargetPosition.height / 2}px`
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="#FF6B6B"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}

              {activeSubStep.animationType === 'cursor-drag' && (
                <div
                  className={styles['substep-cursor-drag']}
                  style={{
                    left: `${subStepTargetPosition.left + subStepTargetPosition.width / 2}px`,
                    top: `${subStepTargetPosition.top + subStepTargetPosition.height / 2}px`
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="#FF6B6B"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}

              {activeSubStep.animationType === 'cursor-hover' && (
                <div
                  className={styles['substep-cursor-hover']}
                  style={{
                    left: `${subStepTargetPosition.left + subStepTargetPosition.width / 2}px`,
                    top: `${subStepTargetPosition.top + subStepTargetPosition.height / 2}px`
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                      fill="#FF6B6B"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
            </>
          )}

          {/* 화살표 애니메이션 (툴팁에서 타겟으로) */}
          {arrowPath && step.position !== 'center' && (
            <svg
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 10002,
                pointerEvents: 'none'
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#4A90E2" />
                </marker>
              </defs>
              <path
                d={`M ${arrowPath.startX} ${arrowPath.startY} Q ${(arrowPath.startX + arrowPath.endX) / 2} ${(arrowPath.startY + arrowPath.endY) / 2 - 50}, ${arrowPath.endX} ${arrowPath.endY}`}
                stroke="#4A90E2"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#arrowhead)"
                opacity="0.8"
                strokeDasharray="10,5"
                className={styles['arrow-path']}
              />
            </svg>
          )}
        </>
      ) : (
        /* 하이라이트가 없는 경우 전체 오버레이 */
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        />
      )}

      {/* 툴팁 카드 */}
      <div style={getTooltipStyle()}>
        <div className={styles['tooltip-card']}>
          {/* 진행 상황 */}
          <div className={styles['tooltip-header']}>
            <span className={styles['step-counter']}>
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={onSkip}
              className={styles['skip-button']}
            >
              건너뛰기
            </button>
          </div>

          {/* 진행 바 */}
          <div className={styles['progress-bar']}>
            <div
              className={styles['progress-fill']}
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`
              }}
            />
          </div>

          {/* 제목 */}
          <h3 className={styles['tooltip-title']}>
            {step.title}
          </h3>

          {/* 설명 */}
          <p className={styles['tooltip-description']}>
            {renderDescription(step.description)}
          </p>

          {/* 액션 버튼 */}
          <div className={styles['tooltip-actions']}>
            {/* 이전 버튼 (첫 번째 단계가 아닐 때만 표시) */}
            {currentStep > 0 && onPrev && (
              <button
                onClick={onPrev}
                className={`${styles['action-button']} ${styles.secondary}`}
              >
                이전
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={onComplete}
                className={`${styles['action-button']} ${styles.primary}`}
              >
                시작하기
              </button>
            ) : step.id === 'core-features-intro' && onSwitchToCore ? (
              // 기본 기능 완료 후 핵심 기능 전환 버튼 (두 개)
              <>
                <button
                  onClick={onComplete}
                  className={`${styles['action-button']} ${styles.secondary}`}
                >
                  나중에 볼게요
                </button>
                <button
                  onClick={onSwitchToCore}
                  className={`${styles['action-button']} ${styles.primary}`}
                >
                  {step.nextButtonText || '핵심 기능 배우기'}
                </button>
              </>
            ) : (
              <button
                onClick={canProceed ? onNext : undefined}
                disabled={!canProceed}
                className={`${styles['action-button']} ${styles.primary}`}
              >
                {step.nextButtonText || '다음'}
              </button>
            )}
          </div>
        </div>
      </div>

    </>
  );
};
