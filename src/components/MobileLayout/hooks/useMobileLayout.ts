import { useState } from 'react';

export type MobileView = 'pages' | 'canvas' | 'editor';

/**
 * useMobileLayout
 *
 * 모바일 레이아웃의 뷰 전환 상태를 관리하는 훅
 */
export const useMobileLayout = () => {
  const [activeView, setActiveView] = useState<MobileView>('canvas');
  const [showEditor, setShowEditor] = useState(false);

  return {
    activeView,
    setActiveView,
    showEditor,
    setShowEditor,
  };
};
