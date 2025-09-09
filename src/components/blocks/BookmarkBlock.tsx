import React, { useState } from 'react';
import { BookmarkBlock } from '../../types';

interface BookmarkBlockProps {
  block: BookmarkBlock;
  isEditing?: boolean;
  onUpdate?: (block: BookmarkBlock) => void;
}

const BookmarkBlockComponent: React.FC<BookmarkBlockProps> = ({ 
  block, 
  isEditing = false, 
  onUpdate 
}) => {
  const [url, setUrl] = useState(block.url);
  const [title, setTitle] = useState(block.title || '');
  const [description, setDescription] = useState(block.description || '');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ 
        ...block, 
        url, 
        title: title || undefined, 
        description: description || undefined 
      });
    }
    setIsLocalEditing(false);
  };

  if (isEditing && isLocalEditing) {
    return (
      <div style={{ marginBottom: '8px', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL을 입력하세요..."
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px' }}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 (선택사항)"
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px' }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleSave}
          placeholder="설명 (선택사항)"
          style={{ width: '100%', height: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => isEditing && setIsLocalEditing(true)}
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: isEditing ? 'pointer' : 'default',
        backgroundColor: 'white'
      }}
    >
      {block.image && (
        <img
          src={block.image}
          alt=""
          style={{
            width: '100%',
            height: '120px',
            objectFit: 'cover'
          }}
        />
      )}
      <div style={{ padding: '12px' }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px', 
          marginBottom: '4px',
          color: '#1a1a1a'
        }}>
          {block.title || new URL(block.url).hostname}
        </div>
        {block.description && (
          <div style={{ 
            fontSize: '13px', 
            color: '#666', 
            marginBottom: '8px',
            lineHeight: '1.4'
          }}>
            {block.description}
          </div>
        )}
        <div style={{ 
          fontSize: '12px', 
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {block.favicon && (
            <img
              src={block.favicon}
              alt=""
              style={{ width: '16px', height: '16px' }}
            />
          )}
          <span>{new URL(block.url).hostname}</span>
        </div>
      </div>
      {!isEditing && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.preventDefault();
          window.open(block.url, '_blank');
        }}
        />
      )}
    </div>
  );
};

export default BookmarkBlockComponent;