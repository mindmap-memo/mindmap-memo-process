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

  // 우클릭 컨텍스트 메뉴
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    handleQuickNavConfirm
  };
};
