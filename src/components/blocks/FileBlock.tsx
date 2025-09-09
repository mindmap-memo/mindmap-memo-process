import React, { useState } from 'react';
import { FileBlock } from '../../types';

interface FileBlockProps {
  block: FileBlock;
  isEditing?: boolean;
  onUpdate?: (block: FileBlock) => void;
}

const FileBlockComponent: React.FC<FileBlockProps> = ({ 
  block, 
  isEditing = false, 
  onUpdate 
}) => {
  const [url, setUrl] = useState(block.url);
  const [name, setName] = useState(block.name);
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...block, url, name });
    }
    setIsLocalEditing(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isEditing && isLocalEditing) {
    return (
      <div style={{ marginBottom: '8px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="파일 URL을 입력하세요..."
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px' }}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          placeholder="파일명"
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => isEditing && setIsLocalEditing(true)}
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        cursor: isEditing ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <div style={{ fontSize: '24px' }}>📎</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500', fontSize: '14px' }}>
          {block.name || (isEditing ? '파일을 추가하려면 클릭하세요' : '파일')}
        </div>
        {block.size && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            {formatFileSize(block.size)}
          </div>
        )}
      </div>
      {block.url && !isEditing && (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          다운로드
        </a>
      )}
    </div>
  );
};

export default FileBlockComponent;