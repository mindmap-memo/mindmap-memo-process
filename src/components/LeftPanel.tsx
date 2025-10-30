import React from 'react';
import { Page, MemoBlock, ImportanceLevel, CategoryBlock } from '../types';
import Resizer from './Resizer';
import styles from '../scss/components/LeftPanel.module.scss';

type SearchCategory = 'all' | 'title' | 'tags' | 'content' | 'memos' | 'categories';

// 중요도 레벨별 형광펜 스타일 정의
const getImportanceStyle = (level: ImportanceLevel) => {
  switch (level) {
    case 'critical':
      return { backgroundColor: '#ffcdd2', color: '#000' }; // 빨간 형광펜 - 매우중요
    case 'important':
      return { backgroundColor: '#ffcc80', color: '#000' }; // 주황 형광펜 - 중요
    case 'opinion':
      return { backgroundColor: '#e1bee7', color: '#000' }; // 보라 형광펜 - 의견
    case 'reference':
      return { backgroundColor: '#81d4fa', color: '#000' }; // 파란 형광펜 - 참고
    case 'question':
      return { backgroundColor: '#fff59d', color: '#000' }; // 노란 형광펜 - 질문
    case 'idea':
      return { backgroundColor: '#c8e6c9', color: '#000' }; // 초록 형광펜 - 아이디어
    case 'data':
      return { backgroundColor: '#bdbdbd', color: '#000' }; // 진한 회색 형광펜 - 데이터
    default:
      return {};
  }
};

interface LeftPanelProps {
  pages: Page[];
  currentPageId: string;
  onPageSelect: (pageId: string) => void;
  onAddPage: () => void;
  onPageNameChange: (pageId: string, newName: string) => void;
  onDeletePage: (pageId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
  onSearch?: (query: string, category: SearchCategory, results: MemoBlock[]) => void;
  onDeleteMemo?: (memoId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onNavigateToMemo?: (memoId: string, pageId?: string) => void;
  onNavigateToCategory?: (categoryId: string, pageId?: string) => void;
  onStartTutorial?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  pages,
  currentPageId,
  onPageSelect,
  onAddPage,
  onPageNameChange,
  onDeletePage,
  width,
  onResize,
  onSearch,
  onDeleteMemo,
  onDeleteCategory,
  onNavigateToMemo,
  onNavigateToCategory,
  onStartTutorial,
  userEmail,
  onLogout
}) => {
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchCategory, setSearchCategory] = React.useState<SearchCategory>('all');
  const [searchResults, setSearchResults] = React.useState<MemoBlock[]>([]);
  const [searchCategoryResults, setSearchCategoryResults] = React.useState<CategoryBlock[]>([]);
  const [isSearchMode, setIsSearchMode] = React.useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = React.useState<boolean>(false);
  const [showSearchFilters, setShowSearchFilters] = React.useState<boolean>(false);
  const [searchImportanceFilters, setSearchImportanceFilters] = React.useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [searchShowGeneralContent, setSearchShowGeneralContent] = React.useState<boolean>(true);

