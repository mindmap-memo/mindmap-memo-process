import React from 'react';
import { ImportanceLevel, TextBlock } from '../../../../types';

export const useTextFiltering = (
  block: TextBlock,
  content: string,
  canEdit: boolean,
  activeImportanceFilters?: Set<ImportanceLevel>,
  showGeneralContent?: boolean
) => {
  // 필터링된 텍스트 생성 함수 - useCallback으로 최적화
  const getFilteredText = React.useCallback(() => {
    if (!block.content) return '';
    if (canEdit || (!activeImportanceFilters && showGeneralContent !== false)) {
      return content;
    }

    if (!block.importanceRanges || !Array.isArray(block.importanceRanges) || block.importanceRanges.length === 0) {
      return showGeneralContent === false ? '' : content;
    }

    const ranges = [...block.importanceRanges].sort((a, b) => a.start - b.start);
    let result = '';
    let lastIndex = 0;

    ranges.forEach(range => {
      if (range.start > lastIndex && showGeneralContent !== false) {
        result += block.content.substring(lastIndex, range.start);
      }

      if (!activeImportanceFilters || activeImportanceFilters.has(range.level)) {
        result += block.content.substring(range.start, range.end);
      }

      lastIndex = range.end;
    });

    if (lastIndex < block.content.length && showGeneralContent !== false) {
      result += block.content.substring(lastIndex);
    }

    return result;
  }, [block.content, block.importanceRanges, canEdit, content, activeImportanceFilters, showGeneralContent]);

  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인 - useMemo로 최적화
  const canEditMemo = React.useMemo(() => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

    return (!activeImportanceFilters ||
            (activeImportanceFilters.size === allLevels.length &&
             allLevels.every(level => activeImportanceFilters.has(level)))) &&
           showGeneralContent !== false;
  }, [activeImportanceFilters, showGeneralContent]);

  return {
    getFilteredText,
    canEdit: canEditMemo
  };
};
