import React from 'react';
import { ImportanceLevel, ImportanceRange, TextBlock } from '../../../../types';

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

interface UseTextBlockRenderingParams {
  block: TextBlock;
  content: string;
  importanceRanges: ImportanceRange[];
  backgroundKey: number;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
}

export const useTextBlockRendering = (params: UseTextBlockRenderingParams) => {
  const {
    block,
    content,
    importanceRanges,
    backgroundKey,
    activeImportanceFilters,
    showGeneralContent
  } = params;

  // 필터링이 적용된 편집모드 배경 렌더링
  const renderFilteredStyledText = (text: string, ranges?: ImportanceRange[], activeFilters?: Set<ImportanceLevel>, showGeneral?: boolean) => {
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      // 배경 레이어에서는 중요도가 없으면 아무것도 렌더링하지 않음
      return null;
    }

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;

    sortedRanges.forEach(range => {
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

    const result = parts.map((part, index) => {
      const importanceStyle = part.level ? getImportanceStyle(part.level) : {};

      // 중요도가 있는 경우
      if (part.level) {
        // 필터링 확인
        if (activeFilters && !activeFilters.has(part.level)) {
          // 필터링된 부분도 투명하게 렌더링하여 위치 유지
          return (
            <span
              key={index}
              style={{
                color: 'transparent',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              {part.text}
            </span>
          );
        }

        // 중요도 있는 부분 렌더링
        return (
          <span
            key={index}
            style={{
              backgroundColor: importanceStyle.backgroundColor,
              padding: '1px 0px',
              borderRadius: '2px',
              fontWeight: '500',
              color: 'transparent',
              margin: '0',
              display: 'inline'
            }}
          >
            {part.text}
          </span>
        );
      }

      // 일반 텍스트도 투명하게 렌더링하여 위치 유지
      return (
        <span
          key={index}
          style={{
            color: 'transparent',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {part.text}
        </span>
      );
    });

    return result;
  };

  // 텍스트에 중요도 스타일 적용
  const renderStyledText = (text: string, ranges: ImportanceRange[] = importanceRanges || []) => {
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      return null; // 중요도가 없으면 배경 레이어에 아무것도 렌더링하지 않음
    }

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;

    sortedRanges.forEach(range => {
      // 이전 부분 (스타일 없음)
      if (lastIndex < range.start) {
        parts.push({ text: text.substring(lastIndex, range.start) });
      }

      // 중요도 적용 부분
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
      // 중요도가 있는 경우
      if (part.level) {
        const importanceStyle = getImportanceStyle(part.level);

        return (
          <span
            key={`${backgroundKey}-${index}-${part.level}`}
            style={{
              backgroundColor: importanceStyle.backgroundColor,
              padding: '1px 0px',
              borderRadius: '2px',
              fontWeight: '500',
              color: 'transparent',
              margin: '0',
              display: 'inline',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            {part.text}
          </span>
        );
      }

      // 일반 텍스트도 투명하게 렌더링하여 위치 유지
      return (
        <span
          key={`${backgroundKey}-${index}-empty`}
          style={{
            color: 'transparent',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {part.text}
        </span>
      );
    });
  };

  // 필터링이 적용된 하이라이트 텍스트 렌더링 (MemoBlock과 동일한 로직)
  const renderFilteredHighlightedText = (text: string, ranges?: ImportanceRange[], activeFilters?: Set<ImportanceLevel>, showGeneral?: boolean) => {
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      // 하이라이팅이 없는 일반 텍스트는 일반 텍스트 필터에 따라 표시/숨김
      return showGeneral === false ? '' : text;
    }

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;

    sortedRanges.forEach(range => {
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
      // 필터링 적용 - 조건에 맞지 않으면 null 반환하여 아예 렌더링하지 않음
      if (part.level) {
        // 중요도가 있는 부분은 필터에 맞는지 확인
        if (activeFilters && !activeFilters.has(part.level)) {
          return null; // 필터링된 부분은 렌더링하지 않음
        }
      } else {
        // 일반 텍스트 부분은 showGeneral에 따라 결정
        if (showGeneral === false) {
          return null; // 일반 텍스트 숨김
        }
      }

      const style = part.level ? getImportanceStyle(part.level) : {};
      return (
        <span key={index} style={part.level ? {
          ...style,
          padding: '1px 2px',
          borderRadius: '2px',
          fontWeight: '500',
          margin: '0 1px'
        } : {}}>
          {part.text}
        </span>
      );
    }).filter(Boolean); // null 값들을 제거
  };

  // 읽기 모드에서만 제대로 된 색상으로 중요도 표시
  const renderStyledTextForReadMode = (text: string, ranges: ImportanceRange[] = block.importanceRanges || []) => {
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      return text;
    }

    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;

    sortedRanges.forEach(range => {
      // 이전 부분 (스타일 없음)
      if (lastIndex < range.start) {
        parts.push({ text: text.substring(lastIndex, range.start) });
      }

      // 중요도 적용 부분
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

    return parts.map((part, index) => (
      <span
        key={index}
        style={part.level ? {
          ...getImportanceStyle(part.level),
          padding: '1px 2px',
          borderRadius: '2px',
          fontWeight: '500',
          margin: '0 1px'
        } : {}}
      >
        {part.text}
      </span>
    ));
  };

  // 배경 레이어 렌더링 최적화 - useMemo로 캐싱
  const backgroundLayer = React.useMemo(() => {
    if (!importanceRanges || importanceRanges.length === 0) {
      return null;
    }

    return (activeImportanceFilters || showGeneralContent !== undefined) ?
      renderFilteredStyledText(content, importanceRanges, activeImportanceFilters, showGeneralContent) :
      renderStyledText(content, importanceRanges);
  }, [content, importanceRanges, activeImportanceFilters, showGeneralContent, backgroundKey]);

  return {
    renderFilteredStyledText,
    renderStyledText,
    renderFilteredHighlightedText,
    renderStyledTextForReadMode,
    backgroundLayer
  };
};
