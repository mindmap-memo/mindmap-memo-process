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
  const menuWidth = 180;
  const menuHeight = 90; // 대략적인 메뉴 높이 (2개 항목)
  const padding = 10; // 화면 가장자리 여유 공간

  let x = position.x;
  let y = position.y;

  // 오른쪽 경계 체크
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - padding;
  }

  // 왼쪽 경계 체크
  if (x < padding) {
    x = padding;
  }

  // 아래쪽 경계 체크
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - padding;
  }

  // 위쪽 경계 체크
  if (y < padding) {
    y = padding;
  }

  const adjustedPosition = { x, y };

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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M3 4H13M5 4V3C5 2.5 5.5 2 6 2H10C10.5 2 11 2.5 11 3V4M6.5 7.5V11.5M9.5 7.5V11.5M4 4H12V13C12 13.5 11.5 14 11 14H5C4.5 14 4 13.5 4 13V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>삭제</span>
        </button>
      </div>
    </>,
    document.body
  );
};

export default ContextMenu;
