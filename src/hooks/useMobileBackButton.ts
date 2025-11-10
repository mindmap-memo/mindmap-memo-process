import { useEffect } from 'react';

interface UseMobileBackButtonProps {
  isEditorOpen: boolean;
  onClose: () => void;
}

/**
 * 모바일에서 브라우저 뒤로가기 버튼을 누르면 에디터를 닫는 훅
 */
export const useMobileBackButton = ({ isEditorOpen, onClose }: UseMobileBackButtonProps) => {
  useEffect(() => {
    // 모바일이 아니면 실행하지 않음
    if (typeof window === 'undefined' || window.innerWidth > 768) return;

    // 에디터가 열려있지 않으면 실행하지 않음
    if (!isEditorOpen) return;

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
  }, [isEditorOpen, onClose]);
};
