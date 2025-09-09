import React from 'react';
import { ContentBlockType } from '../types';

interface BlockSelectorProps {
  isVisible: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  onSelect: (blockType: ContentBlockType) => void;
  onClose: () => void;
}

const BlockSelector: React.FC<BlockSelectorProps> = ({
  isVisible,
  position,
  searchQuery,
  onSelect,
  onClose
}) => {
  const blockTypes = [
    { type: 'text' as ContentBlockType, label: '텍스트', icon: '📝', description: '기본 텍스트를 입력합니다' },
    { type: 'callout' as ContentBlockType, label: '콜아웃', icon: '💡', description: '중요한 내용을 강조합니다' },
    { type: 'checklist' as ContentBlockType, label: '체크리스트', icon: '✓', description: '할 일 목록을 만듭니다' },
    { type: 'quote' as ContentBlockType, label: '인용구', icon: '💬', description: '인용 텍스트를 추가합니다' },
    { type: 'code' as ContentBlockType, label: '코드', icon: '💻', description: '코드 블록을 추가합니다' },
    { type: 'image' as ContentBlockType, label: '이미지', icon: '🖼️', description: '이미지를 삽입합니다' },
    { type: 'file' as ContentBlockType, label: '파일', icon: '📎', description: '파일을 첨부합니다' },
    { type: 'bookmark' as ContentBlockType, label: '북마크', icon: '🔖', description: 'URL 북마크를 추가합니다' },
    { type: 'table' as ContentBlockType, label: '테이블', icon: '📊', description: '표를 생성합니다' }
  ];

  const filteredBlocks = blockTypes.filter(block => 
    block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          backgroundColor: 'transparent'
        }}
        onClick={onClose}
      />
      
      {/* 블록 선택기 */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: 'white',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          padding: '8px 0',
          minWidth: '280px',
          maxWidth: '320px',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000
        }}
      >
        {filteredBlocks.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            검색 결과가 없습니다
          </div>
        ) : (
          filteredBlocks.map((block, index) => (
            <div
              key={block.type}
              onClick={() => onSelect(block.type)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.15s ease',
                borderRadius: '4px',
                margin: '0 4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ 
                fontSize: '20px',
                width: '24px',
                textAlign: 'center'
              }}>
                {block.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  {block.label}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  {block.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default BlockSelector;