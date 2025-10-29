import React from 'react';
import { MemoBlock, CategoryBlock } from '../../types';

interface MultiSelectViewProps {
  selectedMemos: MemoBlock[];
  selectedCategories: CategoryBlock[];
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
}

/**
 * 멀티 선택 모드 뷰 컴포넌트
 *
 * 여러 메모/카테고리가 선택되었을 때 표시되는 뷰입니다.
 */
const MultiSelectView: React.FC<MultiSelectViewProps> = ({
  selectedMemos,
  selectedCategories,
  onCategorySelect,
  onFocusMemo
}) => {
  return (
    <div>
      <h3 style={{
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        선택된 아이템 (메모 {selectedMemos.length}개, 카테고리 {selectedCategories.length}개)
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {/* 선택된 카테고리들 */}
        {selectedCategories.map(category => (
          <div
            key={category.id}
            onClick={() => onCategorySelect(category.id)}
            style={{
              padding: '12px',
              backgroundColor: '#fff3e0',
              border: '1px solid #ffb74d',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
            <div style={{
              fontWeight: '600',
              fontSize: '14px',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {category.title}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              하위 아이템: {category.children.length}개
            </div>
          </div>
        ))}

        {/* 선택된 메모들 */}
        {selectedMemos.map(memo => (
          <div
            key={memo.id}
            onClick={() => onFocusMemo(memo.id)}
            style={{
              padding: '12px 16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
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
  );
};

export default MultiSelectView;
