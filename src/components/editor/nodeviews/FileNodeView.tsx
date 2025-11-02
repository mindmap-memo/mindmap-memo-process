'use client';

import React from 'react';
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

export default function FileNodeView({ node, deleteNode, updateAttributes }: NodeViewProps) {
  const { fileName, fileSize, fileType, fileData, importance } = node.attrs;
  const [isHovered, setIsHovered] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });

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

  return (
    <NodeViewWrapper
      className="file-node"
      data-importance={importance && importance !== 'none' ? importance : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        paddingLeft: '8px', // 드래그 핸들 공간
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
        {/* 드래그 핸들 - TipTap data-drag-handle 사용 */}
        <div
          contentEditable={false}
          data-drag-handle
          style={{
            cursor: 'grab',
            padding: '0 4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.1s ease',
            fontSize: '14px',
            color: '#9ca3af',
            lineHeight: '1',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
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
        {renderPreview()}
    </NodeViewWrapper>
  );
}
