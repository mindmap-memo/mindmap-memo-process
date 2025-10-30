import { MemoBlock, CategoryBlock, ImportanceLevel, ContentBlock, Page } from '../../../types';

// 텍스트를 공백 제거한 상태로 정규화
export const normalizeText = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, '');
};

// 유연한 검색 함수 (공백 무시)
export const flexibleMatch = (text: string, query: string): boolean => {
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
export const getFilteredTextFromBlock = (
  block: any,
  searchImportanceFilters: Set<ImportanceLevel>,
  searchShowGeneralContent: boolean
): string => {
  if (block.type !== 'text' || !block.content) return '';

  const { content, importanceRanges } = block;

  if (!importanceRanges || importanceRanges.length === 0) {
    // 중요도 없는 일반 텍스트
    return searchShowGeneralContent ? content : '';
  }

  // 중요도 필터 적용
  const ranges = [...importanceRanges].sort((a: any, b: any) => a.start - b.start);
  let filteredText = '';
  let lastIndex = 0;

  ranges.forEach((range: any) => {
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

// 블록 메타데이터 검색 (파일명, URL 등)
export const searchBlockMetadata = (block: ContentBlock, query: string): boolean => {
  switch (block.type) {
    case 'file':
      // 파일명 검색
      return flexibleMatch(block.name || '', query);
    case 'image':
      // 이미지 alt 텍스트 검색
      return flexibleMatch(block.alt || '', query);
    case 'bookmark':
      // URL과 제목, 설명 검색
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

// 카테고리에서 모든 자식 메모 가져오기
export const getAllMemosFromCategory = (categoryId: string, page: Page): MemoBlock[] => {
  const result: MemoBlock[] = [];

  // 해당 카테고리를 부모로 가진 메모 찾기
  const childMemos = page.memos.filter(memo => memo.parentId === categoryId);
  result.push(...childMemos);

  // 해당 카테고리를 부모로 가진 하위 카테고리들의 메모도 재귀적으로 찾기
  const childCategories = page.categories?.filter(cat => cat.parentId === categoryId) || [];
  childCategories.forEach(childCat => {
    result.push(...getAllMemosFromCategory(childCat.id, page));
  });

  return result;
};

// 메모의 중요도 개수 계산
export const calculateImportanceCount = (
  memo: MemoBlock,
  searchImportanceFilters?: Set<ImportanceLevel>
): { filtered: number; total: number } => {
  let filteredCount = 0;
  let totalCount = 0;

  if (!memo.blocks || memo.blocks.length === 0) {
    return { filtered: 0, total: 0 };
  }

  memo.blocks.forEach(block => {
    // 텍스트 블록의 중요도 범위 계산
    if (block.type === 'text') {
      const textBlock = block as any;
      if (textBlock.importanceRanges && textBlock.importanceRanges.length > 0) {
        textBlock.importanceRanges.forEach((range: any) => {
          totalCount++;
          if (searchImportanceFilters && searchImportanceFilters.has(range.level)) {
            filteredCount++;
          }
        });
      }
    }

    // 파일/이미지/북마크 블록의 중요도 계산
    if (block.type === 'file' || block.type === 'image' || block.type === 'bookmark') {
      const blockWithImportance = block as any;
      if (blockWithImportance.importance) {
        totalCount++;
        if (searchImportanceFilters && searchImportanceFilters.has(blockWithImportance.importance)) {
          filteredCount++;
        }
      }
    }
  });

  return { filtered: filteredCount, total: totalCount };
};
