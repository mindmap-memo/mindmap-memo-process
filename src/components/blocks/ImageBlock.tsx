import React, { useState } from 'react';
import { ImageBlock } from '../../types';

interface ImageBlockProps {
  block: ImageBlock;
  isEditing?: boolean;
  onUpdate?: (block: ImageBlock) => void;
}

const ImageBlockComponent: React.FC<ImageBlockProps> = ({ 
  block, 
  isEditing = false, 
  onUpdate 
}) => {
  const [url, setUrl] = useState(block.url);
  const [alt, setAlt] = useState(block.alt || '');
  const [caption, setCaption] = useState(block.caption || '');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ 
        ...block, 
        url, 
        alt: alt || undefined, 
        caption: caption || undefined 
      });
    }
    setIsLocalEditing(false);
  };

  const handleCancel = () => {
    setUrl(block.url);
    setAlt(block.alt || '');
    setCaption(block.caption || '');
    setIsLocalEditing(false);
  };

  if (isEditing && isLocalEditing) {
    return (
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '8px'
          }}
          placeholder="이미지 URL을 입력하세요..."
        />
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '8px'
          }}
          placeholder="대체 텍스트 (선택사항)"
        />
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleSave}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '8px'
          }}
          placeholder="이미지 설명 (선택사항)"
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            저장
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => isEditing && setIsLocalEditing(true)}
      style={{
        marginBottom: '8px',
        cursor: isEditing ? 'pointer' : 'default',
        border: isEditing ? '1px dashed #ddd' : 'none',
        borderRadius: '4px',
        padding: isEditing ? '8px' : '0'
      }}
    >
      {block.url ? (
        <div>
          <img
            src={block.url}
            alt={block.alt || '이미지'}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              display: 'block'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {block.caption && (
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              {block.caption}
            </div>
          )}
        </div>
      ) : (
        isEditing && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            border: '2px dashed #ddd',
            borderRadius: '4px'
          }}>
            📷 이미지를 추가하려면 클릭하세요
          </div>
        )
      )}
    </div>
  );
};

export default ImageBlockComponent;