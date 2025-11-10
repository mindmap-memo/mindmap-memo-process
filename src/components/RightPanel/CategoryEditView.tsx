import React from 'react';
import { CategoryBlock, MemoBlock, Page } from '../../types';
import { useAnalyticsTrackers } from '../../features/analytics/hooks/useAnalyticsTrackers';

interface CategoryEditViewProps {
  selectedCategory: CategoryBlock;
  currentPage: Page | undefined;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
}

/**
 * 카테고리 편집 뷰 컴포넌트
 *
 * 단일 카테고리 선택 시 표시되는 편집 화면입니다.
 */
const CategoryEditView: React.FC<CategoryEditViewProps> = ({
  selectedCategory,
  currentPage,
  onCategoryUpdate,
  onCategorySelect,
  onFocusMemo
}) => {
  const analytics = useAnalyticsTrackers();

  return (
    <div>
      <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
        <input
          type="text"
          value={selectedCategory.title}
          onChange={(e) => {
            onCategoryUpdate({ ...selectedCategory, title: e.target.value });
            // Track analytics (only if title is not empty)
            if (e.target.value.trim()) {
              analytics.trackCategoryTitleEdited();
            }
          }}
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
            e.target.style.color = '#1f2937';
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = '#e5e7eb';
            e.target.style.color = '#6b7280';
          }}
        />
      </div>

      {/* 연결된 아이템들 */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px',
          paddingLeft: '20px'
        }}>
          연결된 카테고리
        </h4>

        <div style={{ paddingLeft: '20px' }}>
          {selectedCategory.connections && selectedCategory.connections.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {selectedCategory.connections.map(connectionId => {
                const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
                const connectedCategory = currentPage?.categories?.find(c => c.id === connectionId);
                const connectedItem = connectedMemo || connectedCategory;

                if (!connectedItem) return null;

                return (
                  <div
                    key={connectionId}
                    onClick={() => {
                      if (connectedMemo) {
                        onFocusMemo(connectionId);
                      } else if (connectedCategory) {
                        onCategorySelect(connectionId);
                      }
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: connectedMemo ? '#f0f9ff' : '#fff3e0',
                      border: `1px solid ${connectedMemo ? '#bae6fd' : '#ffcc02'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>
                      {connectedMemo ? '📝 ' : ''}{connectedItem.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px',
              border: '1px dashed #d1d5db',
              borderRadius: '6px'
            }}>
              연결된 아이템이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 하위 카테고리 */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px',
          paddingLeft: '20px'
        }}>
          하위 카테고리
        </h4>

        <div style={{ paddingLeft: '20px' }}>
          {(() => {
            const childCategories = selectedCategory.children
              ?.map(childId => currentPage?.categories?.find(c => c.id === childId))
              .filter(Boolean) as CategoryBlock[] | undefined;

            return childCategories && childCategories.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {childCategories.map(childCategory => (
                  <div
                    key={childCategory.id}
                    onClick={() => onCategorySelect(childCategory.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#fff3e0',
                      border: '1px solid #ffcc02',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>
                      📁 {childCategory.title}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px'
              }}>
                하위 카테고리가 없습니다
              </div>
            );
          })()}
        </div>
      </div>

      {/* 하위 메모 */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px',
          paddingLeft: '20px'
        }}>
          하위 메모
        </h4>

        <div style={{ paddingLeft: '20px' }}>
          {(() => {
            const childMemos = selectedCategory.children
              ?.map(childId => {
                const memo = currentPage?.memos.find(m => m.id === childId);
                return memo;
              })
              .filter(Boolean) as MemoBlock[] | undefined;

            return childMemos && childMemos.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {childMemos.map(childMemo => (
                  <div
                    key={childMemo.id}
                    onClick={() => onFocusMemo(childMemo.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>
                      📝 {childMemo.title}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px'
              }}>
                하위 메모가 없습니다
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CategoryEditView;
