import React from 'react';

/**
 * RightPanel UI 상태 관리 훅
 *
 * RightPanel의 UI 관련 상태들을 통합 관리합니다.
 *
 * **관리하는 상태:**
 * - 메뉴 표시 상태 (showMenu, showContextMenu, showImportanceSubmenu, showEmptySpaceMenu)
 * - 메뉴 위치 (menuPosition, submenuPosition, submenuTopOffset)
 * - 연결된 메모 표시 상태 (showConnectedMemos)
 * - 제목 포커스 상태 (isTitleFocused)
 * - Google 로그인 상태 (isGoogleSignedIn)
 * - 블록 삽입 위치 (clickedPosition)
 */
export const useUIState = () => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [isGoogleSignedIn, setIsGoogleSignedIn] = React.useState(false);
  const [showConnectedMemos, setShowConnectedMemos] = React.useState(false);
  const [isTitleFocused, setIsTitleFocused] = React.useState(false);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [showImportanceSubmenu, setShowImportanceSubmenu] = React.useState(false);
  const [submenuPosition, setSubmenuPosition] = React.useState<'right' | 'left'>('right');
  const [submenuTopOffset, setSubmenuTopOffset] = React.useState<number>(0);
  const [showEmptySpaceMenu, setShowEmptySpaceMenu] = React.useState(false);
  const [clickedPosition, setClickedPosition] = React.useState<number | null>(null);

  return {
    showMenu,
    setShowMenu,
    menuPosition,
    setMenuPosition,
    isGoogleSignedIn,
    setIsGoogleSignedIn,
    showConnectedMemos,
    setShowConnectedMemos,
    isTitleFocused,
    setIsTitleFocused,
    showContextMenu,
    setShowContextMenu,
    showImportanceSubmenu,
    setShowImportanceSubmenu,
    submenuPosition,
    setSubmenuPosition,
    submenuTopOffset,
    setSubmenuTopOffset,
    showEmptySpaceMenu,
    setShowEmptySpaceMenu,
    clickedPosition,
    setClickedPosition
  };
};
