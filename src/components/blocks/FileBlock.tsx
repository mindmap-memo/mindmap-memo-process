import React from 'react';
import { FileBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

interface FileBlockProps {
  block: FileBlock;
  isEditing?: boolean;
  onUpdate?: (block: FileBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const FileBlockComponent: React.FC<FileBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  // 필터링 로직
  const shouldShow = React.useMemo(() => {
    // 편집 모드에서는 항상 표시
    if (isEditing) return true;

    // 중요도가 있는 경우
    if (block.importance) {
      return activeImportanceFilters ? activeImportanceFilters.has(block.importance) : true;
    }

    // 중요도가 없는 경우 (일반 내용)
    return showGeneralContent !== false;
  }, [block.importance, activeImportanceFilters, showGeneralContent, isEditing]);

  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);

  // 필터링으로 숨겨진 경우 null 반환
  if (!shouldShow) {
    return null;
  }
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 파일 다운로드 핸들러
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!block.url || !block.name) return;

    // Data URL을 Blob으로 변환하여 다운로드
    const link = document.createElement('a');
    link.href = block.url;
    link.download = block.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        padding: '12px',
        border: importanceStyle.borderLeft || '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: importanceStyle.backgroundColor || '#f8f9fa',
        cursor: 'default',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 다운로드 아이콘 */}
      <div
        onClick={block.url && block.name ? handleDownload : undefined}
        style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: block.url && block.name ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          borderRadius: '4px',
          backgroundColor: 'transparent'
        }}
        onMouseEnter={(e) => {
          if (block.url && block.name) {
            e.currentTarget.style.backgroundColor = '#e9ecef';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={block.url && block.name ? '#495057' : '#adb5bd'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>

      {/* 파일 정보 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500', fontSize: '14px', color: '#212529' }}>
          {block.name || '파일'}
        </div>
        {block.size && (
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
            {formatFileSize(block.size)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileBlockComponent;