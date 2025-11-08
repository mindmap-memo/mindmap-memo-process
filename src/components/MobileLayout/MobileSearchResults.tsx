import React from 'react';
import { MemoBlock, CategoryBlock } from '../../types';
import { FileText, FolderOpen } from 'lucide-react';
import styles from '../../scss/components/MobileLayout/MobileSearchResults.module.scss';

interface MobileSearchResultsProps {
  searchResults: MemoBlock[];
  searchCategoryResults: CategoryBlock[];
  onNavigateToMemo?: (memoId: string) => void;
  onNavigateToCategory?: (categoryId: string) => void;
  searchQuery: string;
  showFilters?: boolean;
}

// 중요도 레벨별 색상 매핑
const importanceColors: Record<string, string> = {
  critical: '#ffcdd2',
  important: '#ffcc80',
  opinion: '#e1bee7',
  reference: '#81d4fa',
  question: '#fff59d',
  idea: '#c8e6c9',
  data: '#bdbdbd'
};

// 메모의 블록에서 텍스트 내용과 중요도 추출
const extractBlockContent = (memo: MemoBlock): { text: string; importanceRanges: Array<{ start: number; end: number; level: string; color: string }> } => {
  if (!memo.blocks || memo.blocks.length === 0) {
    return { text: memo.content || '', importanceRanges: [] };
  }

  let fullText = '';
  const allImportanceRanges: Array<{ start: number; end: number; level: string; color: string }> = [];

  memo.blocks
    .filter(block => block.type === 'text')
    .forEach(block => {
      if (block.type === 'text' && block.content) {
        // HTML 태그 제거
        const cleanText = block.content.replace(/<[^>]*>/g, '').trim();
        const startOffset = fullText.length;

        // 중요도 범위가 있으면 오프셋 조정하여 추가
        if (block.importanceRanges && block.importanceRanges.length > 0) {
          block.importanceRanges.forEach((range: any) => {
            allImportanceRanges.push({
              start: startOffset + range.start,
              end: startOffset + range.end,
              level: range.level,
              color: importanceColors[range.level] || '#e5e7eb'
            });
          });
        }

        fullText += cleanText + ' ';
      }
    });

  return {
    text: fullText.trim() || memo.content || '',
    importanceRanges: allImportanceRanges
  };
};

export const MobileSearchResults: React.FC<MobileSearchResultsProps> = ({
  searchResults,
  searchCategoryResults,
  onNavigateToMemo,
  onNavigateToCategory,
  searchQuery,
  showFilters = false
}) => {
  const hasResults = searchResults.length > 0 || searchCategoryResults.length > 0;
  const [filterHeight, setFilterHeight] = React.useState(0);

  // 필터 드롭다운의 높이를 측정
  React.useEffect(() => {
    if (showFilters) {
      // 필터 드롭다운 요소 찾기
      const filterDropdown = document.querySelector('[class*="searchFiltersDropdown"]') as HTMLElement;
      if (filterDropdown) {
        const height = filterDropdown.offsetHeight;
        setFilterHeight(height);
      }
    } else {
      setFilterHeight(0);
    }
  }, [showFilters]);

  if (!searchQuery && !hasResults) {
    return null;
  }

  return (
    <div
      className={`${styles.searchResultsContainer} ${showFilters ? styles.withFilters : ''}`}
      style={{ '--filter-dropdown-height': `${filterHeight}px` } as React.CSSProperties}
    >
      {/* 검색 결과 없음 */}
      {searchQuery && !hasResults && (
        <div className={styles.noResults}>
          검색 결과가 없습니다
        </div>
      )}

      {/* 메모 검색 결과 */}
      {searchResults.length > 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.sectionHeader}>
            <FileText size={16} />
            <span>메모 ({searchResults.length})</span>
          </div>
          <div className={styles.resultsList}>
            {searchResults.map((memo) => {
              const { text, importanceRanges } = extractBlockContent(memo);
              const previewText = text;
              const displayText = previewText.length > 100
                ? previewText.substring(0, 100) + '...'
                : previewText;

              // 중요도 배경색이 있는 텍스트 렌더링
              const renderTextWithImportance = (text: string, ranges: typeof importanceRanges) => {
                if (ranges.length === 0) {
                  return <span>{text}</span>;
                }

                const elements: React.ReactNode[] = [];
                let lastIndex = 0;

                // 범위를 정렬
                const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

                sortedRanges.forEach((range, idx) => {
                  // 이전 일반 텍스트
                  if (range.start > lastIndex) {
                    elements.push(
                      <span key={`text-${idx}`}>
                        {text.substring(lastIndex, range.start)}
                      </span>
                    );
                  }

                  // 중요도가 있는 텍스트
                  elements.push(
                    <span
                      key={`importance-${idx}`}
                      style={{
                        backgroundColor: range.color,
                        padding: '2px 4px',
                        borderRadius: '3px'
                      }}
                    >
                      {text.substring(range.start, range.end)}
                    </span>
                  );

                  lastIndex = range.end;
                });

                // 마지막 일반 텍스트
                if (lastIndex < text.length) {
                  elements.push(
                    <span key="text-end">
                      {text.substring(lastIndex)}
                    </span>
                  );
                }

                return <>{elements}</>;
              };

              return (
                <div
                  key={memo.id}
                  className={styles.resultItem}
                  onClick={() => onNavigateToMemo?.(memo.id)}
                >
                  <div className={styles.resultTitle}>{memo.title || '제목 없음'}</div>
                  {memo.tags && memo.tags.length > 0 && (
                    <div className={styles.resultTags}>
                      {memo.tags.map((tag, idx) => (
                        <span key={idx} className={styles.tag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {displayText && (
                    <div className={styles.resultPreview}>
                      {renderTextWithImportance(displayText, importanceRanges)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 카테고리 검색 결과 */}
      {searchCategoryResults.length > 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.sectionHeader}>
            <FolderOpen size={16} />
            <span>카테고리 ({searchCategoryResults.length})</span>
          </div>
          <div className={styles.resultsList}>
            {searchCategoryResults.map((category) => (
              <div
                key={category.id}
                className={`${styles.resultItem} ${styles.categoryItem}`}
                onClick={() => onNavigateToCategory?.(category.id)}
              >
                <div className={styles.resultTitle}>{category.title || '제목 없음'}</div>
                {category.tags && category.tags.length > 0 && (
                  <div className={styles.resultTags}>
                    {category.tags.map((tag, idx) => (
                      <span key={idx} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
