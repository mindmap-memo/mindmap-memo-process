import React, { useState } from 'react';
import { CalloutBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

interface CalloutBlockProps {
  block: CalloutBlock;
  isEditing?: boolean;
  onUpdate?: (block: CalloutBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const CalloutBlockComponent: React.FC<CalloutBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  // Hooks를 먼저 호출
  const [content, setContent] = useState(block.content);
  const [emoji, setEmoji] = useState(block.emoji || '💡');
  const [color, setColor] = useState(block.color || 'blue');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

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

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...block, content, emoji, color });
    }
    setIsLocalEditing(false);
  };

  const handleCancel = () => {
    setContent(block.content);
    setEmoji(block.emoji || '💡');
    setColor(block.color || 'blue');
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

  const colorStyles = {
    blue: { backgroundColor: '#e3f2fd', borderColor: '#2196f3' },
    green: { backgroundColor: '#e8f5e8', borderColor: '#4caf50' },
    yellow: { backgroundColor: '#fff8e1', borderColor: '#ff9800' },
    red: { backgroundColor: '#ffebee', borderColor: '#f44336' },
    purple: { backgroundColor: '#f3e5f5', borderColor: '#9c27b0' },
    gray: { backgroundColor: '#f5f5f5', borderColor: '#757575' }
  };

  const currentStyle = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  if (isEditing && isLocalEditing) {
    return (
      <div style={{
        marginBottom: '4px',
        padding: '12px',
        borderLeft: importanceStyle.borderLeft || `4px solid ${currentStyle.borderColor}`,
        backgroundColor: importanceStyle.backgroundColor || currentStyle.backgroundColor,
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            style={{
              width: '40px',
              padding: '4px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              textAlign: 'center'
            }}
            placeholder="🔥"
          />
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              padding: '4px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="blue">파랑</option>
            <option value="green">초록</option>
            <option value="yellow">노랑</option>
            <option value="red">빨강</option>
            <option value="purple">보라</option>
            <option value="gray">회색</option>
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            minHeight: '60px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            fontFamily: 'inherit',
            fontSize: '14px',
            resize: 'vertical',
            backgroundColor: 'white'
          }}
          placeholder="콜아웃 내용을 입력하세요..."
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
        padding: '12px',
        borderLeft: importanceStyle.borderLeft || `4px solid ${currentStyle.borderColor}`,
        backgroundColor: importanceStyle.backgroundColor || currentStyle.backgroundColor,
        borderRadius: '4px',
        cursor: isEditing ? 'pointer' : 'default',
        minHeight: '50px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (isEditing) {
          e.currentTarget.style.opacity = '0.8';
        }
      }}
      onMouseLeave={(e) => {
        if (isEditing && !isLocalEditing) {
          e.currentTarget.style.opacity = '1';
        }
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{emoji}</span>
      <div style={{
        flex: 1,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        {block.content || (isEditing ? '콜아웃 내용을 입력하려면 클릭하세요...' : '')}
      </div>
    </div>
  );
};

export default CalloutBlockComponent;