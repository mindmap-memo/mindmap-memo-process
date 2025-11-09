import React from 'react';
import { MemoBlock, ImportanceLevel } from '../../../types';
import { getImportanceStyle } from '../utils/importanceStyles';
import { flexibleMatch, searchBlockMetadata } from '../utils/searchUtils';

interface UseSearchRenderingProps {
  searchQuery: string;
  searchImportanceFilters: Set<ImportanceLevel>;
  searchShowGeneralContent: boolean;
}

export const useSearchRendering = ({
  searchQuery,
  searchImportanceFilters,
  searchShowGeneralContent
}: UseSearchRenderingProps) => {

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
    if (!importanceRanges || !Array.isArray(importanceRanges) || importanceRanges.length === 0) {
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
    if (!importanceRanges || !Array.isArray(importanceRanges) || importanceRanges.length === 0) {
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

  return {
    renderSearchResultContent,
    renderHighlightedText,
    renderFilteredHighlightedText
  };
};
