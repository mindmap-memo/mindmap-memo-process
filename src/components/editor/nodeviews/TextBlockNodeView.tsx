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
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const { importance } = node.attrs;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  // 수동 드래그 구현
  const handleDragStart = (e: React.DragEvent) => {
    if (!editor || typeof getPos !== 'function') return;

    const pos = getPos();

    // 드래그 데이터에 노드 위치와 JSON 저장
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-tiptap-node-pos', pos.toString());
    e.dataTransfer.setData('application/x-tiptap-node-type', node.type.name);
    e.dataTransfer.setData('application/x-tiptap-node-data', JSON.stringify(node.toJSON()));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!editor || typeof getPos !== 'function') return;

    const draggedPosStr = e.dataTransfer.getData('application/x-tiptap-node-pos');
    const draggedNodeDataStr = e.dataTransfer.getData('application/x-tiptap-node-data');

    if (!draggedPosStr || !draggedNodeDataStr) return;

    const draggedPos = parseInt(draggedPosStr, 10);
    const dropPos = getPos();

    if (draggedPos === dropPos) return; // 같은 위치면 무시

    try {
      const draggedNodeData = JSON.parse(draggedNodeDataStr);

      // TipTap 명령어로 안전하게 이동
      const { state } = editor;
      const draggedNode = state.doc.nodeAt(draggedPos);

      if (!draggedNode) return;

      // 드롭 위치 계산
      let targetPos = dropPos + node.nodeSize;

      // 위에서 아래로 이동하는 경우 위치 조정
      if (draggedPos < dropPos) {
        targetPos = dropPos;
      }

      // TipTap 체인 명령으로 안전하게 이동
      editor.chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (!dispatch) return false;

          // 노드 슬라이스 추출
          const slice = state.doc.slice(draggedPos, draggedPos + draggedNode.nodeSize);

          // 삭제 후 삽입 위치 재계산
          let insertPos = targetPos;
          if (draggedPos < targetPos) {
            insertPos = targetPos - draggedNode.nodeSize;
          }

          // 1. 원본 노드 삭제
          tr.delete(draggedPos, draggedPos + draggedNode.nodeSize);

          // 2. 새 위치에 삽입
          tr.insert(insertPos, slice.content);

          return true;
        })
        .run();

    } catch (error) {
      console.error('Drop error:', error);
    }
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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        display: 'block',
        position: 'relative',
        margin: '2px 0',
        padding: '2px',
        borderRadius: '2px',
        transition: 'background-color 0.1s ease',
        minHeight: '24px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* 드래그 핸들 */}
        <div
          ref={dragHandleRef}
          contentEditable={false}
          draggable={true}
          onDragStart={handleDragStart}
          style={{
            cursor: 'grab',
            padding: '2px 4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.1s ease',
            fontSize: '14px',
            color: '#9ca3af',
            lineHeight: '1',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: 0,
          }}
        >
          ⋮⋮
        </div>

        {/* 에디터 콘텐츠 */}
        <NodeViewContent
          ref={contentRef}
          as="div"
          style={{
            flex: 1,
            minWidth: 0,
            outline: 'none',
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}
