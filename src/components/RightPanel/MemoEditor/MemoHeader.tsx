import React from 'react';
import { MemoBlock } from '../../../types';

interface MemoHeaderProps {
  selectedMemo: MemoBlock;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTitleFocusChange: (isFocused: boolean) => void;
  tagInput: string;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
}

const MemoHeader: React.FC<MemoHeaderProps> = ({
  selectedMemo,
  onTitleChange,
  onTitleFocusChange,
  tagInput,
  onTagInputChange,
  onTagInputKeyPress,
  onRemoveTag
}) => {
  return (
    <>
      {/* 제목 입력 */}
      <div style={{ marginBottom: '20px', paddingLeft: '20px' }}>
        <input
          type="text"
          placeholder="제목을 입력해주세요"
          value={selectedMemo.title}
          onChange={onTitleChange}
          style={{
            width: '100%',
            padding: '2px 0',
            border: 'none',
            borderBottom: '2px solid transparent',
            borderRadius: '0',
            fontSize: '24px',
            fontWeight: '700',
            backgroundColor: 'transparent',
            outline: 'none',
            color: '#1f2937',
            transition: 'border-bottom-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = '#3b82f6';
            onTitleFocusChange(true);
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = 'transparent';
            onTitleFocusChange(false);
          }}
        />
      </div>

      {/* 태그 */}
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        {selectedMemo.tags && selectedMemo.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px'
          }}>
            {selectedMemo.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder="태그를 입력하세요 (Enter로 추가)"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyPress={onTagInputKeyPress}
          style={{
            width: '100%',
            padding: '2px 0',
            border: 'none',
            borderBottom: '1px solid #e5e7eb',
            borderRadius: '0',
            fontSize: '14px',
            backgroundColor: 'transparent',
            outline: 'none',
            color: '#6b7280',
            transition: 'border-bottom-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = '#e5e7eb';
          }}
        />
      </div>
    </>
  );
};

export default MemoHeader;
