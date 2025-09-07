import React from 'react';
import { MemoBlock, Page } from '../types';
import Resizer from './Resizer';

interface RightPanelProps {
  selectedMemo: MemoBlock | undefined;
  currentPage: Page | undefined;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  onMemoSelect: (memoId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  selectedMemo,
  currentPage,
  onMemoUpdate,
  onMemoSelect,
  width,
  onResize
}) => {
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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, { content: e.target.value });
    }
  };

  return (
    <div style={{
      width: `${width}px`,
      backgroundColor: 'white',
      color: '#374151',
      padding: '20px',
      borderLeft: '1px solid #e5e7eb',
      position: 'relative'
    }}>
      <h3 style={{ marginTop: 0 }}>메모 편집</h3>
      
      {selectedMemo ? (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>제목:</label>
            <input
              type="text"
              value={selectedMemo.title}
              onChange={handleTitleChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>태그:</label>
            <input
              type="text"
              placeholder="쉼표로 구분하여 입력"
              value={selectedMemo.tags.join(', ')}
              onChange={handleTagsChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>내용:</label>
            <textarea
              value={selectedMemo.content}
              onChange={handleContentChange}
              rows={10}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                resize: 'vertical',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {selectedMemo.connections.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>연결된 메모:</label>
              <div>
                {selectedMemo.connections.map(connId => {
                  const connectedMemo = currentPage?.memos.find(m => m.id === connId);
                  return connectedMemo ? (
                    <div
                      key={connId}
                      onClick={() => onMemoSelect(connId)}
                      style={{
                        padding: '10px',
                        marginBottom: '6px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
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
        <p style={{ color: '#9ca3af' }}>메모를 선택하세요</p>
      )}
      <Resizer direction="right" onResize={onResize} />
    </div>
  );
};

export default RightPanel;