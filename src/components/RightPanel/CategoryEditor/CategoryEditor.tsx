import React from 'react';
import { CategoryBlock, Page } from '../../../types';

interface CategoryEditorProps {
  selectedCategory: CategoryBlock;
  currentPage: Page | undefined;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({
  selectedCategory,
  currentPage,
  onCategoryUpdate,
  onCategorySelect,
  onFocusMemo
}) => {
  // 하위 메모 목록
  const childMemos = currentPage?.memos.filter(m => m.parentId === selectedCategory.id) || [];
  // 연결된 카테고리 목록
  const connectedCategories = currentPage?.categories.filter(c =>
    selectedCategory.connections.includes(c.id)
  ) || [];

  return (
    <div>
      {/* 카테고리 제목 */}
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        <input
          type="text"
          value={selectedCategory.title}
          onChange={(e) => onCategoryUpdate({ ...selectedCategory, title: e.target.value })}
          placeholder="카테고리 제목을 입력하세요..."
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
            e.target.style.borderBottomColor = '#8b5cf6';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = 'transparent';
          }}
        />
      </div>

      {/* 태그 관리 */}
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        {selectedCategory.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px'
          }}>
            {selectedCategory.tags.map((tag, index) => (
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
                  onClick={() => {
                    const newTags = selectedCategory.tags.filter((_, i) => i !== index);
                    onCategoryUpdate({ ...selectedCategory, tags: newTags });
                  }}
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
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              const newTag = e.currentTarget.value.trim();
              if (!selectedCategory.tags.includes(newTag)) {
                onCategoryUpdate({
                  ...selectedCategory,
                  tags: [...selectedCategory.tags, newTag]
                });
              }
              e.currentTarget.value = '';
            }
          }}
          onFocus={(e) => {
            e.target.style.borderBottomColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = '#e5e7eb';
          }}
        />
      </div>

      {/* 하위 메모 목록 */}
      {childMemos.length > 0 && (
        <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            하위 메모 ({childMemos.length}개)
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {childMemos.map(memo => (
              <div
                key={memo.id}
                onClick={() => onFocusMemo(memo.id)}
                style={{
                  padding: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#374151',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                {memo.title || '제목 없음'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 연결된 카테고리 목록 */}
      {connectedCategories.length > 0 && (
        <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            연결된 카테고리 ({connectedCategories.length}개)
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {connectedCategories.map(category => (
              <div
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                style={{
                  padding: '8px',
                  backgroundColor: '#fff3e0',
                  border: '1px solid #ffb74d',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#f57c00',
                  fontWeight: '500',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffe0b2';
                  e.currentTarget.style.borderColor = '#ff9800';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff3e0';
                  e.currentTarget.style.borderColor = '#ffb74d';
                }}
              >
                {category.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryEditor;
