import React, { useState } from 'react';
import { CodeBlock, ImportanceLevel } from '../../types';
import { getImportanceStyle } from '../../utils/importanceStyles';

interface CodeBlockProps {
  block: CodeBlock;
  isEditing?: boolean;
  onUpdate?: (block: CodeBlock) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

const CodeBlockComponent: React.FC<CodeBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  activeImportanceFilters,
  showGeneralContent
}) => {
  const [content, setContent] = useState(block.content);
  const [language, setLanguage] = useState(block.language || 'javascript');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  // 중요도 스타일 가져오기
  const importanceStyle = getImportanceStyle(block.importance);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...block, content, language });
    }
    setIsLocalEditing(false);
  };

  const handleCancel = () => {
    setContent(block.content);
    setLanguage(block.language || 'javascript');
    setIsLocalEditing(false);
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'plain', label: 'Plain Text' }
  ];

  if (isEditing && isLocalEditing) {
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '8px',
          padding: '8px 12px',
          backgroundColor: '#2d3748',
          borderRadius: '4px 4px 0 0'
        }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              backgroundColor: '#1a202c',
              color: 'white',
              fontSize: '12px'
            }}
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSave}
            style={{
              padding: '4px 8px',
              backgroundColor: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            저장
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '4px 8px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            border: 'none',
            borderRadius: '0 0 4px 4px',
            backgroundColor: '#1a202c',
            color: '#e2e8f0',
            fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
            fontSize: '13px',
            lineHeight: '1.4',
            resize: 'vertical',
            outline: 'none'
          }}
          placeholder="코드를 입력하세요..."
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => isEditing && setIsLocalEditing(true)}
      style={{
        marginBottom: '8px',
        cursor: isEditing ? 'pointer' : 'default',
        borderRadius: '4px',
        overflow: 'hidden',
        border: importanceStyle.borderLeft ? 'none' : '1px solid #e2e8f0',
        ...importanceStyle
      }}
    >
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#2d3748',
        color: '#e2e8f0',
        fontSize: '12px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{languages.find(l => l.value === language)?.label || 'Code'}</span>
        {!isEditing && block.content && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(block.content);
            }}
            style={{
              padding: '2px 6px',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              border: '1px solid #4a5568',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            복사
          </button>
        )}
      </div>
      <pre style={{
        margin: 0,
        padding: '12px',
        backgroundColor: '#1a202c',
        color: '#e2e8f0',
        fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
        fontSize: '13px',
        lineHeight: '1.4',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {block.content || (isEditing ? '코드를 입력하려면 클릭하세요...' : '')}
      </pre>
    </div>
  );
};

export default CodeBlockComponent;