'use client';

import React, { useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Archive
} from 'lucide-react';
import { ImportanceLevel } from '../../../types';
import BlockContextMenu from '../BlockContextMenu';

export default function FileNodeView({ node, deleteNode, updateAttributes, editor, getPos }: NodeViewProps) {
  const { fileName, fileSize, fileType, fileData, importance } = node.attrs;
  const [isHovered, setIsHovered] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (type: string) => {
    const iconProps = { size: 32, strokeWidth: 1.5 };
    if (type.startsWith('image/')) return <FileImage {...iconProps} />;
    if (type.startsWith('video/')) return <FileVideo {...iconProps} />;
    if (type.startsWith('audio/')) return <FileAudio {...iconProps} />;
    if (type.includes('pdf')) return <FileText {...iconProps} />;
    if (type.includes('word') || type.includes('document')) return <FileText {...iconProps} />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FileSpreadsheet {...iconProps} />;
    if (type.includes('powerpoint') || type.includes('presentation')) return <FileCode {...iconProps} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return <Archive {...iconProps} />;
    return <FileIcon {...iconProps} />;
  };

  const renderPreview = () => {
    if (fileType.startsWith('image/')) {
      return (
        <img
          src={fileData}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '200px',
            borderRadius: '4px',
            marginTop: '8px',
          }}
        />
      );
    }

    if (fileType.startsWith('video/')) {
      return (
        <video
          src={fileData}
          controls
          style={{
            maxWidth: '100%',
            maxHeight: '200px',
            borderRadius: '4px',
            marginTop: '8px',
          }}
        />
      );
    }

    if (fileType.startsWith('audio/')) {
      return (
        <audio
          src={fileData}
          controls
          style={{
            width: '100%',
            marginTop: '8px',
          }}
        />
      );
    }

    if (fileType === 'application/pdf') {
      return (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          PDF 파일 미리보기는 다운로드 후 확인하세요
        </div>
      );
    }

    return null;
  };

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

  // 네이티브 dragover 이벤트 리스너 등록
  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleNativeDragOver = (e: DragEvent) => {
      const hasNodeData = e.dataTransfer?.types.includes('application/x-tiptap-node-pos');
      if (hasNodeData) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      }
    };

    wrapper.addEventListener('dragover', handleNativeDragOver, true);

    return () => {
      wrapper.removeEventListener('dragover', handleNativeDragOver, true);
    };
  }, []);

  // 수동 드래그 구현
  const handleDragStart = (e: React.DragEvent) => {
    if (!editor || typeof getPos !== 'function') return;

    const pos = getPos();
    if (typeof pos !== 'number') return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-tiptap-node-pos', pos.toString());
    e.dataTransfer.setData('application/x-tiptap-node-type', node.type.name);
    e.dataTransfer.setData('application/x-tiptap-node-data', JSON.stringify(node.toJSON()));

    const transparentImg = document.createElement('img');
    transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(transparentImg, 0, 0);

    document.body.classList.add('dragging-tiptap-block');

    const globalDragOverHandler = (nativeEvent: DragEvent) => {
      nativeEvent.preventDefault();
      if (nativeEvent.dataTransfer) {
        nativeEvent.dataTransfer.dropEffect = 'move';
      }
    };

    document.addEventListener('dragover', globalDragOverHandler, true);

    const cleanupListener = () => {
      document.removeEventListener('dragover', globalDragOverHandler, true);
      document.removeEventListener('dragend', cleanupListener);
      document.removeEventListener('drop', cleanupListener);
    };

    document.addEventListener('dragend', cleanupListener);
    document.addEventListener('drop', cleanupListener);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    document.body.classList.remove('dragging-tiptap-block');

    if (editor) {
      requestAnimationFrame(() => {
        editor.commands.focus();
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    const hasNodeData = e.dataTransfer.types.includes('application/x-tiptap-node-pos');

    if (hasNodeData) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor || typeof getPos !== 'function') return;

    const draggedPosStr = e.dataTransfer.getData('application/x-tiptap-node-pos');
    const draggedNodeDataStr = e.dataTransfer.getData('application/x-tiptap-node-data');

    if (!draggedPosStr || !draggedNodeDataStr) return;

    const draggedPos = parseInt(draggedPosStr, 10);
    const dropPos = getPos();
    if (typeof dropPos !== 'number') return;

    if (draggedPos === dropPos) return;

    try {
      const { state } = editor;
      const draggedNode = state.doc.nodeAt(draggedPos);

      if (!draggedNode) return;

      const dropElement = e.currentTarget as HTMLElement;
      const rect = dropElement.getBoundingClientRect();
      const mouseY = e.clientY;
      const blockMiddle = rect.top + rect.height / 2;
      const isDropAbove = mouseY < blockMiddle;

      let targetPos: number;

      if (isDropAbove) {
        targetPos = dropPos;
      } else {
        targetPos = dropPos + node.nodeSize;
      }

      if (draggedPos + draggedNode.nodeSize === targetPos) return;

      editor.chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (!dispatch) return false;

          try {
            const slice = state.doc.slice(draggedPos, draggedPos + draggedNode.nodeSize);

            let deleteFrom = draggedPos;
            let deleteTo = draggedPos + draggedNode.nodeSize;
            let insertAt = targetPos;

            if (draggedPos < targetPos) {
              tr.insert(insertAt, slice.content);
              tr.delete(deleteFrom, deleteTo);
            } else {
              tr.delete(deleteFrom, deleteTo);
              tr.insert(insertAt, slice.content);
            }

            return true;
          } catch (err) {
            console.error('❌ [Drop] 트랜잭션 에러:', err);
            return false;
          }
        })
        .run();

    } catch (error) {
      console.error('❌ [Drop] 전체 에러:', error);
    }
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef as any}
      className="file-node"
      data-importance={importance && importance !== 'none' ? importance : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      onDragOverCapture={handleDragOver}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        paddingLeft: '8px',
        marginTop: '8px',
        marginBottom: '8px',
        backgroundColor: (!importance || importance === 'none') ? '#fafafa' : undefined,
        display: 'flex',
        gap: '4px',
        position: 'relative',
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
      <div
        style={{ display: 'flex', gap: '4px', width: '100%' }}
        onDragOverCapture={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 드래그 핸들 */}
        <div
          ref={dragHandleRef}
          contentEditable={false}
          draggable="true"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            cursor: 'grab',
            paddingLeft: '4px',
            paddingRight: '4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.1s ease',
            fontSize: '14px',
            color: '#9ca3af',
            lineHeight: '1',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.cursor = 'grabbing';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.cursor = 'grab';
          }}
        >
          ⋮⋮
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div>
            {getFileIcon(fileType)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1f2937',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {fileName}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '2px',
            }}>
              {formatFileSize(fileSize)}
            </div>
          </div>
          <button
            onClick={handleDownload}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            다운로드
          </button>
        </div>
      </div>
      {renderPreview()}
    </NodeViewWrapper>
  );
}
