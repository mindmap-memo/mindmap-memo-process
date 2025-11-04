import React, { useState } from 'react';
import { Paperclip, Type, Image as ImageIcon, FileText } from 'lucide-react';

interface UseAddBlockButtonProps {
  onAddBlock: (type: string) => void;
  show: boolean;
}

export const useAddBlockButton = ({ onAddBlock, show }: UseAddBlockButtonProps) => {
  const [showBlockMenu, setShowBlockMenu] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const blockTypes = [
    { type: 'text', label: '텍스트', icon: Type },
    { type: 'image', label: '이미지', icon: ImageIcon },
    { type: 'file', label: '파일', icon: FileText },
  ];

  const renderAddBlockButton = () => {
    if (!show) return null;

    return (
      <>
        <button
          ref={buttonRef}
          onClick={() => setShowBlockMenu(!showBlockMenu)}
          style={{
            position: 'fixed',
            right: '32px',
            bottom: '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#8b5cf6',
            border: 'none',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 100,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Paperclip size={28} color="white" style={{
            transition: 'transform 0.2s ease'
          }} />
        </button>

        {showBlockMenu && (
          <>
            {/* 백드롭 */}
            <div
              onClick={() => setShowBlockMenu(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99,
              }}
            />

            {/* 블록 타입 메뉴 */}
            <div
              style={{
                position: 'fixed',
                right: '32px',
                bottom: '100px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                padding: '8px',
                minWidth: '200px',
                zIndex: 100,
              }}
            >
              {blockTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    onAddBlock(type);
                    setShowBlockMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={18} color="#6b7280" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return {
    renderAddBlockButton,
    setShowBlockMenu,
  };
};
