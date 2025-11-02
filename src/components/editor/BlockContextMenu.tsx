'use client';

import React from 'react';
import { ImportanceLevel } from '../../types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../utils/importanceStyles';
import { Trash2 } from 'lucide-react';

interface BlockContextMenuProps {
  show: boolean;
  position: { x: number; y: number };
  onDelete: () => void;
  onSetImportance: (level: ImportanceLevel) => void;
  onClose: () => void;
  currentImportance?: ImportanceLevel;
}

export default function BlockContextMenu({
  show,
  position,
  onDelete,
  onSetImportance,
  onClose,
  currentImportance,
}: BlockContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  const importanceLevels: ImportanceLevel[] = [
    'critical',
    'important',
    'opinion',
    'reference',
    'question',
    'idea',
    'data',
    'none'
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: 'white',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        padding: '4px 0',
        minWidth: '180px',
        zIndex: 1002,
      }}
    >
      {/* 삭제 버튼 */}
      <button
        onClick={() => {
          onDelete();
          onClose();
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
          gap: '8px',
          color: '#ef4444',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Trash2 size={16} />
        블록 삭제
      </button>

      <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />

      {/* 중요도 설정 */}
      <div style={{ padding: '4px 0' }}>
        <div style={{
          padding: '4px 16px',
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: 500
        }}>
          중요도 설정
        </div>
        {importanceLevels.map((level) => (
          <button
            key={level}
            onClick={() => {
              onSetImportance(level);
              onClose();
            }}
            style={{
              width: '100%',
              padding: '6px 16px',
              border: 'none',
              backgroundColor: currentImportance === level ? '#f0f9ff' : 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (currentImportance !== level) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (currentImportance !== level) {
                e.currentTarget.style.backgroundColor = 'transparent';
              } else {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
              }
            }}
          >
            <span style={{
              width: '16px',
              height: '16px',
              backgroundColor: IMPORTANCE_COLORS[level],
              borderRadius: '3px',
              display: 'inline-block'
            }}></span>
            {IMPORTANCE_LABELS[level]}
            {currentImportance === level && (
              <span style={{ marginLeft: 'auto', color: '#3b82f6' }}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