  // 검색창 활성화 상태, 필터 상태, 현재 페이지가 변경될 때마다 검색 결과 업데이트
  React.useEffect(() => {
    if (isSearchFocused) {
      // 카테고리만 검색하는 경우
      if (searchCategory === 'categories') {
        setSearchResults([]);
        setSearchCategoryResults(searchCategories(searchQuery));
      }
      // 메모만 검색하는 경우
      else if (searchCategory === 'memos') {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults([]);
      }
      // 전체 검색 (메모 + 카테고리)
      else if (searchCategory === 'all') {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults(searchCategories(searchQuery));
      }
      // 기타 (제목, 태그, 내용 - 메모만)
      else {
        setSearchResults(searchMemos(searchQuery, searchCategory));
        setSearchCategoryResults([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchFocused, searchQuery, searchCategory, searchImportanceFilters, searchShowGeneralContent, currentPageId]);

  const handleDoubleClick = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleEditClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleDeleteClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`"${page.name}" 페이지를 정말 삭제하시겠습니까?`)) {
      onDeletePage(page.id);
    }
  };

  const handleNameSubmit = () => {
    if (editingPageId && editingName.trim()) {
      onPageNameChange(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  // 텍스트를 공백 제거한 상태로 정규화
  const normalizeText = (text: string): string => {
    return text.toLowerCase().replace(/\s+/g, '');
  };

  // 유연한 검색 함수 (공백 무시)
  const flexibleMatch = (text: string, query: string): boolean => {
    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);

    // 공백 제거한 상태에서 포함 여부 확인
    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    // 추가적으로 단어별로 분리해서 모든 단어가 포함되는지 확인
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length > 1) {
      return queryWords.every(word => text.toLowerCase().includes(word));
    }

    return false;
  };

  // 중요도 필터에 맞는 텍스트만 추출하는 함수
  const getFilteredTextFromBlock = (block: any): string => {
    if (block.type !== 'text' || !block.content) return '';

    const { content, importanceRanges } = block;

    if (!importanceRanges || importanceRanges.length === 0) {
      // 중요도 없는 일반 텍스트
      return searchShowGeneralContent ? content : '';
    }

    // 중요도 필터 적용
    const ranges = [...importanceRanges].sort((a, b) => a.start - b.start);
    let filteredText = '';
    let lastIndex = 0;

    ranges.forEach(range => {
      // 이전 부분 (일반 텍스트)
      if (range.start > lastIndex) {
        if (searchShowGeneralContent) {
          filteredText += content.substring(lastIndex, range.start);
        }
      }

      // 현재 범위 (중요도 있는 텍스트)
      if (searchImportanceFilters.has(range.level)) {
        filteredText += content.substring(range.start, range.end);
      }

      lastIndex = range.end;
    });

    // 마지막 부분 (일반 텍스트)
    if (lastIndex < content.length) {
      if (searchShowGeneralContent) {
        filteredText += content.substring(lastIndex);
      }
    }

    return filteredText;
  };

  // 검색 결과용 하이라이팅 렌더링 함수
  const renderSearchResultContent = (memo: MemoBlock) => {
    const results: React.ReactNode[] = [];

    // blocks 배열에서 내용 추출
    if (memo.blocks && memo.blocks.length > 0) {
      // 텍스트 블록 처리
      const textBlocks = memo.blocks.filter(block => block.type === 'text' && block.content);
      if (textBlocks.length > 0) {
        const textResults = textBlocks.map((block, blockIndex) => {
          const textBlock = block as any;
          const { content, importanceRanges } = textBlock;

          if (!content) return null;

          // 중요도 필터가 모든 것을 선택한 상태인지 확인
          const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
          const isDefaultFilterState = searchImportanceFilters.size === allLevels.length &&
                                      allLevels.every(level => searchImportanceFilters.has(level)) &&
                                      searchShowGeneralContent;

          if (isDefaultFilterState) {
            // 기본 상태: 모든 하이라이팅 표시
            return renderHighlightedText(content, importanceRanges, blockIndex);
          } else {
            // 필터 적용 상태: 필터에 맞는 내용만 하이라이팅하여 표시
            return renderFilteredHighlightedText(content, importanceRanges, blockIndex);
          }
        }).filter(result => result !== null);

        results.push(...textResults);
      }

      // 파일/이미지/URL 블록 표시 (중요도 필터 적용)
      memo.blocks.forEach((block, index) => {
        if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
          const blockWithImportance = block as any;

          // 중요도 필터 확인
          const hasImportance = blockWithImportance.importance;
          const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);

          // 검색어 매칭 확인
          const passesSearchQuery = !searchQuery || searchBlockMetadata(block, searchQuery);

          // 필터를 통과하면 표시
          if (passesImportanceFilter && passesSearchQuery) {
            const blockKey = `block-${index}`;
            const importanceStyle = hasImportance ? getImportanceStyle(blockWithImportance.importance) : {};

            if (block.type === 'file') {
              results.push(
                <div key={blockKey} style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: importanceStyle.backgroundColor ? '4px 6px' : '0',
                  backgroundColor: importanceStyle.backgroundColor,
                  borderRadius: '4px'
                }}>
                  📎 {block.name}
                </div>
              );
            } else if (block.type === 'image') {
              results.push(
                <div key={blockKey} style={{
                  marginTop: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  padding: importanceStyle.backgroundColor ? '6px' : '0',
                  backgroundColor: importanceStyle.backgroundColor,
                  borderRadius: '4px'
                }}>
                  <img
                    src={block.url}
                    alt={block.alt || '이미지'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '80px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}
                    onError={(e) => {
                      // 이미지 로드 실패 시 대체 텍스트 표시
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.style.fontSize = '10px';
                        fallback.style.color = '#64748b';
                        fallback.textContent = `🖼️ ${block.caption || block.alt || '이미지'}`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  {(block.caption || block.alt) && (
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                      {block.caption || block.alt}
                    </div>
                  )}
                </div>
              );
            } else if (block.type === 'bookmark') {
              results.push(
                <div key={blockKey} style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: importanceStyle.backgroundColor ? '4px 6px' : '0',
                  backgroundColor: importanceStyle.backgroundColor,
                  borderRadius: '4px'
                }}>
                  🔗 {block.title || block.url}
                </div>
              );
            }
          }
        }
      });
    }

