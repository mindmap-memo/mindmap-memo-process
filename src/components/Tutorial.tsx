import React, { useEffect, useState } from 'react';
import { TutorialStep } from '../types';

interface TutorialProps {
  steps: TutorialStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  canProceed?: boolean; // validation 통과 여부
}

export const Tutorial: React.FC<TutorialProps> = ({
  steps,
  currentStep,
  onNext,
  onSkip,
  onComplete,
  canProceed = true
}) => {
  const [highlightPosition, setHighlightPosition] = useState<DOMRect | null>(null);
  const step = steps[currentStep];

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

  if (!step) return null;

  const isLastStep = currentStep === steps.length - 1;

  // 인터랙티브 단계인지 확인 (사용자가 직접 조작해야 하는 단계)
  const interactiveCanvasSteps = ['canvas-pan', 'canvas-zoom', 'add-memo', 'memo-drag', 'connections', 'disconnect-mode', 'categories', 'category-area', 'undo-redo'];
  const isInteractiveStep = interactiveCanvasSteps.includes(step.id);

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

  // select-memo 단계에서는 캔버스 dim 처리 제거
  const shouldHideCanvasDim = step.id === 'select-memo';

  return (
    <>
      {/* 하이라이트 영역 (구멍 뚫린 효과) */}
      {highlightPosition ? (
        <>
          {/* 상단 - select-memo 단계에서는 캔버스 영역 제외 */}
          {!shouldHideCanvasDim && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: highlightPosition.top,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                zIndex: 10001,
                pointerEvents: 'none'
              }}
            />
          )}
          {/* 좌측 */}
          <div
            style={{
              position: 'fixed',
              top: highlightPosition.top,
              left: 0,
              width: highlightPosition.left,
              height: highlightPosition.height,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10001,
              pointerEvents: 'none'
            }}
          />
          {/* 우측 - select-memo 단계에서는 항상 표시 */}
          <div
            style={{
              position: 'fixed',
              top: highlightPosition.top,
              left: highlightPosition.right,
              width: window.innerWidth - highlightPosition.right,
              height: highlightPosition.height,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10001,
              pointerEvents: 'none'
            }}
          />
          {/* 하단 - select-memo 단계에서는 캔버스 영역 제외 */}
          {!shouldHideCanvasDim && (
            <div
              style={{
                position: 'fixed',
                top: highlightPosition.bottom,
                left: 0,
                width: '100vw',
                height: window.innerHeight - highlightPosition.bottom,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                zIndex: 10001,
                pointerEvents: 'none'
              }}
            />
          )}
          {/* 하이라이트 테두리 */}
          <div
            style={{
              position: 'fixed',
              top: highlightPosition.top - 4,
              left: highlightPosition.left - 4,
              width: highlightPosition.width + 8,
              height: highlightPosition.height + 8,
              border: '4px solid #4A90E2',
              borderRadius: '8px',
              zIndex: 10001,
              pointerEvents: 'none',
              boxShadow: '0 0 20px rgba(74, 144, 226, 0.5)',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
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
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '2px solid #4A90E2',
            minWidth: '300px'
          }}
        >
          {/* 진행 상황 */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={onSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px 8px'
              }}
            >
              건너뛰기
            </button>
          </div>

          {/* 진행 바 */}
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#E0E0E0',
              borderRadius: '2px',
              marginBottom: '20px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                height: '100%',
                backgroundColor: '#4A90E2',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {/* 제목 */}
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#333' }}>
            {step.title}
          </h3>

          {/* 설명 */}
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', lineHeight: '1.6', color: '#666', whiteSpace: 'pre-line' }}>
            {step.description}
          </p>

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {isLastStep ? (
              <button
                onClick={onComplete}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#4A90E2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#357ABD')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4A90E2')}
              >
                시작하기
              </button>
            ) : (
              <button
                onClick={canProceed ? onNext : undefined}
                disabled={!canProceed}
                style={{
                  padding: '10px 24px',
                  backgroundColor: canProceed ? '#4A90E2' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'background-color 0.2s',
                  opacity: canProceed ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (canProceed) {
                    e.currentTarget.style.backgroundColor = '#357ABD';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canProceed) {
                    e.currentTarget.style.backgroundColor = '#4A90E2';
                  }
                }}
              >
                {step.nextButtonText || '다음'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.02);
            }
          }
        `}
      </style>
    </>
  );
};
