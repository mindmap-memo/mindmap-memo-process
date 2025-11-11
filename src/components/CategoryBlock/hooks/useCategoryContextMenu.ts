import React from 'react';

interface UseCategoryContextMenuProps {
  categoryId: string;
  contextMenu: { x: number; y: number } | null;
  setContextMenu: (value: { x: number; y: number } | null) => void;
  setShowQuickNavModal: (value: boolean) => void;
  onDelete: (categoryId: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
}

export const useCategoryContextMenu = ({
  categoryId,
  contextMenu,
  setContextMenu,
  setShowQuickNavModal,
  onDelete,
  onAddQuickNav,
  isQuickNavExists
}: UseCategoryContextMenuProps) => {

  // 롱프레스 직후 시간을 추적하는 ref
  const lastLongPressEndRef = React.useRef<number>(0);

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 모바일(터치) 환경에서는 컨텍스트 메뉴 비활성화
    // @ts-ignore - nativeEvent의 sourceCapabilities 체크
    if (e.nativeEvent && e.nativeEvent.sourceCapabilities && e.nativeEvent.sourceCapabilities.firesTouchEvents) {
      console.log('[CategoryBlock] 모바일 환경이므로 컨텍스트 메뉴 표시 안 함');
      return;
    }

    // 롱프레스가 방금 끝났다면 (1000ms 이내) 컨텍스트 메뉴를 표시하지 않음
    const now = Date.now();
    if (now - lastLongPressEndRef.current < 1000) {
      console.log('[CategoryBlock] 롱프레스 직후이므로 컨텍스트 메뉴 표시 안 함', {
        경과시간: now - lastLongPressEndRef.current,
        제한시간: 1000
      });
      return;
    }

    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // 단축 이동 추가 핸들러
  const handleAddQuickNav = () => {
    // 중복 체크
    if (isQuickNavExists && isQuickNavExists(categoryId, 'category')) {
      alert('이미 단축 이동이 설정되어 있습니다.');
      setContextMenu(null);
      return;
    }
    setContextMenu(null);
    setShowQuickNavModal(true);
  };

  // 단축 이동 추가 확인
  const handleQuickNavConfirm = (name: string) => {
    if (name.trim() && onAddQuickNav) {
      onAddQuickNav(name.trim(), categoryId, 'category');
      setShowQuickNavModal(false);
    }
  };

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  React.useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = () => setContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, setContextMenu]);

  return {
    handleContextMenu,
    handleAddQuickNav,
    handleQuickNavConfirm,
    lastLongPressEndRef  // 롱프레스 종료 시간 ref export
  };
};
