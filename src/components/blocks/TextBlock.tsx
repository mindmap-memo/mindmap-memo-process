import React, { useState, useRef, useEffect } from 'react';
import { TextBlock, ContentBlockType, ImportanceLevel, ImportanceRange } from '../../types';
import BlockSelector from '../BlockSelector';

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
      return { backgroundColor: '#ffab91', color: '#000' }; // 코랄 형광펜 - 데이터
    default:
      return {};
  }
};

const IMPORTANCE_LABELS = {
  critical: '🔴 매우중요',
  important: '🟠 중요',
  opinion: '🟣 의견',
  reference: '🔵 참고',
  question: '🟡 질문',
  idea: '🟢 아이디어',
  data: '🟤 데이터',
  none: '강조 해제'
};

interface TextBlockProps {
  block: TextBlock;
  isEditing?: boolean;
  onUpdate?: (block: TextBlock) => void;
  onConvertToBlock?: (blockType: ContentBlockType) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void; // 필터를 기본 상태로 리셋하는 함수
}

const TextBlockComponent: React.FC<TextBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  onConvertToBlock,
  onCreateNewBlock,
  onDeleteBlock,
  onFocusPrevious,
  onFocusNext,
  onMergeWithPrevious,
  activeImportanceFilters,
  showGeneralContent,
  onResetFilters
}) => {
  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
  const isDefaultFilterState = () => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

    // activeImportanceFilters가 없거나 모든 레벨을 포함하고 있고, showGeneralContent가 true인 경우
    return (!activeImportanceFilters ||
            (activeImportanceFilters.size === allLevels.length &&
             allLevels.every(level => activeImportanceFilters.has(level)))) &&
           showGeneralContent !== false;
  };

  const canEdit = isDefaultFilterState();

  // 필터링된 텍스트 생성 함수
  const getFilteredText = () => {
    if (!block.content) return '';
    if (canEdit || (!activeImportanceFilters && showGeneralContent !== false)) {
      return content; // 필터링 없음
    }

    if (!block.importanceRanges || block.importanceRanges.length === 0) {
      return showGeneralContent === false ? '' : content;
    }

    // 간단한 필터링 적용
    const ranges = [...block.importanceRanges].sort((a, b) => a.start - b.start);
    let result = '';
    let lastIndex = 0;

    ranges.forEach(range => {
      // 이전 부분 (일반 텍스트)
      if (range.start > lastIndex && showGeneralContent !== false) {
        result += block.content.substring(lastIndex, range.start);
      }

      // 현재 범위 (중요도 텍스트)
      if (!activeImportanceFilters || activeImportanceFilters.has(range.level)) {
        result += block.content.substring(range.start, range.end);
      }

      lastIndex = range.end;
    });

    // 마지막 부분 (일반 텍스트)
    if (lastIndex < block.content.length && showGeneralContent !== false) {
      result += block.content.substring(lastIndex);
    }

    return result;
  };
  const [content, setContent] = useState(block.content);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [slashStartPos, setSlashStartPos] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showImportanceMenu, setShowImportanceMenu] = useState(false);
  const [importanceMenuPosition, setImportanceMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [, forceUpdate] = useState({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 외부에서 블록 내용이 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    if (block.content !== content) {
      setContent(block.content);
    }
  }, [block.content]);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (content !== block.content) {
      const timeoutId = setTimeout(() => {
        if (onUpdate) {
          onUpdate({ ...block, content, importanceRanges: block.importanceRanges });
        }
      }, 300); // 300ms 후 자동 저장

      return () => clearTimeout(timeoutId);
    }
  }, [content, block, onUpdate]);

  // block 전체 변경 시 강제 리렌더링 (특히 importanceRanges)
  useEffect(() => {
    console.log('🎨 Block updated, forcing rerender:', block);
    forceUpdate({});
  }, [block]);

  // 편집모드 진입 시 상태 동기화
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      console.log('🔧 Entering edit mode, syncing content:', {
        blockContent: block.content,
        localContent: content,
        textareaValue: textareaRef.current.value
      });

      // 텍스트박스 값이 로컬 content와 다르면 동기화
      if (textareaRef.current.value !== content) {
        textareaRef.current.value = content;
        console.log('🔧 Synced textarea value to local content:', content);
      }

      // 로컬 content가 블록 content와 다르면 동기화
      if (content !== block.content) {
        setContent(block.content);
        if (textareaRef.current) {
          textareaRef.current.value = block.content;
        }
        console.log('🔧 Synced local content to block content:', block.content);
      }
    }
  }, [isEditing]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 메뉴 내부 클릭이 아닌 경우에만 닫기
      if (showImportanceMenu && !target.closest('[data-importance-menu]')) {
        setShowImportanceMenu(false);
        setSelectedRange(null);
      }
    };

    if (showImportanceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImportanceMenu]);

  // 텍스트 영역 자동 리사이즈 (항상 적용)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const adjustHeight = () => {
        textarea.style.height = '28px'; // 먼저 기본 높이로 설정
        
        // 빈 내용이면 28px로 유지
        if (content.trim() === '') {
          return;
        }
        
        // 내용이 있으면 scrollHeight 사용하되, 한 줄일 때는 28px 유지
        if (content.includes('\n') || textarea.scrollHeight > 28) {
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };
      adjustHeight();
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showBlockSelector) {
      if (e.key === 'Escape') {
        setShowBlockSelector(false);
        setSlashQuery('');
        return;
      }
      return;
    }

    // Enter로 새 텍스트 블록 생성 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter key pressed, creating new block');
      
      // 현재 커서 위치에서 텍스트 분할
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart || 0;
      const beforeCursor = content.substring(0, cursorPos);
      const afterCursor = content.substring(cursorPos);
      
      // 현재 블록 내용을 커서 이전까지로 업데이트
      const updatedContent = beforeCursor;
      setContent(updatedContent);
      if (onUpdate) {
        onUpdate({ ...block, content: updatedContent });
      }
      
      // 새 텍스트 블록 생성 (커서 이후 내용으로)
      console.log('onCreateNewBlock available:', !!onCreateNewBlock);
      if (onCreateNewBlock) {
        console.log('Calling onCreateNewBlock with:', block.id, afterCursor);
        onCreateNewBlock(block.id, afterCursor);
        // 현재 textarea에서 포커스 해제
        if (textareaRef.current) {
          textareaRef.current.blur();
        }
      } else if (onConvertToBlock) {
        console.log('Fallback to onConvertToBlock');
        onConvertToBlock('text');
      }
    }

    if (e.key === 'Escape') {
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }

    // 백스페이스 처리 - 단순화된 로직
    if (e.key === 'Backspace') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const currentContent = textarea.value || '';

      console.log('🔧 Backspace pressed:', {
        selectionStart,
        selectionEnd,
        currentContent: `"${currentContent}"`,
        contentLength: currentContent.length
      });

      // 텍스트가 선택되어 있으면 기본 백스페이스 동작 (선택된 텍스트 삭제)
      if (selectionStart !== selectionEnd) {
        console.log('🔧 Text selected - allowing normal backspace');
        e.stopPropagation();
        return;
      }

      // 커서가 맨 앞에 있는 경우 - 블록 합치기 로직
      if (selectionStart === 0) {
        console.log('🔧 Cursor at start - attempting merge/delete');
        e.preventDefault();
        e.stopPropagation();

        // 현재 블록의 내용을 이전 블록과 합치기 시도
        if (onMergeWithPrevious) {
          console.log('🔧 Merging with previous block, content:', currentContent);
          onMergeWithPrevious(block.id, currentContent);
        } else {
          // 합치기가 불가능한 경우 (첫 번째 블록이거나 이전 블록이 텍스트가 아닌 경우)
          console.log('🔧 Cannot merge - first block or previous not text');
          // 내용이 없는 경우에만 블록 삭제
          if (currentContent === '') {
            if (onDeleteBlock) {
              console.log('🔧 Deleting empty block');
              onDeleteBlock(block.id);
            }
          } else {
            console.log('🔧 Block has content but cannot merge - keeping block');
            // 내용이 있지만 합칠 수 없으면 아무것도 하지 않음 (블록 유지)
          }
        }
        return;
      }

      // 커서가 중간에 있는 경우 - 기본 백스페이스 동작
      console.log('🔧 Cursor in middle - allowing normal backspace');
      e.stopPropagation();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    // 높이 자동 조정
    const textarea = e.target;
    textarea.style.height = '28px'; // 먼저 기본 높이로 설정
    
    // 내용이 있고 줄바꿈이 있거나 scrollHeight가 28px보다 크면 확장
    if (newContent.trim() !== '' && (newContent.includes('\n') || textarea.scrollHeight > 28)) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    
    // 슬래시 명령어 감지
    if (newContent[cursorPos - 1] === '/') {
      const textarea = e.target;
      const rect = textarea.getBoundingClientRect();
      
      // 대략적인 커서 위치 계산
      const lineHeight = 20;
      const lines = newContent.substring(0, cursorPos).split('\n');
      const currentLine = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;
      
      setSelectorPosition({
        x: rect.left + charInLine * 8,
        y: rect.top + currentLine * lineHeight + lineHeight + window.scrollY
      });
      
      setSlashStartPos(cursorPos - 1);
      setSlashQuery('');
      setShowBlockSelector(true);
    } else if (showBlockSelector) {
      // 슬래시 명령어 입력 중
      const slashPart = newContent.substring(slashStartPos);
      if (slashPart.startsWith('/')) {
        const query = slashPart.substring(1).split(/\s/)[0];
        setSlashQuery(query);
      } else {
        setShowBlockSelector(false);
        setSlashQuery('');
      }
    }
    
    setContent(newContent);
  };

  const handleBlockSelect = (blockType: ContentBlockType) => {
    // 슬래시 명령어 부분을 제거
    const beforeSlash = content.substring(0, slashStartPos);
    const afterSlash = content.substring(slashStartPos + slashQuery.length + 1);
    const cleanContent = beforeSlash + afterSlash;
    
    // 현재 블록 내용을 슬래시 명령어 제거한 내용으로 업데이트
    setContent(cleanContent);
    if (onUpdate) {
      onUpdate({ ...block, content: cleanContent });
    }
    
    // 새 블록 타입으로 변환 (블록 타입과 함께 전달)
    if (onConvertToBlock) {
      onConvertToBlock(blockType);
    }
    
    setShowBlockSelector(false);
    setSlashQuery('');
  };

  const handleCloseBlockSelector = () => {
    setShowBlockSelector(false);
    setSlashQuery('');
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (!showBlockSelector) {
      setIsFocused(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 텍스트 선택 처리
  const handleTextSelection = (e: React.MouseEvent) => {
    if (!isEditing) return;
    
    setTimeout(() => {
      const textarea = textareaRef.current;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        console.log('Selection:', { start, end, selectedText: textarea.value.substring(start, end) });
        
        if (start !== end && end > start) {
          setSelectedRange({ start, end });
          setImportanceMenuPosition({
            x: e.clientX,
            y: e.clientY - 10
          });
          setShowImportanceMenu(true);
          console.log('Showing importance menu');
        } else {
          setShowImportanceMenu(false);
          setSelectedRange(null);
        }
      }
    }, 10);
  };

  // 중요도 적용
  const applyImportance = (level: ImportanceLevel) => {
    if (!selectedRange) {
      console.log('No selected range');
      return;
    }
    
    console.log('🎨 Applying importance:', level, 'to range:', selectedRange);
    console.log('🎨 Current block before update:', block);
    console.log('🎨 Current importanceRanges:', block.importanceRanges);
    
    const ranges = block.importanceRanges || [];
    const newRange: ImportanceRange = {
      start: selectedRange.start,
      end: selectedRange.end,
      level: level
    };
    
    let updatedRanges: ImportanceRange[];

    if (level === 'none') {
      // 강조 해제: 선택된 범위와 겹치는 기존 범위들을 분할하거나 제거
      updatedRanges = [];

      ranges.forEach(range => {
        // 겹치지 않는 범위는 그대로 유지
        if (range.end <= selectedRange.start || range.start >= selectedRange.end) {
          updatedRanges.push(range);
        } else {
          // 겹치는 범위를 분할
          // 선택된 범위 앞부분
          if (range.start < selectedRange.start) {
            updatedRanges.push({
              start: range.start,
              end: selectedRange.start,
              level: range.level
            });
          }

          // 선택된 범위 뒷부분
          if (range.end > selectedRange.end) {
            updatedRanges.push({
              start: selectedRange.end,
              end: range.end,
              level: range.level
            });
          }
        }
      });
    } else {
      // 강조 적용: 겹치는 부분을 새 강조로 덮어쓰고, 기존 강조의 나머지 부분은 유지
      updatedRanges = [];

      ranges.forEach(range => {
        // 겹치지 않는 범위는 그대로 유지
        if (range.end <= selectedRange.start || range.start >= selectedRange.end) {
          updatedRanges.push(range);
        } else {
          // 겹치는 범위를 분할하여 겹치지 않는 부분만 유지
          // 선택된 범위 앞부분
          if (range.start < selectedRange.start) {
            updatedRanges.push({
              start: range.start,
              end: selectedRange.start,
              level: range.level
            });
          }

          // 선택된 범위 뒷부분
          if (range.end > selectedRange.end) {
            updatedRanges.push({
              start: selectedRange.end,
              end: range.end,
              level: range.level
            });
          }
          // 겹치는 중간 부분은 새 강조로 덮어쓰므로 제거
        }
      });

      // 새 강조 범위 추가
      updatedRanges.push(newRange);
    }
    
    console.log('🎨 Updated ranges:', updatedRanges);

    // 배열을 완전히 새로운 객체로 만들어서 React가 변경을 확실히 감지하도록 함
    const freshUpdatedRanges = updatedRanges.map(range => ({ ...range }));

    const updatedBlock = {
      ...block,
      importanceRanges: freshUpdatedRanges,
      // 추가적인 변경 감지를 위해 임시 timestamp 추가
      _lastImportanceUpdate: Date.now()
    };

    console.log('🎨 Updated block being sent to onUpdate:', updatedBlock);
    console.log('🎨 Updated block importanceRanges:', updatedBlock.importanceRanges);

    if (onUpdate) {
      onUpdate(updatedBlock);
    }

    // 상태를 즉시 업데이트하여 리렌더링 강제
    setShowImportanceMenu(false);
    setSelectedRange(null);

    // 강제로 리렌더링 (다중 호출로 확실히)
    forceUpdate({});
    setTimeout(() => forceUpdate({}), 10);
    setTimeout(() => forceUpdate({}), 50);

    // 포커스 복원
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  // 필터링이 적용된 편집모드 배경 렌더링
  const renderFilteredStyledText = (text: string, importanceRanges?: ImportanceRange[], activeFilters?: Set<ImportanceLevel>, showGeneral?: boolean) => {
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

      const importanceStyle = part.level ? getImportanceStyle(part.level) : {};
      return (
        <span
          key={index}
          style={part.level ? {
            backgroundColor: importanceStyle.backgroundColor,
            padding: '1px 0px',
            borderRadius: '2px',
            fontWeight: '500',
            color: 'transparent', // 텍스트는 투명하게
            margin: '0',
            display: 'inline'
          } : {
            color: 'rgba(0,0,0,0.05)' // 일반 텍스트도 거의 투명하게
          }}
        >
          {part.text}
        </span>
      );
    }).filter(Boolean); // null 값들을 제거
  };

  // 텍스트에 중요도 스타일 적용
  const renderStyledText = (text: string) => {
    console.log('🎨 TextBlock renderStyledText called for block:', block.id);
    console.log('🎨 Block content:', text);
    console.log('🎨 Block importance ranges:', block.importanceRanges);

    // 배열 내용 자세히 확인
    if (block.importanceRanges && block.importanceRanges.length > 0) {
      block.importanceRanges.forEach((range, index) => {
        console.log(`🎨 Range ${index}:`, range);
      });
    }
    
    if (!block.importanceRanges || block.importanceRanges.length === 0) {
      console.log('🎨 No importance ranges found, returning plain text');
      return text;
    }
    
    const ranges = [...block.importanceRanges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;
    
    ranges.forEach(range => {
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
      const importanceStyle = part.level ? getImportanceStyle(part.level) : {};
      console.log('🎨 Rendering part:', part.text, 'level:', part.level, 'style:', importanceStyle);

      return (
        <span
          key={index}
          style={part.level ? {
            backgroundColor: importanceStyle.backgroundColor,
            padding: '1px 0px',
            borderRadius: '2px',
            fontWeight: '500',
            color: 'transparent', // 텍스트는 투명하게
            margin: '0',
            display: 'inline'
          } : {
            color: 'rgba(0,0,0,0.05)' // 일반 텍스트도 거의 투명하게
          }}
        >
          {part.text}
        </span>
      );
    });
  };

  if (isEditing) {
    // 편집 모드
    return (
      <>
        <div style={{
          marginBottom: '0px',
          position: 'relative',
          minHeight: '28px'
        }}>
          {/* 배경에 스타일된 텍스트 표시 - 항상 표시 */}
          {block.importanceRanges && block.importanceRanges.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '0px',
                right: '0px',
                bottom: '0px',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.4',
                padding: '0px',
                pointerEvents: 'none',
                zIndex: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'transparent', // 텍스트는 투명하게, 배경색만 보이게
                userSelect: 'none' // 선택 불가능하게
              }}
            >
              {(activeImportanceFilters || showGeneralContent !== undefined) ?
                renderFilteredStyledText(content, block.importanceRanges, activeImportanceFilters, showGeneralContent) :
                renderStyledText(content)}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={canEdit ? content : getFilteredText()}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onMouseUp={handleTextSelection}
            data-block-id={block.id}
            disabled={!canEdit}
            placeholder={content === '' && isFocused ? "'/'를 입력하여 블록을 추가하거나 바로 텍스트를 입력하세요" : ''}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              minHeight: '28px',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 0',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'none',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              outline: 'none',
              lineHeight: '1.4',
              transition: 'all 0.15s ease',
              color: 'inherit',
              cursor: !canEdit ? 'not-allowed' : 'text'
            }}
            onMouseEnter={(e) => {
              // 중요도 스타일이 있는 경우 배경색 변경하지 않음
              if (!isFocused && (!block.importanceRanges || block.importanceRanges.length === 0)) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              // 중요도 스타일이 있는 경우 배경색 변경하지 않음
              if (!isFocused && (!block.importanceRanges || block.importanceRanges.length === 0)) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
        </div>
        
        <BlockSelector
          isVisible={showBlockSelector}
          position={selectorPosition}
          searchQuery={slashQuery}
          onSelect={handleBlockSelect}
          onClose={handleCloseBlockSelector}
        />
        
        {/* 중요도 메뉴 */}
        {showImportanceMenu && (
          <div
            data-importance-menu
            onMouseDown={(e) => e.preventDefault()} // 선택 해제 방지
            style={{
              position: 'fixed',
              left: importanceMenuPosition.x,
              top: importanceMenuPosition.y,
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              padding: '4px',
              minWidth: '140px'
            }}
          >
            {Object.entries(IMPORTANCE_LABELS).map(([level, label]) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Menu button clicked:', level);
                  applyImportance(level as ImportanceLevel);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // 필터링이 적용된 하이라이트 텍스트 렌더링 (MemoBlock과 동일한 로직)
  const renderFilteredHighlightedText = (text: string, importanceRanges?: ImportanceRange[], activeFilters?: Set<ImportanceLevel>, showGeneral?: boolean) => {
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
  const renderStyledTextForReadMode = (text: string) => {
    console.log('🎨 ReadMode renderStyledText called for block:', block.id);
    console.log('🎨 Block content:', text);
    console.log('🎨 Block importance ranges:', block.importanceRanges);

    // 배열 내용 자세히 확인
    if (block.importanceRanges && block.importanceRanges.length > 0) {
      block.importanceRanges.forEach((range, index) => {
        console.log(`🎨 ReadMode Range ${index}:`, range);
      });
    }

    if (!block.importanceRanges || block.importanceRanges.length === 0) {
      console.log('🎨 No importance ranges found, returning plain text');
      return text;
    }
    
    const ranges = [...block.importanceRanges].sort((a, b) => a.start - b.start);
    const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
    let lastIndex = 0;
    
    ranges.forEach(range => {
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

  // 읽기 모드
  return (
    <div
      onClick={handleClick}
      style={{
        padding: '2px 0',
        borderRadius: '4px',
        cursor: 'text',
        minHeight: '28px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.4',
        fontSize: '14px'
      }}
    >
{block.content ? (
        (activeImportanceFilters || showGeneralContent !== undefined) ?
          renderFilteredHighlightedText(block.content, block.importanceRanges, activeImportanceFilters, showGeneralContent) :
          renderStyledTextForReadMode(block.content)
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>빈 텍스트</span>
      )}
    </div>
  );
};

export default TextBlockComponent;