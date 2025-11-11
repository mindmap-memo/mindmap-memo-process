import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ImportanceLevel } from '../../../types';
import { Copy, Clipboard, Scissors, Trash2, Star, ChevronRight } from 'lucide-react';

const IMPORTANCE_LABELS = {
  critical: '🔴 매우중요',
  important: '🟠 중요',
  opinion: '🟣 의견',
  reference: '🔵 참고',
  question: '🟡 질문',
  idea: '🟢 아이디어',
  data: '⚫ 데이터',
  none: '강조 해제'
};

interface MobileSelectionMenuProps {
  position: { x: number; y: number };
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onDelete: () => void;
  onApplyImportance: (level: ImportanceLevel) => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export const MobileSelectionMenu: React.FC<MobileSelectionMenuProps> = ({
  position,
  onCopy,
  onPaste,
  onCut,
  onDelete,
  onApplyImportance,
  onClose,
  menuRef
}) => {
  const [showImportanceSubmenu, setShowImportanceSubmenu] = useState(false);

  const mainMenuItems = [
    { icon: <Copy size={18} />, label: '복사', action: () => { onCopy(); onClose(); } },
    { icon: <Clipboard size={18} />, label: '붙여넣기', action: () => { onPaste(); onClose(); } },
    { icon: <Scissors size={18} />, label: '잘라내기', action: () => { onCut(); onClose(); } },
    { icon: <Trash2 size={18} />, label: '삭제', action: () => { onDelete(); onClose(); }, danger: true },
    {
      icon: <Star size={18} />,
      label: '중요도 부여',
      action: () => setShowImportanceSubmenu(!showImportanceSubmenu),
      hasSubmenu: true
    }
  ];

  return ReactDOM.createPortal(
    <>
      {/* 메인 메뉴 */}
      <div
        ref={menuRef}
        onMouseDown={(e) => e.preventDefault()} // 선택 해제 방지
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          zIndex: 10000,
          padding: '8px',
          minWidth: '180px',
          maxWidth: '220px'
        }}
      >
        {mainMenuItems.map((item, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              item.action();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '15px',
              fontFamily: 'inherit',
              color: item.danger ? '#ef4444' : '#1f2937',
              gap: '12px',
              transition: 'background-color 0.15s ease'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = item.danger ? '#fef2f2' : '#f3f4f6';
            }}
            onTouchEnd={(e) => {
              setTimeout(() => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }, 150);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.hasSubmenu && (
              <ChevronRight
                size={16}
                style={{
                  opacity: 0.5,
                  transform: showImportanceSubmenu ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            )}
          </button>
        ))}

        {/* 중요도 서브메뉴 */}
        {showImportanceSubmenu && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            {Object.entries(IMPORTANCE_LABELS).map(([level, label]) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyImportance(level as ImportanceLevel);
                  onClose();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  color: '#1f2937',
                  transition: 'background-color 0.15s ease'
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onTouchEnd={(e) => {
                  setTimeout(() => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }, 150);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body
  );
};
