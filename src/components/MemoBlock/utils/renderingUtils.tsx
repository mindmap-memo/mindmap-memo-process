import React from 'react';
import { ImportanceLevel, ImportanceRange, MemoBlock as MemoBlockType } from '../../../types';

/**
 * 중요도 레벨별 형광펜 스타일 정의 (TextBlock과 동일)
 */
export const getImportanceStyle = (level: ImportanceLevel) => {
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

/**
 * 읽기 모드에서 하이라이팅된 텍스트 렌더링 (필터링 적용)
 */
export const renderHighlightedText = (
  text: string,
  importanceRanges?: ImportanceRange[],
  activeFilters?: Set<ImportanceLevel>,
  showGeneral?: boolean
) => {
  if (!importanceRanges || importanceRanges.length === 0) {
    // 하이라이팅이 없는 일반 텍스트는 일반 텍스트 필터에 따라 표시/숨김
    return showGeneral === false ? '' : text;
  }

  const ranges = [...importanceRanges].sort((a, b) => a.start - b.start);
  const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
  let lastIndex = 0;

  ranges.forEach(range => {
    // 이전 부분 (스타일 없음)
    if (range.start > lastIndex) {
      parts.push({ text: text.substring(lastIndex, range.start) });
    }

    // 현재 범위 (스타일 적용)
    parts.push({
      text: text.substring(range.start, range.end),
      level: range.level
    });

    lastIndex = range.end;
  });

  // 마지막 부분 (스타일 없음)
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex) });
  }

  return parts.map((part, index) => {
    // 필터링 적용: 중요도가 있는 부분은 필터에 따라 표시/숨김
    if (part.level && activeFilters && !activeFilters.has(part.level)) {
      return null; // 필터에 포함되지 않은 중요도는 숨김
    }

    // 일반 텍스트 필터링 적용
    if (!part.level && showGeneral === false) {
      return null; // 일반 텍스트가 비활성화되면 숨김
    }

    return (
      <span
        key={index}
        style={part.level ? {
          backgroundColor: getImportanceStyle(part.level).backgroundColor,
          padding: '1px 0px',
          borderRadius: '2px',
          fontWeight: '500',
          margin: '0'
        } : {}}
      >
        {part.text}
      </span>
    );
  });
};

/**
 * 공백 크기를 계산하는 함수 (최대 1블록 높이로 제한)
 */
export const getSpacerHeight = (consecutiveHiddenBlocks: number): string => {
  if (consecutiveHiddenBlocks <= 1) return '0';
  return '0.8em'; // 적당한 공백 크기
};

/**
 * 블록이 필터링되어 보이는지 확인하는 함수
 */
export const isBlockVisible = (
  block: any,
  activeImportanceFilters?: Set<ImportanceLevel>,
  showGeneralContent?: boolean
): boolean => {
  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
  const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
  const isDefaultFilterState = (!activeImportanceFilters ||
                               (activeImportanceFilters.size === allLevels.length &&
                                allLevels.every(level => activeImportanceFilters.has(level)))) &&
                              showGeneralContent !== false;

  if (isDefaultFilterState) return true;

  if (block.type === 'text') {
    const textBlock = block;
    if (!textBlock.content || textBlock.content.trim() === '') {
      return showGeneralContent !== false;
    }

    if (!textBlock.importanceRanges || textBlock.importanceRanges.length === 0) {
      return showGeneralContent !== false;
    }

    // 필터에 맞는 중요도 범위가 있는지 확인
    return textBlock.importanceRanges.some((range: ImportanceRange) =>
      activeImportanceFilters && activeImportanceFilters.has(range.level)
    ) || (showGeneralContent !== false && textBlock.importanceRanges.length < textBlock.content.length);
  }

  // 비텍스트 블록(image, file, bookmark, callout, quote, code, table, checklist 등)의 중요도 필터링
  const blockWithImportance = block as any;

  // 중요도가 있는 경우
  if (blockWithImportance.importance) {
    return activeImportanceFilters ? activeImportanceFilters.has(blockWithImportance.importance) : true;
  }

  // 중요도가 없는 경우 (일반 내용)
  return showGeneralContent !== false;
};

/**
 * 메모 블록의 가장 높은 중요도를 찾는 함수
 */
export const getHighestImportanceLevel = (memo: MemoBlockType): ImportanceLevel | null => {
  if (!memo.blocks || memo.blocks.length === 0) return null;

  // 중요도 우선순위 정의 (높은 순서부터)
  const importancePriority: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

  let highestLevel: ImportanceLevel | null = null;

  memo.blocks.forEach(block => {
    if (block.type === 'text') {
      const textBlock = block as any; // TextBlock으로 캐스팅
      if (textBlock.importanceRanges && textBlock.importanceRanges.length > 0) {
        textBlock.importanceRanges.forEach((range: ImportanceRange) => {
          if (!highestLevel || importancePriority.indexOf(range.level) < importancePriority.indexOf(highestLevel)) {
            highestLevel = range.level;
          }
        });
      }
    } else {
      // 비텍스트 블록의 중요도 확인 (image, file, callout, bookmark, quote, code, table, sheets 등)
      const blockWithImportance = block as any;
      if (blockWithImportance.importance) {
        if (!highestLevel || importancePriority.indexOf(blockWithImportance.importance) < importancePriority.indexOf(highestLevel)) {
          highestLevel = blockWithImportance.importance;
        }
      }
    }
  });

  return highestLevel;
};
