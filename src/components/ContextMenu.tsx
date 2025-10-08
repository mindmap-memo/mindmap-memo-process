import React from 'react';
import ReactDOM from 'react-dom';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDelete: () => void;
  onSetQuickNav: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  onDelete,
  onSetQuickNav
}) => {
  if (!position) return null;

  // 컨텍스트 메뉴가 화면 밖으로 나가지 않도록 조정
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 100)
  };

  // Portal을 사용하여 document.body에 직접 렌더링 (캔버스 transform 영향 제거)
  return ReactDOM.createPortal(
    <>
      {/* 배경 클릭 시 닫기 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
        onClick={onClose}
      />

      {/* 메뉴 */}
      <div
        style={{
          position: 'fixed',
          top: `${adjustedPosition.y}px`,
          left: `${adjustedPosition.x}px`,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          minWidth: '180px',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetQuickNav();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#374151',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <span>⭐</span>
          <span>단축 이동 설정</span>
        </button>

        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0' }} />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#ef4444',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <span>🗑️</span>
          <span>삭제</span>
        </button>
      </div>
    </>,
    document.body
  );
};

export default ContextMenu;
