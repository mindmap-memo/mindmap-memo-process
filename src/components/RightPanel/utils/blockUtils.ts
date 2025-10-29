import { ContentBlock, TextBlock, ImportanceLevel, MemoBlock, ContentBlockType } from '../../../types';

/**
 * 블록 타입 목록 (BlockSelector에서 사용)
 */
export const blockTypes = [
  { type: 'text' as ContentBlockType, label: '텍스트', icon: '📝' },
  { type: 'callout' as ContentBlockType, label: '콜아웃', icon: '💡' },
  { type: 'checklist' as ContentBlockType, label: '체크리스트', icon: '✓' },
  { type: 'quote' as ContentBlockType, label: '인용구', icon: '💬' },
  { type: 'code' as ContentBlockType, label: '코드', icon: '💻' },
  { type: 'image' as ContentBlockType, label: '이미지', icon: '🖼️' },
  { type: 'file' as ContentBlockType, label: '파일', icon: '📎' },
  { type: 'bookmark' as ContentBlockType, label: '북마크', icon: '🔖' },
  { type: 'table' as ContentBlockType, label: '테이블', icon: '📊' }
];

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
  block: ContentBlock,
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
    const textBlock = block as TextBlock;
    if (!textBlock.content || textBlock.content.trim() === '') {
      return showGeneralContent !== false;
    }

    if (!textBlock.importanceRanges || textBlock.importanceRanges.length === 0) {
      return showGeneralContent !== false;
    }

    // 필터에 맞는 중요도 범위가 있는지 확인
    return textBlock.importanceRanges.some(range =>
      activeImportanceFilters && activeImportanceFilters.has(range.level)
    ) || (showGeneralContent !== false && textBlock.importanceRanges.length < textBlock.content.length);
  }

  // 다른 블록 타입들은 기본적으로 표시
  return true;
};

/**
 * 선택된 블록 중 첫 번째 블록의 위치 계산
 */
export const getTopSelectedBlockPosition = (
  selectedBlocks: string[],
  selectedMemo: MemoBlock | null
): number | null => {
  if (selectedBlocks.length === 0 || !selectedMemo?.blocks) return null;

  const firstSelectedIndex = selectedMemo.blocks.findIndex(block =>
    selectedBlocks.includes(block.id)
  );

  if (firstSelectedIndex === -1) return null;

  return firstSelectedIndex;
};

/**
 * 기존 메모에 blocks가 없으면 초기화
 */
export const ensureBlocks = (memo: MemoBlock): MemoBlock => {
  if (!memo.blocks || memo.blocks.length === 0) {
    return {
      ...memo,
      blocks: memo.content ?
        [{ id: memo.id + '_text', type: 'text', content: memo.content }] :
        [{ id: memo.id + '_text', type: 'text', content: '' }]
    };
  }
  return memo;
};

/**
 * 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
 */
export const isDefaultFilterState = (
  activeImportanceFilters?: Set<ImportanceLevel>,
  showGeneralContent?: boolean
): boolean => {
  const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

  return (!activeImportanceFilters ||
          (activeImportanceFilters.size === allLevels.length &&
           allLevels.every(level => activeImportanceFilters.has(level)))) &&
         showGeneralContent !== false;
};
