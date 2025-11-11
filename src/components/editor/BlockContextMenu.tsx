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

  // 메뉴가 화면 밖으로 나가지 않도록 위치 조정
  const menuWidth = 180;
  const menuHeight = 400; // 대략적인 메뉴 높이
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 10; // 화면 가장자리 여백

  let adjustedX = position.x;
  let adjustedY = position.y;

  // X 위치 경계 체크
  // transform: translateX(-50%)를 고려하여 메뉴가 중앙 정렬됨
  // 왼쪽 경계: adjustedX - menuWidth/2 >= padding
  if (adjustedX - menuWidth / 2 < padding) {
    adjustedX = menuWidth / 2 + padding;
  }
  // 오른쪽 경계: adjustedX + menuWidth/2 <= viewportWidth - padding
  if (adjustedX + menuWidth / 2 > viewportWidth - padding) {
    adjustedX = viewportWidth - menuWidth / 2 - padding;
  }

  // Y 위치 경계 체크
  // transform: translateY(-100%)를 고려하여 메뉴가 위로 올라감
  // position.y는 메뉴 하단 위치이므로, 실제 메뉴 상단은 adjustedY - menuHeight
  // 위쪽 경계: adjustedY - menuHeight >= padding
  if (adjustedY - menuHeight < padding) {
    adjustedY = menuHeight + padding;
  }
  // 아래쪽 경계: adjustedY <= viewportHeight - padding
  if (adjustedY > viewportHeight - padding) {
    adjustedY = viewportHeight - padding;
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${adjustedY}px`,
        left: `${adjustedX}px`,
        transform: 'translate(-50%, -100%)', // 중앙 정렬 + 메뉴를 위로 올림
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
