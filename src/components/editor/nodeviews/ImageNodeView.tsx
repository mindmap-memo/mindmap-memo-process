'use client';

import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImportanceLevel } from '../../../types';
import BlockContextMenu from '../BlockContextMenu';

export default function ImageNodeView({ node, deleteNode, updateAttributes }: NodeViewProps) {
  const { src, alt, importance } = node.attrs;
  const [isHovered, setIsHovered] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });

  // src가 비어있으면 플레이스홀더 표시
  if (!src) {
    return (
      <NodeViewWrapper
        className="image-node"
        style={{
          margin: '8px 0',
          padding: '12px',
          paddingLeft: '36px',
          position: 'relative',
          border: '1px dashed #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        이미지 로딩 중...
      </NodeViewWrapper>
    );
  }

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
  };

  return (
    <NodeViewWrapper
      className="image-node"
      data-importance={importance && importance !== 'none' ? importance : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        margin: '8px 0',
        padding: '0',
        paddingLeft: '8px', // 드래그 핸들 공간
        position: 'relative',
        display: 'flex',
        gap: '4px',
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
        onDragStart={(e) => {
          e.currentTarget.style.cursor = 'grabbing';
        }}
        onDragEnd={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
        style={{
          cursor: 'grab',
          padding: '0 4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.1s ease',
          fontSize: '14px',
          color: '#9ca3af',
          lineHeight: '1.2',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ⋮⋮
      </div>

      <img
        src={src}
        alt={alt || ''}
        draggable={false}
        style={{
          maxWidth: '100%',
          maxHeight: '400px',
          height: 'auto',
          borderRadius: '8px',
          display: 'block',
          cursor: 'pointer',
          userSelect: 'none',
          pointerEvents: 'auto',
        }}
        onClick={() => {
          // 이미지 클릭 시 새 탭에서 열기
          window.open(src, '_blank');
        }}
      />
    </NodeViewWrapper>
  );
}
