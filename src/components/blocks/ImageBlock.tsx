import React, { useState, useRef } from 'react';
import { ImageBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

// 파일을 Base64로 변환하는 함수
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface ImageBlockProps {
  block: ImageBlock;
  isEditing?: boolean;
  onUpdate?: (block: ImageBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const ImageBlockComponent: React.FC<ImageBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);
  const [url, setUrl] = useState(block.url);
  const [alt, setAlt] = useState(block.alt || '');
  const [caption, setCaption] = useState(block.caption || '');
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [imageWidth, setImageWidth] = useState(block.width || 400);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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

  // 파일 처리 함수
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      setIsUploading(true);
      const base64Url = await fileToBase64(file);
      setUrl(base64Url);
      setAlt(file.name);

      if (onUpdate) {
        onUpdate({
          ...block,
          url: base64Url,
          alt: file.name
        });
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // 클립보드 붙여넣기 핸들러
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        handleFile(file);
      }
    }
  };

  // 리사이즈 핸들러
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = imageWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(100, Math.min(800, startWidth + deltaX));
      setImageWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 리사이즈 완료 시 블록 업데이트
      if (onUpdate) {
        onUpdate({
          ...block,
          width: imageWidth
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isEditing && isLocalEditing) {
    return (
      <div style={{ marginBottom: '8px' }} onPaste={handlePaste}>
        {/* 파일 업로드 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#007bff' : '#ddd'}`,
            borderRadius: '4px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '8px',
            backgroundColor: isDragOver ? '#f8f9fa' : 'transparent',
            transition: 'all 0.3s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {isUploading ? (
            <div>⏳ 업로드 중...</div>
          ) : (
            <div>
              📷 이미지를 드래그하거나 클릭해서 선택
              <br />
              <small style={{ color: '#666' }}>또는 Ctrl+V로 클립보드에서 붙여넣기</small>
            </div>
          )}
        </div>

        {/* URL 입력 */}
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          또는 URL 직접 입력
        </div>
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
          onPaste={handlePaste}
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
      onClick={() => isEditing && !block.url && setIsLocalEditing(true)}
      onPaste={isEditing ? handlePaste : undefined}
      onDragOver={isEditing && !block.url ? handleDragOver : undefined}
      onDragLeave={isEditing && !block.url ? handleDragLeave : undefined}
      onDrop={isEditing && !block.url ? handleDrop : undefined}
      style={{
        marginBottom: '8px',
        cursor: isEditing && !block.url ? 'pointer' : 'default',
        border: importanceStyle.borderLeft || (isEditing ? '1px dashed #ddd' : 'none'),
        borderRadius: '4px',
        padding: importanceStyle.backgroundColor ? '8px' : (isEditing ? '8px' : '0'),
        backgroundColor: importanceStyle.backgroundColor || (isDragOver ? '#f8f9fa' : 'transparent'),
        transition: 'background-color 0.3s ease'
      }}
      tabIndex={isEditing ? 0 : -1}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {block.url ? (
        <div
          ref={imageContainerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => !isResizing && setIsHovered(false)}
          onClick={() => isEditing && !isResizing && setIsLocalEditing(true)}
          style={{
            cursor: isEditing && !isResizing ? 'pointer' : 'default',
            position: 'relative',
            display: 'inline-block',
            width: imageWidth,
            maxWidth: '100%'
          }}
        >
          <img
            src={block.url}
            alt={block.alt || '이미지'}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '4px',
              display: 'block',
              border: isHovered && isEditing ? '2px solid #007bff' : 'none',
              transition: 'border 0.2s ease'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />

          {/* 우측 리사이즈 핸들 */}
          {isHovered && isEditing && (
            <div
              onMouseDown={handleResizeStart}
              style={{
                position: 'absolute',
                right: -5,
                top: 0,
                bottom: 0,
                width: 10,
                cursor: 'ew-resize',
                backgroundColor: isResizing ? '#007bff' : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            />
          )}

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
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
              border: `2px dashed ${isDragOver ? '#007bff' : '#ddd'}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isUploading ? (
              <div>⏳ 업로드 중...</div>
            ) : (
              <div>
                📷 이미지를 추가하려면 클릭하세요
                <br />
                <small>드래그 앤 드롭 또는 Ctrl+V로 붙여넣기 가능</small>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default ImageBlockComponent;