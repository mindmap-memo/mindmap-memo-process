import React from 'react';

interface UseEmptySpaceMenuProps {
  showEmptySpaceMenu: boolean;
  emptySpaceMenuPosition: { x: number; y: number };
  handleFileAttach: () => void;
  handleAddTextBlock: () => void;
}

export const useEmptySpaceMenu = ({
  showEmptySpaceMenu,
  emptySpaceMenuPosition,
  handleFileAttach,
  handleAddTextBlock
}: UseEmptySpaceMenuProps) => {

  const renderEmptySpaceMenu = () => {
    if (!showEmptySpaceMenu) return null;

    return (
      <div
        data-context-menu="true"
        style={{
          position: 'fixed',
          left: `${emptySpaceMenuPosition.x}px`,
          top: `${emptySpaceMenuPosition.y}px`,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '4px',
          zIndex: 10000,
          minWidth: '160px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onClick={handleFileAttach}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span>📎</span>
          <span>파일 첨부</span>
        </div>
        <div
          onClick={handleAddTextBlock}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span>➕</span>
          <span>입력창 추가</span>
        </div>
      </div>
    );
  };

  return {
    renderEmptySpaceMenu
  };
};
