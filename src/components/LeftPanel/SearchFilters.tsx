import React from 'react';
import { ImportanceLevel } from '../../types';
import { SearchCategory } from './hooks/useLeftPanelState';
import styles from '../../scss/components/LeftPanel.module.scss';

interface SearchFiltersProps {
  showSearchFilters: boolean;
  searchCategory: SearchCategory;
  searchImportanceFilters: Set<ImportanceLevel>;
  searchShowGeneralContent: boolean;
  onCategoryChange: (category: SearchCategory) => void;
  onToggleImportanceFilter: (level: ImportanceLevel) => void;
  onSelectAllImportance: () => void;
  onClearAllImportance: () => void;
  onToggleGeneralContent: (checked: boolean) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  showSearchFilters,
  searchCategory,
  searchImportanceFilters,
  searchShowGeneralContent,
  onCategoryChange,
  onToggleImportanceFilter,
  onSelectAllImportance,
  onClearAllImportance,
  onToggleGeneralContent
}) => {
  if (!showSearchFilters) return null;

  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      marginBottom: '8px'
    }}>
      {/* 검색 카테고리 선택 */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
          검색 범위
        </span>
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {(['all', 'memos', 'categories', 'title', 'tags', 'content'] as SearchCategory[]).map((category) => (
            <button
              key={category}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCategoryChange(category)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: searchCategory === category ? '#8b5cf6' : '#ffffff',
                color: searchCategory === category ? 'white' : '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {category === 'all' ? '전체' :
               category === 'memos' ? '메모' :
               category === 'categories' ? '카테고리' :
               category === 'title' ? '제목' :
               category === 'tags' ? '태그' : '내용'}
            </button>
          ))}
        </div>
      </div>

      {/* 중요도 필터 선택 */}
      {(searchCategory === 'content' || searchCategory === 'all' || searchCategory === 'memos') && (
        <div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
            중요도 필터
          </span>

          {/* 일반 내용 토글 */}
          <div style={{ marginBottom: '8px' }}>
            <label
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <input
                type="checkbox"
                checked={searchShowGeneralContent}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleGeneralContent(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ marginRight: '6px' }}
              />
              <span
                onClick={() => onToggleGeneralContent(!searchShowGeneralContent)}
                style={{ color: '#6b7280' }}
              >
                일반 내용
              </span>
            </label>
          </div>

          {/* 중요도 레벨 선택 */}
          <div style={{
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            {([
              { level: 'critical', label: '🔴 매우중요', color: '#ffcdd2' },
              { level: 'important', label: '🟠 중요', color: '#ffcc80' },
              { level: 'opinion', label: '🟣 의견', color: '#e1bee7' },
              { level: 'reference', label: '🔵 참고', color: '#81d4fa' },
              { level: 'question', label: '🟡 질문', color: '#fff59d' },
              { level: 'idea', label: '🟢 아이디어', color: '#c8e6c9' },
              { level: 'data', label: '⚫ 데이터', color: '#bdbdbd' }
            ] as Array<{level: ImportanceLevel, label: string, color: string}>).map(({level, label, color}) => (
              <button
                key={level}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToggleImportanceFilter(level)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: searchImportanceFilters.has(level) ? color : '#ffffff',
                  color: searchImportanceFilters.has(level) ? '#000' : '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 전체 선택/해제 버튼 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onSelectAllImportance}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              전체 선택
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearAllImportance}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              전체 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
