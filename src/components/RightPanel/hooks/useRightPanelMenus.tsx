import React from 'react';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../../utils/importanceStyles';
import { ImportanceLevel } from '../../../types';

interface UseRightPanelMenusProps {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  menuPosition: { x: number; y: number };
  selectedBlocks: string[];
  setSelectedBlocks: (blocks: string[]) => void;
  showContextMenu: boolean;
  setShowContextMenu: (show: boolean) => void;
  contextMenuPosition: { x: number; y: number };
  showImportanceSubmenu: boolean;
  setShowImportanceSubmenu: (show: boolean) => void;
  submenuPosition: 'left' | 'right';
  setSubmenuPosition: (position: 'left' | 'right') => void;
  submenuTopOffset: number;
  setSubmenuTopOffset: (offset: number) => void;
  importanceButtonRef: React.RefObject<HTMLButtonElement | null>;
  handleBlocksMove: (direction: 'up' | 'down') => void;
  handleBlocksDelete: () => void;
  handleDeleteSelectedBlocks: () => void;
  handleApplyImportance: (importance: ImportanceLevel | 'none') => void;
}

export const useRightPanelMenus = ({
  showMenu,
  setShowMenu,
  menuPosition,
  selectedBlocks,
  setSelectedBlocks,
  showContextMenu,
  setShowContextMenu,
  contextMenuPosition,
  showImportanceSubmenu,
  setShowImportanceSubmenu,
  submenuPosition,
  setSubmenuPosition,
  submenuTopOffset,
  setSubmenuTopOffset,
  importanceButtonRef,
  handleBlocksMove,
  handleBlocksDelete,
  handleDeleteSelectedBlocks,
  handleApplyImportance
}: UseRightPanelMenusProps) => {

  const renderDropdownMenu = () => {
    if (!showMenu) return null;

    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowMenu(false)}
        />
        <div
          style={{
            position: 'fixed',
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            backgroundColor: 'white',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            padding: '8px 0',
            minWidth: '150px',
            zIndex: 1001
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              color: '#666',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '4px'
            }}
          >
            {selectedBlocks.length}개 블록 선택됨
          </div>
          <button
            onClick={() => {
              handleBlocksMove('up');
              setShowMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ↑ 위로 이동
          </button>
          <button
            onClick={() => {
              handleBlocksMove('down');
              setShowMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ↓ 아래로 이동
          </button>
          <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
          <button
            onClick={() => {
              handleBlocksDelete();
              setShowMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left',
              color: '#ff4444'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            삭제
          </button>
          <button
            onClick={() => {
              setSelectedBlocks([]);
              setShowMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            선택 해제
          </button>
        </div>
      </>
    );
  };

  const renderContextMenu = () => {
    if (!showContextMenu) return null;

    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => {
            setShowContextMenu(false);
            setShowImportanceSubmenu(false);
          }}
        />
        <div
          data-context-menu="true"
          style={{
            position: 'fixed',
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
            backgroundColor: 'white',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            padding: '8px 0',
            minWidth: '150px',
            zIndex: 1001
          }}
        >
          <button
            onClick={handleDeleteSelectedBlocks}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'left',
              color: '#ff4444'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            삭제
          </button>
          <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
          <div style={{ position: 'relative' }}>
            <button
              ref={importanceButtonRef}
              onClick={() => {
                if (!showImportanceSubmenu && importanceButtonRef.current) {
                  // 서브메뉴를 열 때 위치 계산
                  const rect = importanceButtonRef.current.getBoundingClientRect();
                  const submenuWidth = 140;
                  const submenuHeight = 280; // 8개 항목 * 약 34px + 구분선
                  const spaceOnRight = window.innerWidth - rect.right;
                  const spaceBelow = window.innerHeight - rect.top;

                  // 오른쪽에 공간이 충분하면 오른쪽에, 아니면 왼쪽에 표시
                  setSubmenuPosition(spaceOnRight >= submenuWidth + 10 ? 'right' : 'left');

                  // 아래쪽 경계 체크 - 서브메뉴가 화면 아래로 나가면 위로 조정
                  let topOffset = 0;
                  if (spaceBelow < submenuHeight + 10) {
                    topOffset = Math.max(-(submenuHeight - spaceBelow + 10), -(rect.top - 10));
                  }
                  setSubmenuTopOffset(topOffset);
                }
                setShowImportanceSubmenu(!showImportanceSubmenu);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              중요도 부여
              <span style={{ fontSize: '12px', color: '#6b7280' }}>▶</span>
            </button>

            {/* 중요도 서브메뉴 */}
            {showImportanceSubmenu && (
              <div
                data-context-menu="true"
                style={{
                  position: 'absolute',
                  ...(submenuPosition === 'right'
                    ? { left: '100%', marginLeft: '4px' }
                    : { right: '100%', marginRight: '4px' }
                  ),
                  top: submenuTopOffset,
                  backgroundColor: 'white',
                  border: '1px solid #e1e5e9',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  padding: '8px 0',
                  minWidth: '140px',
                  zIndex: 1002
                }}
              >
                <button
                  onClick={() => handleApplyImportance('critical')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.critical, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.critical}
                </button>
                <button
                  onClick={() => handleApplyImportance('important')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff7ed'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.important, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.important}
                </button>
                <button
                  onClick={() => handleApplyImportance('opinion')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef9c3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.opinion, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.opinion}
                </button>
                <button
                  onClick={() => handleApplyImportance('reference')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.reference, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.reference}
                </button>
                <button
                  onClick={() => handleApplyImportance('question')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.question, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.question}
                </button>
                <button
                  onClick={() => handleApplyImportance('idea')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.idea, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.idea}
                </button>
                <button
                  onClick={() => handleApplyImportance('data')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.data, borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.data}
                </button>
                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 8px' }} />
                <button
                  onClick={() => handleApplyImportance('none')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.none, border: '1px solid #e5e7eb', borderRadius: '3px', display: 'inline-block' }}></span>
                  {IMPORTANCE_LABELS.none}
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return {
    renderDropdownMenu,
    renderContextMenu
  };
};
