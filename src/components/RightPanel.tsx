import React from 'react';
import { MemoBlock, Page } from '../types';
import Resizer from './Resizer';

interface RightPanelProps {
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];
  currentPage: Page | undefined;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  selectedMemo,
  selectedMemos,
  currentPage,
  onMemoUpdate,
  onMemoSelect,
  onFocusMemo,
  width,
  onResize
}) => {
  const [tagInput, setTagInput] = React.useState('');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, { title: e.target.value });
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedMemo) {
      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
      onMemoUpdate(selectedMemo.id, { tags });
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && selectedMemo) {
      const newTag = tagInput.trim();
      if (!selectedMemo.tags.includes(newTag)) {
        onMemoUpdate(selectedMemo.id, { tags: [...selectedMemo.tags, newTag] });
      }
      setTagInput('');
      e.preventDefault();
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (selectedMemo) {
      const updatedTags = selectedMemo.tags.filter(tag => tag !== tagToRemove);
      onMemoUpdate(selectedMemo.id, { tags: updatedTags });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, { content: e.target.value });
    }
  };

  return (
    <div style={{
      width: `${width}px`,
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '24px',
      borderLeft: '1px solid #e5e7eb',
      position: 'relative'
    }}>
      
      {selectedMemos.length > 1 ? (
        // 멀티 선택 모드
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <h3 style={{ 
            marginBottom: '16px', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937' 
          }}>
            선택된 메모 ({selectedMemos.length}개)
          </h3>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            maxHeight: '400px', 
            overflowY: 'auto' 
          }}>
            {selectedMemos.map(memo => (
              <div
                key={memo.id}
                onClick={() => onFocusMemo(memo.id)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#8b5cf6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {memo.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {memo.content || '내용 없음'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedMemo ? (
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="메모 제목..."
              value={selectedMemo.title}
              onChange={handleTitleChange}
              style={{
                width: '100%',
                padding: '8px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#1f2937',
                fontSize: '18px',
                outline: 'none',
                fontWeight: '600'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.padding = '8px 12px';
                e.target.style.borderRadius = '6px';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.padding = '8px 0';
                e.target.style.borderRadius = '0';
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            {/* 기존 태그들 표시 */}
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
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* 새 태그 입력 */}
            <input
              type="text"
              placeholder="태그 추가..."
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyPress={handleTagInputKeyPress}
              style={{
                width: '100%',
                padding: '6px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#6b7280',
                fontSize: '13px',
                outline: 'none',
                fontWeight: '400'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.padding = '6px 12px';
                e.target.style.borderRadius = '6px';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.padding = '6px 0';
                e.target.style.borderRadius = '0';
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <textarea
              placeholder="텍스트를 입력하세요..."
              value={selectedMemo.content}
              onChange={handleContentChange}
              rows={12}
              style={{
                width: '100%',
                padding: '8px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#374151',
                resize: 'none',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                lineHeight: '1.6'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.padding = '12px';
                e.target.style.borderRadius = '6px';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.padding = '8px 0';
                e.target.style.borderRadius = '0';
              }}
            />
          </div>


          {selectedMemo.connections.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>연결된 메모:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedMemo.connections.map(connId => {
                  const connectedMemo = currentPage?.memos.find(m => m.id === connId);
                  return connectedMemo ? (
                    <div
                      key={connId}
                      onClick={() => onMemoSelect(connId)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '12px',
                        flex: '0 0 calc(50% - 3px)',
                        textAlign: 'center'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                    >
                      {connectedMemo.title}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '60px' }}>
          <p style={{ fontSize: '16px' }}>노드를 선택하여 편집하세요</p>
        </div>
      )}
      <Resizer direction="right" onResize={onResize} />
    </div>
  );
};

export default RightPanel;