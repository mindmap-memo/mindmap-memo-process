'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import { ImportanceLevel } from '../../types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../utils/importanceStyles';

interface ImportanceToolbarProps {
  editor: Editor;
}

export default function ImportanceToolbar({ editor }: ImportanceToolbarProps) {
  const [show, setShow] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    let isDraggingNode = false;

    const handleDragStart = () => {
      isDraggingNode = true;
      setShow(false);
    };

    const handleDragEnd = () => {
      isDraggingNode = false;
    };

    const updatePosition = () => {
      const { state } = editor;
      const { from, to } = state.selection;

      // 드래그 중이면 툴바 숨김
      if (isDraggingNode) {
        setShow(false);
        return;
      }

      // 텍스트가 선택되지 않았으면 툴바 숨김
      if (from === to) {
        setShow(false);
        return;
      }

      // 선택된 노드가 텍스트 블록이 아니면 툴바 숨김
      const { $from } = state.selection;
      if ($from.parent.type.name !== 'textBlock') {
        setShow(false);
        return;
      }

      // 선택된 텍스트의 위치 계산
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);

      // 모바일 환경 감지
      const isMobile = window.innerWidth <= 768;

      // PC와 모바일 모두 선택 영역 위에 배치
      // 메뉴 하단이 선택 영역 상단 위쪽 10px에 오도록
      setPosition({
        top: start.top - 10,
        left: (start.left + end.right) / 2,
      });
      setShow(true);
    };

    // 드래그 이벤트 리스너 추가
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor]);

  const handleImportanceClick = (level: ImportanceLevel) => {
    editor.chain().focus().setImportance(level).run();
    setShow(false);
  };

  const handleRemoveImportance = () => {
    editor.chain().focus().unsetImportance().run();
    setShow(false);
  };

  if (!show) return null;

  const importanceLevels: ImportanceLevel[] = [
    'critical',
    'important',
    'opinion',
    'reference',
    'question',
    'idea',
    'data'
  ];

  const getHoverColor = (level: ImportanceLevel) => {
    const hoverColors: Record<ImportanceLevel, string> = {
      critical: '#fef2f2',
      important: '#fff7ed',
      opinion: '#fef9c3',
      reference: '#f0fdf4',
      question: '#fce7f3',
      idea: '#fef9c3',
      data: '#d1fae5',
      none: '#ffffff'
    };
    return hoverColors[level];
  };

  // 화면 밖으로 나가지 않도록 위치 조정
  const menuWidth = 160;
  const menuHeight = 280; // 대략적인 메뉴 높이
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 10;

  let adjustedTop = position.top;
  let adjustedLeft = position.left;

  // X 위치 경계 체크 (transform: translateX(-50%))
  if (adjustedLeft - menuWidth / 2 < padding) {
    adjustedLeft = menuWidth / 2 + padding;
  }
  if (adjustedLeft + menuWidth / 2 > viewportWidth - padding) {
    adjustedLeft = viewportWidth - menuWidth / 2 - padding;
  }

  // Y 위치 경계 체크 (transform: translateY(-100%))
  if (adjustedTop - menuHeight < padding) {
    adjustedTop = menuHeight + padding;
  }
  if (adjustedTop > viewportHeight - padding) {
    adjustedTop = viewportHeight - padding;
  }

  return (
    <div
      data-context-menu="true"
      style={{
        position: 'fixed',
        top: `${adjustedTop}px`,
        left: `${adjustedLeft}px`,
        transform: 'translate(-50%, -100%)', // PC/모바일 모두 위쪽에 표시
        backgroundColor: 'white',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        padding: '8px 0',
        minWidth: '160px',
        zIndex: 1002,
      }}
    >
      {importanceLevels.map((level) => (
        <button
          key={level}
          onClick={() => handleImportanceClick(level)}
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getHoverColor(level)}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{
            width: '16px',
            height: '16px',
            backgroundColor: IMPORTANCE_COLORS[level],
            borderRadius: '3px',
            display: 'inline-block'
          }}></span>
          {IMPORTANCE_LABELS[level]}
        </button>
      ))}
      <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
      <button
        onClick={handleRemoveImportance}
        style={{
          width: '100%',
          padding: '8px 16px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: '14px',
          textAlign: 'left',
          color: '#6b7280'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        중요도 제거
      </button>
    </div>
  );
}
