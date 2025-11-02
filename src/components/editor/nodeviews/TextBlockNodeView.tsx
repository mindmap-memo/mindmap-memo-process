'use client';

import React, { useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImportanceLevel } from '../../../types';
import BlockContextMenu from '../BlockContextMenu';

export default function TextBlockNodeView({ node, selected, updateAttributes, deleteNode, getPos, editor }: NodeViewProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = React.useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });

  const { importance } = node.attrs;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    deleteNode();
  };

  const handleSetImportance = (level: ImportanceLevel) => {
    updateAttributes({ importance: level });

    // 블록 내의 모든 텍스트에 ImportanceMark 적용
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const from = pos + 1; // 블록 시작 위치
      const to = pos + node.nodeSize - 1; // 블록 끝 위치

      if (level === 'none') {
        // 중요도 제거
        editor.chain()
          .setTextSelection({ from, to })
          .unsetMark('importanceMark')
          .run();
      } else {
        // 중요도 적용
        editor.chain()
          .setTextSelection({ from, to })
          .setMark('importanceMark', { importance: level })
          .run();
      }
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      className="text-block-wrapper"
      data-importance={importance && importance !== 'none' ? importance : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        margin: '0',
        padding: '1px 2px',
        borderRadius: '2px',
        position: 'relative',
        transition: 'background-color 0.1s ease',
        minHeight: '20px',
        backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
      }}
    >
      <BlockContextMenu
        show={contextMenu.show}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onDelete={handleDelete}
        onSetImportance={handleSetImportance}
        onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
        currentImportance={importance as ImportanceLevel}
      />
      {/* 드래그 핸들 */}
      <div
        contentEditable={false}
        draggable="true"
        data-drag-handle
        onMouseDown={(e) => {
          // 드래그 핸들 클릭 시 텍스트 선택 방지
          e.stopPropagation();
        }}
        onDragStart={(e) => {
          // 드래그 중임을 표시
          e.currentTarget.style.cursor = 'grabbing';
          e.stopPropagation();
        }}
        onDragEnd={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
        style={{
          cursor: 'grab',
          padding: '0 2px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.1s ease',
          fontSize: '14px',
          color: '#9ca3af',
          lineHeight: '1.2',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          position: 'relative',
          zIndex: 10,
        }}
      >
        ⋮⋮
      </div>

      {/* 에디터 콘텐츠 */}
      <NodeViewContent
        ref={contentRef}
        as="div"
        onDragStart={(e) => {
          // 텍스트 영역에서 시작된 드래그는 차단
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        onDrag={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        style={{
          flex: 1,
          minWidth: 0,
          outline: 'none',
          WebkitUserDrag: 'none',
        } as React.CSSProperties}
      />
    </NodeViewWrapper>
  );
}
