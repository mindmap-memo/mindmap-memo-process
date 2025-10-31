import { useEffect } from 'react';

/**
 * useContextMenuEffect
 *
 * 컨텍스트 메뉴 외부 클릭 감지 및 닫기 처리
 */

interface UseContextMenuEffectParams {
  areaContextMenu: { x: number; y: number; categoryId: string } | null;
  setAreaContextMenu: (menu: { x: number; y: number; categoryId: string } | null) => void;
}

export const useContextMenuEffect = (params: UseContextMenuEffectParams) => {
  const { areaContextMenu, setAreaContextMenu } = params;

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (areaContextMenu) {
      const handleClickOutside = () => setAreaContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [areaContextMenu, setAreaContextMenu]);
};
