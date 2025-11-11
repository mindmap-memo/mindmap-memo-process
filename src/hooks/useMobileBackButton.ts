import { useEffect, useRef, useState } from 'react';

interface UseMobileBackButtonProps {
  isEditorOpen: boolean;
  onClose: () => void;
  showExitToast?: boolean;
  onShowExitToast?: (show: boolean) => void;
}

/**
 * 모바일에서 브라우저 뒤로가기 버튼을 누르면 에디터를 닫거나 앱을 종료하는 훅
 * - 에디터가 열려있으면: 에디터 닫기
 * - 캔버스 뷰에서: 첫 번째 뒤로가기는 토스트 표시, 2초 내 다시 누르면 종료
 */
export const useMobileBackButton = ({
  isEditorOpen,
  onClose,
  showExitToast,
  onShowExitToast
}: UseMobileBackButtonProps) => {
  const lastBackPressTime = useRef<number>(0);
  const exitToastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 모바일이 아니면 실행하지 않음
    if (typeof window === 'undefined' || window.innerWidth > 768) return;

    // 에디터가 열려있을 때
    if (isEditorOpen) {
      // 에디터가 열릴 때 history에 상태 추가
      window.history.pushState({ editorOpen: true }, '');

      const handlePopState = (event: PopStateEvent) => {
        // 뒤로가기 시 에디터 닫기
        if (isEditorOpen) {
          event.preventDefault();
          onClose();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }

    // 캔버스 뷰일 때 (에디터가 닫혀있을 때)
    // history에 상태 추가
    window.history.pushState({ canvasView: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      const now = Date.now();
      const timeSinceLastPress = now - lastBackPressTime.current;

      // 2초 이내에 다시 눌렀으면 실제로 뒤로가기
      if (timeSinceLastPress < 2000 && showExitToast) {
        // 토스트 숨기기
        if (onShowExitToast) {
          onShowExitToast(false);
        }
        // 실제 뒤로가기 허용
        window.history.back();
        return;
      }

      // 첫 번째 뒤로가기: 토스트 표시
      event.preventDefault();
      lastBackPressTime.current = now;

      // 토스트 표시
      if (onShowExitToast) {
        onShowExitToast(true);
      }

      // 2초 후 토스트 자동 숨김
      if (exitToastTimeout.current) {
        clearTimeout(exitToastTimeout.current);
      }
      exitToastTimeout.current = setTimeout(() => {
        if (onShowExitToast) {
          onShowExitToast(false);
        }
      }, 2000);

      // 히스토리 다시 추가 (뒤로가기를 막았으므로)
      window.history.pushState({ canvasView: true }, '');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimeout.current) {
        clearTimeout(exitToastTimeout.current);
      }
    };
  }, [isEditorOpen, onClose, showExitToast, onShowExitToast]);
};
