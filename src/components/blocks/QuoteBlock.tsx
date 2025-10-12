import React, { useState } from 'react';
import { QuoteBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

interface QuoteBlockProps {
  block: QuoteBlock;
  isEditing?: boolean;
  onUpdate?: (block: QuoteBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const QuoteBlockComponent: React.FC<QuoteBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  const [content, setContent] = useState(block.content);
  const [author, setAuthor] = useState(block.author || '');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...block, content, author: author || undefined });
    }
    setIsLocalEditing(false);
  };

  const handleCancel = () => {
    setContent(block.content);
    setAuthor(block.author || '');
    setIsLocalEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow line break
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing && isLocalEditing) {
    return (
      <div style={{
        marginBottom: '4px',
        padding: '16px',
        borderLeft: importanceStyle.borderLeft || '4px solid #666',
        backgroundColor: importanceStyle.backgroundColor || '#f8f8f8',
        borderRadius: '4px'
      }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            minHeight: '60px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            fontFamily: 'inherit',
            fontSize: '16px',
            fontStyle: 'italic',
            resize: 'vertical',
            backgroundColor: 'white',
            marginBottom: '8px'
          }}
          placeholder="인용할 내용을 입력하세요..."
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          onBlur={handleSave}
          style={{
            width: '100%',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
          placeholder="출처 또는 작성자 (선택사항)"
        />
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '4px'
        }}>
          Enter로 저장, Shift+Enter로 줄바꿈, Esc로 취소
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => isEditing && setIsLocalEditing(true)}
      style={{
        padding: '16px',
        borderLeft: importanceStyle.borderLeft || '4px solid #666',
        backgroundColor: importanceStyle.backgroundColor || '#f8f8f8',
        borderRadius: '4px',
        cursor: isEditing ? 'pointer' : 'default',
        minHeight: '50px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (isEditing) {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }
      }}
      onMouseLeave={(e) => {
        if (isEditing && !isLocalEditing) {
          e.currentTarget.style.backgroundColor = '#f8f8f8';
        }
      }}
    >
      <div style={{
        fontSize: '16px',
        fontStyle: 'italic',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        marginBottom: author ? '8px' : '0'
      }}>
        "{block.content || (isEditing ? '인용할 내용을 입력하려면 클릭하세요...' : '')}"
      </div>
      {author && (
        <div style={{
          fontSize: '14px',
          color: '#666',
          textAlign: 'right',
          fontWeight: '500'
        }}>
          — {author}
        </div>
      )}
    </div>
  );
};

export default QuoteBlockComponent;