    // 레거시 content 필드 확인
    if (results.length === 0 && memo.content) {
      return memo.content.length > 100 ? memo.content.substring(0, 100) + '...' : memo.content;
    }

    return results.length > 0 ? results : '내용 없음';
  };

  // 하이라이팅된 텍스트 렌더링 (모든 중요도 표시)
  const renderHighlightedText = (text: string, importanceRanges?: any[], blockIndex: number = 0) => {
    if (!importanceRanges || importanceRanges.length === 0) {
      const displayText = text.length > 200 ? text.substring(0, 200) + '...' : text;
      return (
        <span key={blockIndex}>
          {blockIndex > 0 && <br />}
          {displayText}
        </span>
      );
    }

    const ranges = [...importanceRanges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;
    let totalLength = 0;
    const maxLength = 100;

    ranges.forEach(range => {
      // 길이 제한 체크
      if (totalLength >= maxLength) return;

      // 이전 부분 (스타일 없음)
      if (range.start > lastIndex) {
        const beforeText = text.substring(lastIndex, range.start);
        const remainingLength = maxLength - totalLength;
        const truncatedText = beforeText.length > remainingLength ?
                             beforeText.substring(0, remainingLength) : beforeText;
        parts.push({ text: truncatedText });
        totalLength += truncatedText.length;
      }

      // 길이 제한 체크
      if (totalLength >= maxLength) return;

      // 현재 범위 (스타일 적용)
      const rangeText = text.substring(range.start, range.end);
      const remainingLength = maxLength - totalLength;
      const truncatedRangeText = rangeText.length > remainingLength ?
                                rangeText.substring(0, remainingLength) : rangeText;
      parts.push({
        text: truncatedRangeText,
        level: range.level
      });
      totalLength += truncatedRangeText.length;
      lastIndex = range.end;
    });

    // 마지막 부분 (스타일 없음)
    if (lastIndex < text.length && totalLength < maxLength) {
      const afterText = text.substring(lastIndex);
      const remainingLength = maxLength - totalLength;
      const truncatedText = afterText.length > remainingLength ?
                           afterText.substring(0, remainingLength) : afterText;
      parts.push({ text: truncatedText });
      totalLength += truncatedText.length;
    }

    return (
      <span key={blockIndex}>
        {blockIndex > 0 && <br />}
        {parts.map((part, index) => (
          <span
            key={index}
            style={part.level ? {
              backgroundColor: getImportanceStyle(part.level).backgroundColor,
              padding: '1px 2px',
              borderRadius: '2px',
              fontWeight: '500'
            } : {}}
          >
            {part.text}
          </span>
        ))}
        {totalLength >= maxLength ? '...' : ''}
      </span>
    );
  };

  // 필터링된 하이라이팅 텍스트 렌더링 (선택된 중요도만 표시, 검색어 매칭 고려)
  const renderFilteredHighlightedText = (text: string, importanceRanges?: any[], blockIndex: number = 0) => {
    if (!importanceRanges || importanceRanges.length === 0) {
      if (searchShowGeneralContent && (!searchQuery || flexibleMatch(text, searchQuery))) {
        // 일반 내용: 검색어가 포함된 경우 전체 블록 표시 (길이 제한 있음)
        const displayText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        return (
          <span key={blockIndex}>
            {blockIndex > 0 && <br />}
            {displayText}
          </span>
        );
      }
      return null;
    }

    const ranges = [...importanceRanges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;
    let totalLength = 0;
    const maxLength = 100;
    let hasMatchingContent = false;

    ranges.forEach(range => {
      // 길이 제한 체크
      if (totalLength >= maxLength) return;

      // 이전 부분 (일반 텍스트) - 검색어 매칭 및 필터 확인
      if (range.start > lastIndex && searchShowGeneralContent) {
        const beforeText = text.substring(lastIndex, range.start);
        if (!searchQuery || flexibleMatch(beforeText, searchQuery)) {
          // 일반 내용이 검색어를 포함하면 전체 구간 표시 (길이 제한 적용)
          const remainingLength = maxLength - totalLength;
          const truncatedText = beforeText.length > remainingLength ?
                               beforeText.substring(0, remainingLength) : beforeText;
          parts.push({ text: truncatedText });
          totalLength += truncatedText.length;
          hasMatchingContent = true;
        }
      }

      // 현재 범위 (중요도 있는 텍스트 - 필터 적용 및 검색어 매칭)
      if (searchImportanceFilters.has(range.level)) {
        const rangeText = text.substring(range.start, range.end);

        // 검색어가 있으면 해당 범위 텍스트에서 검색어 매칭 확인
        if (!searchQuery || flexibleMatch(rangeText, searchQuery)) {
          // 길이 제한 체크
          if (totalLength >= maxLength) return;

          const remainingLength = maxLength - totalLength;
          const truncatedRangeText = rangeText.length > remainingLength ?
                                    rangeText.substring(0, remainingLength) : rangeText;
          parts.push({
            text: truncatedRangeText,
            level: range.level
          });
          totalLength += truncatedRangeText.length;
          hasMatchingContent = true;
        }
      }

      lastIndex = range.end;
    });

    // 마지막 부분 (일반 텍스트) - 검색어 매칭 및 필터 확인
    if (lastIndex < text.length && totalLength < maxLength && searchShowGeneralContent) {
      const afterText = text.substring(lastIndex);
      if (!searchQuery || flexibleMatch(afterText, searchQuery)) {
        // 일반 내용이 검색어를 포함하면 전체 구간 표시 (길이 제한 적용)
        const remainingLength = maxLength - totalLength;
        const truncatedText = afterText.length > remainingLength ?
                             afterText.substring(0, remainingLength) : afterText;
        parts.push({ text: truncatedText });
        totalLength += truncatedText.length;
        hasMatchingContent = true;
      }
    }

    // 매칭되는 내용이 없으면 null 반환 (빈 메시지 표시 안함)
    if (parts.length === 0 || !hasMatchingContent) {
      return null;
    }

    return (
      <span key={blockIndex}>
        {blockIndex > 0 && <br />}
        {parts.map((part, index) => (
          <span
            key={index}
            style={part.level ? {
              backgroundColor: getImportanceStyle(part.level).backgroundColor,
              padding: '1px 2px',
              borderRadius: '2px',
              fontWeight: '500'
            } : {}}
          >
            {part.text}
          </span>
        ))}
        {totalLength >= maxLength ? '...' : ''}
      </span>
    );
  };

  // 카테고리의 모든 하위 메모를 재귀적으로 가져오는 함수
  const getAllMemosFromCategory = (categoryId: string, page: Page): MemoBlock[] => {
    const category = page.categories?.find(c => c.id === categoryId);
    if (!category) return [];

    const childMemos: MemoBlock[] = [];

    category.children.forEach(childId => {
      // 하위가 메모인 경우
      const memo = page.memos?.find(m => m.id === childId);
      if (memo) {
        childMemos.push(memo);
      } else {
        // 하위가 카테고리인 경우 재귀 호출
        const nestedMemos = getAllMemosFromCategory(childId, page);
        childMemos.push(...nestedMemos);
      }
    });

    return childMemos;
  };

  // 메모의 중요도 개수를 계산하는 함수
  const calculateImportanceCount = (memo: MemoBlock): { total: number; filtered: number } => {
    let total = 0;
    let filtered = 0;

    if (!memo.blocks) {
      return { total, filtered };
    }

    memo.blocks.forEach(block => {
      if (block.type === 'text') {
        const textBlock = block as any;
        if (textBlock.importanceRanges && textBlock.importanceRanges.length > 0) {
          textBlock.importanceRanges.forEach((range: any) => {
            total++;
            if (searchImportanceFilters.has(range.level)) {
              filtered++;
            }
          });
        }
      } else if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
        const blockWithImportance = block as any;
        if (blockWithImportance.importance) {
          total++;
          if (searchImportanceFilters.has(blockWithImportance.importance)) {
            filtered++;
          }
        }
      }
    });

    return { total, filtered };
  };

  // blocks에서 파일/이미지/URL 등의 메타데이터 검색
  const searchBlockMetadata = (block: any, query: string): boolean => {
    switch (block.type) {
      case 'file':
        // 파일 이름과 URL 검색
        return flexibleMatch(block.name || '', query) || flexibleMatch(block.url || '', query);
      case 'image':
        // 이미지 alt, caption, URL 검색
        return flexibleMatch(block.alt || '', query) ||
               flexibleMatch(block.caption || '', query) ||
               flexibleMatch(block.url || '', query);
      case 'bookmark':
        // 북마크 제목, 설명, URL 검색
        return flexibleMatch(block.title || '', query) ||
               flexibleMatch(block.description || '', query) ||
               flexibleMatch(block.url || '', query);
      case 'callout':
        // 콜아웃 내용 검색
        return flexibleMatch(block.content || '', query);
      case 'quote':
        // 인용구 내용과 저자 검색
        return flexibleMatch(block.content || '', query) ||
               flexibleMatch(block.author || '', query);
      case 'code':
        // 코드 내용 검색
        return flexibleMatch(block.content || '', query);
      default:
        return false;
    }
  };

  // 검색 로직
  const searchMemos = (query: string, category: SearchCategory): MemoBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];

    // 현재 페이지의 모든 메모 (카테고리 children 포함)
    const directMemos = currentPage.memos || [];
    const categoryMemos: MemoBlock[] = [];

    // 모든 카테고리의 children 메모 가져오기
    currentPage.categories?.forEach(cat => {
      const childMemos = getAllMemosFromCategory(cat.id, currentPage);
      categoryMemos.push(...childMemos);
    });

    // 중복 제거
    const allMemoIds = new Set([...directMemos.map(m => m.id), ...categoryMemos.map(m => m.id)]);
    const currentPageMemos: MemoBlock[] = Array.from(allMemoIds).map(id => {
      return directMemos.find(m => m.id === id) || categoryMemos.find(m => m.id === id)!;
    });

    // 검색어가 없으면 중요도 필터만 적용하여 현재 페이지의 모든 메모 반환
    if (!query.trim()) {
      const filteredMemos = currentPageMemos.filter(memo => {
        // blocks가 없거나 비어있으면 항상 표시
        if (!memo.blocks || memo.blocks.length === 0) {
          return true;
        }

        // 어떤 블록이라도 중요도 필터를 통과하면 메모 표시
        return memo.blocks.some(block => {
          // 텍스트 블록: 중요도 필터 적용
          if (block.type === 'text') {
            const filteredContent = getFilteredTextFromBlock(block);
            return filteredContent && filteredContent.length > 0;
          }

          // 파일/이미지/북마크 블록: 중요도 필터 확인
          if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
            const blockWithImportance = block as any;
            const hasImportance = blockWithImportance.importance;
            // 중요도가 없거나 필터에 포함된 중요도면 표시
            return !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
          }

          // 다른 블록 타입은 항상 표시
          return true;
        });
      });

      // 중요도 개수로 정렬 (필터에 체크된 중요도 개수 → 전체 중요도 개수 순)
      return filteredMemos.sort((a, b) => {
        const aCount = calculateImportanceCount(a);
        const bCount = calculateImportanceCount(b);

        // 1순위: 필터에 체크된 중요도 개수 (내림차순)
        if (bCount.filtered !== aCount.filtered) {
          return bCount.filtered - aCount.filtered;
        }

        // 2순위: 전체 중요도 개수 (내림차순)
        return bCount.total - aCount.total;
      });
    }

    // 검색어가 있으면 텍스트 매칭 + 중요도 필터 적용
    const matchedMemos = currentPageMemos.filter(memo => {
      let matchesQuery = false;

      switch (category) {
        case 'title':
          matchesQuery = flexibleMatch(memo.title, query);
          break;
        case 'tags':
          matchesQuery = memo.tags?.some(tag => flexibleMatch(tag, query)) || false;
          break;
        case 'content':
          // 기본 content 검색
          if (memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          // blocks 내용도 검색 (중요도 필터링 적용)
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
        case 'memos':
          // 메모만 검색 (제목, 태그, 내용 모두)
          if (flexibleMatch(memo.title, query)) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.tags?.some(tag => flexibleMatch(tag, query))) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
        case 'all':
        default:
          // 제목 검색
          if (flexibleMatch(memo.title, query)) {
            matchesQuery = true;
          }
          // 태그 검색
          if (!matchesQuery && memo.tags?.some(tag => flexibleMatch(tag, query))) {
            matchesQuery = true;
          }
          // 내용 검색
          if (!matchesQuery && memo.content && flexibleMatch(memo.content, query)) {
            matchesQuery = true;
          }
          // blocks 내용 검색 (중요도 필터링 적용)
          if (!matchesQuery && memo.blocks) {
            matchesQuery = memo.blocks.some(block => {
              if (block.type === 'text') {
                const filteredContent = getFilteredTextFromBlock(block);
                return filteredContent && flexibleMatch(filteredContent, query);
              }
              // 파일/이미지/북마크: 검색어 매칭 + 중요도 필터 확인
              if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
                const blockWithImportance = block as any;
                const hasImportance = blockWithImportance.importance;
                const passesImportanceFilter = !hasImportance || searchImportanceFilters.has(blockWithImportance.importance);
                const passesSearchQuery = searchBlockMetadata(block, query);
                return passesImportanceFilter && passesSearchQuery;
              }
              // 기타 블록: 메타데이터 검색만
              return searchBlockMetadata(block, query);
            });
          }
          break;
      }

      return matchesQuery;
    });

    // 중요도 개수로 정렬 (필터에 체크된 중요도 개수 → 전체 중요도 개수 순)
    return matchedMemos.sort((a, b) => {
      const aCount = calculateImportanceCount(a);
      const bCount = calculateImportanceCount(b);

      // 1순위: 필터에 체크된 중요도 개수 (내림차순)
      if (bCount.filtered !== aCount.filtered) {
        return bCount.filtered - aCount.filtered;
      }

      // 2순위: 전체 중요도 개수 (내림차순)
      return bCount.total - aCount.total;
    });
  };

  // 카테고리 검색 로직 (중요도 필터 예외)
  const searchCategories = (query: string): CategoryBlock[] => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return [];

    if (!query.trim()) {
      // 검색어가 없으면 모든 카테고리 반환
      return currentPage.categories;
    }

    // 검색어가 있으면 제목이나 태그가 일치하는 카테고리 반환
    return currentPage.categories.filter(category => {
      if (flexibleMatch(category.title, query)) return true;
      if (category.tags?.some(tag => flexibleMatch(tag, query))) return true;
      return false;
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // 검색 모드는 포커스 상태에 따라 결정되므로 여기서는 변경하지 않음
  };

  const handleCategoryChange = (category: SearchCategory) => {
    setSearchCategory(category);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchCategoryResults([]);
    setIsSearchMode(false);
    setIsSearchFocused(false);
  };

  return (
    <div
      data-tutorial="left-panel"
      className={styles.leftPanel}
      style={{ width: `${width}px` }}>
      <div className={styles.header}>
        {/* 사용자 정보 영역 */}
        {userEmail && (
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{userEmail}</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className={styles.logoutButton}
                title="로그아웃"
              >
                로그아웃
              </button>
            )}
          </div>
        )}

        <div className={styles.headerTop}>
          <h2 className={styles.title}>마인드맵</h2>
          {onStartTutorial && (
            <button
              onClick={onStartTutorial}
              className={styles.tutorialButton}
              title="튜토리얼 다시 보기"
            >
              ?
            </button>
          )}
        </div>

        {/* 검색 UI */}
        <div className={styles.searchSection}>
          <div className={styles.searchInputRow}>
            <input
              data-tutorial="search"
              type="text"
              placeholder="메모 검색..."
              value={searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                handleSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                // 백스페이스, 삭제 키 등의 이벤트 전파 방지
                if (e.key === 'Backspace' || e.key === 'Delete') {
                  e.stopPropagation();
                }
              }}
              className={styles.searchInput}
              onFocus={() => {
                setIsSearchFocused(true);
                setIsSearchMode(true);
              }}
              onBlur={() => {
                // 검색 결과 클릭을 위해 blur 처리를 지연
                setTimeout(() => {
                  setIsSearchFocused(false);
                  setIsSearchMode(false);
                }, 200);
              }}
            />

            {searchQuery && (
              <button
                onClick={clearSearch}
                className={styles.clearSearchButton}
              >
                ✕
              </button>
            )}
          </div>

          {/* 필터 토글 버튼 - 검색창 아래로 이동 */}
          <div className={styles.filterToggleRow}>
            <button
              onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
              onClick={() => setShowSearchFilters(!showSearchFilters)}
              className={`${styles.filterToggleButton} ${showSearchFilters ? styles.active : styles.inactive}`}
            >
              {/* 엑셀 스타일 필터 아이콘 (와이어프레임) */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 2h12l-4 6v4l-4-2v-2L1 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              필터
            </button>
          </div>

          {/* 검색 필터들 - 기본적으로 숨김 */}
          {showSearchFilters && (
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
                  {['all', 'memos', 'categories', 'title', 'tags', 'content'].map((category) => (
                    <button
                      key={category}
                      onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
                      onClick={() => handleCategoryChange(category as SearchCategory)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: searchCategory === category ? '#3b82f6' : '#ffffff',
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

              {/* 중요도 필터 선택 - 내용 검색이나 전체/메모 검색일 때만 표시 (카테고리 제외) */}
              {(searchCategory === 'content' || searchCategory === 'all' || searchCategory === 'memos') && (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    중요도 필터
                  </span>

                  {/* 일반 내용 토글 */}
                  <div style={{ marginBottom: '8px' }}>
                    <label
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}
                      onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
                    >
                      <input
                        type="checkbox"
                        checked={searchShowGeneralContent}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSearchShowGeneralContent(e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginRight: '6px' }}
                      />
                      <span
                        onClick={() => setSearchShowGeneralContent(!searchShowGeneralContent)}
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
                        onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
                        onClick={() => {
                          const newFilters = new Set(searchImportanceFilters);
                          if (newFilters.has(level)) {
                            newFilters.delete(level);
                          } else {
                            newFilters.add(level);
                          }
                          setSearchImportanceFilters(newFilters);
                        }}
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
                      onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
                      onClick={() => {
                        setSearchImportanceFilters(new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[]));
                      }}
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
                      onMouseDown={(e) => e.preventDefault()} // 검색창 blur 방지
                      onClick={() => {
                        setSearchImportanceFilters(new Set());
                      }}
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
          )}
        </div>
      </div>
      
      {/* 검색 결과 섹션 */}
      {isSearchMode && (
        <div style={{ marginBottom: '24px', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              검색 결과 ({searchResults.length + searchCategoryResults.length}개)
            </h3>
          </div>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {/* 메모 결과 */}
            {searchResults.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {searchCategoryResults.length > 0 && (
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                    메모 ({searchResults.length}개)
                  </h4>
                )}
                {searchResults.map(memo => {
                  const parentPage = pages.find(p => p.memos?.some(m => m.id === memo.id));
                  return (
                    <div
                      key={memo.id}
                      style={{
                        padding: '12px 16px',
                        paddingRight: '40px', // 삭제 버튼 공간 확보
                        marginBottom: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '13px',
                        position: 'relative'
                      }}
                      onClick={() => {
                        console.log('[LeftPanel] Memo clicked:', memo.title, memo.id);
                        if (parentPage) {
                          console.log('[LeftPanel] Parent page:', parentPage.name, parentPage.id);
                          // 페이지 전환 (같은 페이지면 무시됨)
                          onPageSelect(parentPage.id);
                          // 페이지 ID를 함께 전달하여 즉시 네비게이션
                          if (onNavigateToMemo) {
                            console.log('[LeftPanel] Calling onNavigateToMemo');
                            onNavigateToMemo(memo.id, parentPage.id);
                          } else {
                            console.error('[LeftPanel] onNavigateToMemo is not defined!');
                          }
                        }
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                        {memo.title || '제목 없음'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                        📄 {parentPage?.name || '페이지 없음'}
                      </div>
                      {memo.tags && memo.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          {memo.tags.map(tag => (
                            <span key={tag} style={{
                              padding: '2px 6px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              borderRadius: '3px',
                              fontSize: '10px'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ color: '#475569', fontSize: '11px', lineHeight: '1.3' }}>
                        {(() => {
                          const content = renderSearchResultContent(memo);
                          // 빈 배열이나 null인 경우 "내용 없음" 표시
                          if (Array.isArray(content) && content.length === 0) {
                            return '내용 없음';
                          }
                          return content;
                        })()}
                      </div>

                      {/* 삭제 버튼 */}
                      {onDeleteMemo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`"${memo.title || '제목 없음'}" 메모를 정말 삭제하시겠습니까?`)) {
                              onDeleteMemo(memo.id);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }}
                          title="메모 삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 카테고리 결과 */}
            {searchCategoryResults.length > 0 && (
              <div>
                {searchResults.length > 0 && (
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                    카테고리 ({searchCategoryResults.length}개)
                  </h4>
                )}
                {searchCategoryResults.map(category => {
                  const parentPage = pages.find(p => p.categories?.some(c => c.id === category.id));
                  return (
                    <div
                      key={category.id}
                      style={{
                        padding: '12px 16px',
                        paddingRight: '40px', // 삭제 버튼 공간 확보
                        marginBottom: '8px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '13px',
                        position: 'relative'
                      }}
                      onClick={() => {
                        console.log('[LeftPanel] Category clicked:', category.title, category.id);
                        if (parentPage) {
                          console.log('[LeftPanel] Parent page:', parentPage.name, parentPage.id);
                          // 페이지 전환 (같은 페이지면 무시됨)
                          onPageSelect(parentPage.id);
                          // 페이지 ID를 함께 전달하여 즉시 네비게이션
                          if (onNavigateToCategory) {
                            console.log('[LeftPanel] Calling onNavigateToCategory');
                            onNavigateToCategory(category.id, parentPage.id);
                          } else {
                            console.error('[LeftPanel] onNavigateToCategory is not defined!');
                          }
                        }
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fde68a';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef3c7';
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#78350f', marginBottom: '4px' }}>
                        📁 {category.title || '제목 없음'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                        📄 {parentPage?.name || '페이지 없음'}
                      </div>
                      {category.tags && category.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {category.tags.map(tag => (
                            <span key={tag} style={{
                              padding: '2px 6px',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              borderRadius: '3px',
                              fontSize: '10px'
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 삭제 버튼 */}
                      {onDeleteCategory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`"${category.title || '제목 없음'}" 카테고리를 정말 삭제하시겠습니까?`)) {
                              onDeleteCategory(category.id);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            color: '#92400e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#92400e';
                          }}
                          title="카테고리 삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 결과 없음 */}
            {searchResults.length === 0 && searchCategoryResults.length === 0 && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 페이지 섹션 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, flex: 1, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            페이지
          </h3>
          <button
            onClick={onAddPage}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            +
          </button>
        </div>
        <div>
          {pages.map(page => (
          <div
            key={page.id}
            onClick={() => onPageSelect(page.id)}
            onDoubleClick={() => handleDoubleClick(page)}
            style={{
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: currentPageId === page.id ? '#f3f4f6' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8px',
              minHeight: '20px'
            }}
            onMouseOver={(e) => {
              if (currentPageId !== page.id) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseOut={(e) => {
              if (currentPageId !== page.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ 
              flex: 1, 
              minWidth: 0,
              marginRight: '8px'
            }}>
              {editingPageId === page.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#374151',
                    width: '100%',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
              ) : (
                <span style={{ 
                  display: 'block',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  fontSize: '14px'
                }}>
                  {page.name}
                </span>
              )}
            </div>
            
            {editingPageId !== page.id && (
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                flexShrink: 0,
                paddingTop: '2px'
              }}>
                {/* 편집 아이콘 */}
                <button
                  onClick={(e) => handleEditClick(page, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="페이지 이름 편집"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/>
                  </svg>
                </button>
                
                {/* 삭제 아이콘 */}
                <button
                  onClick={(e) => handleDeleteClick(page, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="페이지 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))
          }
        </div>
      </div>

      <Resizer direction="left" onResize={onResize} />
    </div>
  );
};

export default LeftPanel;