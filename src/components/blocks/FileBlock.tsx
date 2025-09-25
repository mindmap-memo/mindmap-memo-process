import React, { useState, useRef } from 'react';
import { FileBlock } from '../../types';

// 파일을 Base64로 변환하는 함수
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...block, url, name });
    }
    setIsLocalEditing(false);
  };

  // 파일 처리 함수
  const handleFile = async (file: File) => {
    try {
      setIsUploading(true);
      const base64Url = await fileToBase64(file);
      const fileData = {
        url: base64Url,
        name: file.name,
        size: file.size
      };

      setUrl(fileData.url);
      setName(fileData.name);

      if (onUpdate) {
        onUpdate({
          ...block,
          ...fileData
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
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {isUploading ? (
            <div>⏳ 업로드 중...</div>
          ) : (
            <div>
              📎 파일을 드래그하거나 클릭해서 선택
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
      onClick={() => isEditing && !block.name && setIsLocalEditing(true)}
      onDragOver={isEditing && !block.name ? handleDragOver : undefined}
      onDragLeave={isEditing && !block.name ? handleDragLeave : undefined}
      onDrop={isEditing && !block.name ? handleDrop : undefined}
      style={{
        padding: '12px',
        border: `1px solid ${isDragOver ? '#007bff' : '#e0e0e0'}`,
        borderRadius: '8px',
        backgroundColor: isDragOver ? '#f8f9fa' : (isEditing && !block.name ? '#f8f9fa' : '#f8f9fa'),
        cursor: isEditing && !block.name ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div style={{ fontSize: '24px' }}>📎</div>
      <div style={{ flex: 1 }}>
        <div
          style={{ fontWeight: '500', fontSize: '14px' }}
          onClick={() => isEditing && block.name && setIsLocalEditing(true)}
        >
          {isUploading ? (
            '⏳ 업로드 중...'
          ) : (
            block.name || (isEditing ? '파일을 추가하려면 클릭하세요 (드래그 앤 드롭 가능)' : '파일')
          )}
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