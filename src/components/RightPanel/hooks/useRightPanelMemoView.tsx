import React from 'react';
import { MemoBlock, Page } from '../../../types';

interface UseRightPanelMemoViewProps {
  selectedMemo: MemoBlock | null;
  currentPage: Page | undefined;
  tagInput: string;
  showConnectedMemos: boolean;
  setShowConnectedMemos: (show: boolean) => void;
  setIsTitleFocused: (focused: boolean) => void;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTagInputKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeTag: (tag: string) => void;
  onFocusMemo: (memoId: string) => void;
}

export const useRightPanelMemoView = ({
  selectedMemo,
  currentPage,
  tagInput,
  showConnectedMemos,
  setShowConnectedMemos,
  setIsTitleFocused,
  handleTitleChange,
  handleTagInputChange,
  handleTagInputKeyPress,
  removeTag,
  onFocusMemo
}: UseRightPanelMemoViewProps) => {

  const renderTitleInput = () => {
    if (!selectedMemo) return null;

    return (
      <div style={{ marginBottom: '20px', paddingLeft: '20px' }}>
        <input
          type="text"
          placeholder="제목을 입력해주세요"
          value={selectedMemo.title}
          onChange={handleTitleChange}
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
            setIsTitleFocused(true);
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = 'transparent';
            setIsTitleFocused(false);
          }}
        />
      </div>
    );
  };

  const renderTagsSection = () => {
    if (!selectedMemo) return null;

    return (
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        {selectedMemo.tags.length > 0 && (
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
                  onClick={() => removeTag(tag)}
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
          onChange={handleTagInputChange}
          onKeyPress={handleTagInputKeyPress}
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
            e.target.style.color = '#1f2937';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = '#e5e7eb';
            e.target.style.color = '#6b7280';
          }}
        />

        {/* 중요도 부여 안내 문구 */}
        <div style={{
          marginTop: '12px',
          fontSize: '13px',
          color: '#8b5cf6',
          fontWeight: '500'
        }}>
          {typeof window !== 'undefined' && window.innerWidth <= 768
            ? '💡 tip! 텍스트를 더블클릭 하거나 드래그해 중요도를 부여해보세요'
            : '💡 tip! 텍스트를 드래그하거나 우클릭해 중요도를 부여해보세요'}
        </div>
      </div>
    );
  };

  const renderConnectedMemos = () => {
    if (!selectedMemo || selectedMemo.connections.length === 0) return null;

    return (
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        <div
          onClick={() => setShowConnectedMemos(!showConnectedMemos)}
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            margin: 0,
            marginRight: '8px'
          }}>
            연결된 메모 ({selectedMemo.connections.length})
          </h4>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              transform: showConnectedMemos ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="#6b7280"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {showConnectedMemos && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            alignItems: 'start'
          }}>
            {selectedMemo.connections.map(connectionId => {
              const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
              return connectedMemo ? (
                <div
                  key={connectionId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusMemo(connectionId);
                  }}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#6b7280',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}>
                    {connectedMemo.title || '제목 없음'}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  return {
    renderTitleInput,
    renderTagsSection,
    renderConnectedMemos
  };
};
