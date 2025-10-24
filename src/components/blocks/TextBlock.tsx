import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TextBlock, ImportanceLevel, ImportanceRange, ContentBlock } from '../../types';

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

const IMPORTANCE_LABELS = {
  critical: '🔴 매우중요',
  important: '🟠 중요',
  opinion: '🟣 의견',
  reference: '🔵 참고',
  question: '🟡 질문',
  idea: '🟢 아이디어',
  data: '⚫ 데이터',
  none: '강조 해제'
};

interface TextBlockProps {
  block: TextBlock;
  isEditing?: boolean;
  onUpdate?: (block: TextBlock) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onInsertBlockAfter?: (afterBlockId: string, newBlock: ContentBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  onSaveToHistory?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void; // 필터를 기본 상태로 리셋하는 함수
}

const TextBlockComponent: React.FC<TextBlockProps> = React.memo(({
  block,
  isEditing = false,
  onUpdate,
  onCreateNewBlock,
  onInsertBlockAfter,
  onDeleteBlock,
  onFocusPrevious,
  onFocusNext,
  onMergeWithPrevious,
  onSaveToHistory,
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
  const [importanceRanges, setImportanceRanges] = useState<ImportanceRange[]>(block.importanceRanges || []);
  const [isFocused, setIsFocused] = useState(false);
  const [showImportanceMenu, setShowImportanceMenu] = useState(false);
  const [importanceMenuPosition, setImportanceMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [, forceUpdate] = useState({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부에서 블록 내용이 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    if (block.content !== content) {
      setContent(block.content);
    }
  }, [block.content]);

  // 외부에서 importanceRanges가 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    setImportanceRanges(block.importanceRanges || []);
  }, [block.importanceRanges]);


  // 자동 저장 제거 - 블록 단위 히스토리를 위해

  // block 전체 변경 시 강제 리렌더링 (특히 importanceRanges)
  useEffect(() => {
    forceUpdate({});
    // importanceRanges가 있는데 렌더링이 안되는 경우를 위한 추가 체크
    if (block.importanceRanges && block.importanceRanges.length > 0) {
      setTimeout(() => {
        forceUpdate({});
      }, 50);
    }
  }, [block]);

  // importanceRanges 전용 감지
  useEffect(() => {
    if (block.importanceRanges && block.importanceRanges.length > 0) {
      forceUpdate({});
      setTimeout(() => forceUpdate({}), 10);
    }
  }, [block.importanceRanges]);

  // 로컬 importanceRanges 변경 감지 (로그 제거)
  const prevImportanceRangesRef = React.useRef<ImportanceRange[]>([]);
  useEffect(() => {
    prevImportanceRangesRef.current = importanceRanges;
  }, [importanceRanges]);

  // 편집모드 진입 시 상태 동기화
  useEffect(() => {
    if (isEditing && textareaRef.current) {

      // 텍스트박스 값이 로컬 content와 다르면 동기화
      if (textareaRef.current.value !== content) {
        textareaRef.current.value = content;
      }

      // 로컬 content가 블록 content와 다르면 동기화
      if (content !== block.content) {
        setContent(block.content);
        if (textareaRef.current) {
          textareaRef.current.value = block.content;
        }
      }
    }
  }, [isEditing]);

  // 메뉴 외부 클릭/드래그 시 닫기
  useEffect(() => {
    const handleClickOrDragOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 메뉴 내부 클릭/드래그가 아니고, 현재 textarea도 아닌 경우 닫기
      if (showImportanceMenu &&
          !target.closest('[data-importance-menu]') &&
          target !== textareaRef.current) {
        setShowImportanceMenu(false);
        setSelectedRange(null);
      }
    };

    if (showImportanceMenu) {
      // mousedown과 drag 이벤트 모두 감지
      document.addEventListener('mousedown', handleClickOrDragOutside, true); // capture phase
      document.addEventListener('dragstart', handleClickOrDragOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOrDragOutside, true);
      document.removeEventListener('dragstart', handleClickOrDragOutside, true);
    };
  }, [showImportanceMenu]);

  // 메뉴가 렌더링된 후 실제 DOM 위치 확인
  useEffect(() => {
    // 로그 제거
  }, [showImportanceMenu, importanceMenuPosition]);

  // 텍스트 영역 자동 리사이즈 (항상 적용)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const adjustHeight = () => {
        textarea.style.height = '24px'; // 먼저 기본 높이로 설정

        // 빈 내용이면 24px로 유지
        if (content.trim() === '') {
          return;
        }

        // 내용이 있으면 scrollHeight 사용하되, 한 줄일 때는 24px 유지
        if (content.includes('\n') || textarea.scrollHeight > 24) {
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };
      adjustHeight();
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter로 새 텍스트 블록 생성 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // 현재 커서 위치에서 텍스트 분할
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart || 0;
      const beforeCursor = content.substring(0, cursorPos);
      const afterCursor = content.substring(cursorPos);
      
      // 현재 블록 내용을 커서 이전까지로 업데이트
      const updatedContent = beforeCursor;
      setContent(updatedContent);
      if (onUpdate) {
        onUpdate({ ...block, content: updatedContent, importanceRanges });
      }
      
      // 새 텍스트 블록 생성 (커서 이후 내용으로)
      if (onCreateNewBlock) {
        onCreateNewBlock(block.id, afterCursor);
        // blur 제거 - 새 블록으로의 포커스 이동을 방해하지 않도록
      }
    }

    if (e.key === 'Escape') {
      // Escape 키로 편집 종료 시 내용 저장
      if (content !== block.content && onUpdate) {
        onUpdate({ ...block, content, importanceRanges });
      }
      if (onSaveToHistory) {
        onSaveToHistory();
      }
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


      // 텍스트가 선택되어 있으면 기본 백스페이스 동작 (선택된 텍스트 삭제)
      if (selectionStart !== selectionEnd) {
        e.stopPropagation();
        return;
      }

      // 커서가 맨 앞에 있는 경우 - 블록 합치기 로직
      if (selectionStart === 0) {
        e.preventDefault();
        e.stopPropagation();

        // 현재 블록의 내용을 이전 블록과 합치기 시도
        if (onMergeWithPrevious) {
          onMergeWithPrevious(block.id, currentContent);
        } else {
          // 합치기가 불가능한 경우 (첫 번째 블록이거나 이전 블록이 텍스트가 아닌 경우)
          // 내용이 없는 경우에만 블록 삭제
          if (currentContent === '') {
            if (onDeleteBlock) {
              onDeleteBlock(block.id);
            }
          } else {
            // 내용이 있지만 합칠 수 없으면 아무것도 하지 않음 (블록 유지)
          }
        }
        return;
      }

      // 커서가 중간에 있는 경우 - 기본 백스페이스 동작
      e.stopPropagation();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;

    // 높이 자동 조정
    const textarea = e.target;
    textarea.style.height = '24px'; // 먼저 기본 높이로 설정

    // 내용이 있고 줄바꿈이 있거나 scrollHeight가 24px보다 크면 확장
    if (newContent.trim() !== '' && (newContent.includes('\n') || textarea.scrollHeight > 24)) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    setContent(newContent);

    // 입력 중에도 즉시 부모로 전달하여 상태 동기화 (importanceRanges 보존)
    if (onUpdate) {
      onUpdate({ ...block, content: newContent, importanceRanges });
    }
  };

  // 붙여넣기 핸들러
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || !onInsertBlockAfter) return;

    // 파일이 있는지 확인
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 이미지 파일 처리
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // FileReader로 이미지를 Data URL로 변환
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const imageBlock: ContentBlock = {
              id: Date.now().toString(),
              type: 'image',
              url: dataUrl,
              caption: file.name
            };
            onInsertBlockAfter(block.id, imageBlock);
            if (onSaveToHistory) {
              setTimeout(() => onSaveToHistory(), 100);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }

      // 일반 파일 처리
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // FileReader로 파일을 Data URL로 변환
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const fileBlock: ContentBlock = {
              id: Date.now().toString(),
              type: 'file',
              url: dataUrl,
              name: file.name,
              size: file.size
            };
            onInsertBlockAfter(block.id, fileBlock);
            if (onSaveToHistory) {
              setTimeout(() => onSaveToHistory(), 100);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }

    // 텍스트 데이터 처리
    const text = e.clipboardData?.getData('text');
    if (text) {
      // URL 감지 (http://, https:// 로 시작하는 경우)
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      const trimmedText = text.trim();

      if (urlRegex.test(trimmedText)) {
        e.preventDefault();

        // 북마크 블록 생성
        const bookmarkBlock: ContentBlock = {
          id: Date.now().toString(),
          type: 'bookmark',
          url: trimmedText,
          title: trimmedText
        };
        onInsertBlockAfter(block.id, bookmarkBlock);
        if (onSaveToHistory) {
          setTimeout(() => onSaveToHistory(), 100);
        }
        return;
      }
    }

    // 그 외의 경우는 기본 붙여넣기 동작 허용
  };


  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);

    // 내용이 변경되었으면 저장
    if (content !== block.content && onUpdate) {
      onUpdate({ ...block, content, importanceRanges });

      // 실제로 내용이 변경되었을 때만 히스토리 저장
      if (onSaveToHistory) {
        setTimeout(() => onSaveToHistory(), 100); // 약간의 지연으로 업데이트 완료 후 저장
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 텍스트 선택 처리 (드래그 끝난 후)
  const handleTextSelection = (e: React.MouseEvent) => {
    if (!isEditing || !canEdit) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && end > start) {
      // 텍스트가 선택된 경우
      setSelectedRange({ start, end });

      // 메뉴 크기 (8개 항목 * 약 32px + padding)
      const menuWidth = 150;
      const menuHeight = 280; // 여유있게 설정

      // 화면 크기
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // textarea의 실제 화면상 위치
      const textareaRect = textarea.getBoundingClientRect();

      // 드래그 끝난 위치 (마우스 업 위치)를 사용
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 기본 위치: 마우스 오른쪽에 바로 붙여서 표시
      let x = mouseX + 10;
      let y = mouseY - 10; // 마우스 위치보다 약간 위에 표시

      // 오른쪽 경계 체크 - 화면을 넘어가면 왼쪽에 표시
      if (x + menuWidth > viewportWidth) {
        x = mouseX - menuWidth - 10;
      }

      // 왼쪽 경계 체크
      if (x < 10) {
        x = 10;
      }

      // 아래쪽 경계 체크 - 양옆 체크와 동일한 방식
      if (y + menuHeight > viewportHeight) {
        y = viewportHeight - menuHeight - 10;
      }

      // 위쪽 경계 체크
      if (y < 10) {
        y = 10;
      }

      setImportanceMenuPosition({ x, y });
      setShowImportanceMenu(true);
    } else {
      setShowImportanceMenu(false);
      setSelectedRange(null);
    }
  };

  // 중요도 적용
  const applyImportance = (level: ImportanceLevel) => {
    if (!selectedRange) {
      return;
    }

    const ranges = importanceRanges || [];
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

    // 배열을 완전히 새로운 객체로 만들어서 React가 변경을 확실히 감지하도록 함
    const freshUpdatedRanges = updatedRanges.map(range => ({ ...range }));

    // 로컬 상태 즉시 업데이트 - 동기적으로 업데이트되지 않으므로 강제 리렌더링 필요
    setImportanceRanges(freshUpdatedRanges);

    // 강제 리렌더링을 위한 상태 업데이트
    forceUpdate({});

    const updatedBlock = {
      ...block,
      content: content, // 현재 입력 중인 content 상태 사용
      importanceRanges: freshUpdatedRanges
    };

    if (onUpdate) {
      onUpdate(updatedBlock);
    }

    // 중요도 변경 시 히스토리 저장
    if (onSaveToHistory) {
      setTimeout(() => onSaveToHistory(), 50); // 약간의 지연으로 업데이트 후 저장
    }

    // 상태를 즉시 업데이트하여 리렌더링 강제
    setShowImportanceMenu(false);
    setSelectedRange(null);

    // 포커스 복원
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
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

    const result = parts.map((part, index) => {
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

    return result;
  };

  // 텍스트에 중요도 스타일 적용
  const renderStyledText = (text: string, ranges: ImportanceRange[] = importanceRanges || []) => {
    if (!ranges || ranges.length === 0) {
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

    return parts.map((part, index) => {
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
    });
  };

  if (isEditing) {
    // 편집 모드
    return (
      <>
        <div style={{
          marginBottom: '0px',
          position: 'relative',
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* 배경에 스타일된 텍스트 표시 - div는 항상 렌더링, 내용만 조건부 */}
          <div
            data-importance-background="true"
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
              userSelect: 'none' // 선택 불가능하게
            }}
          >
            {/* 로컬 상태의 importanceRanges를 즉시 반영 */}
            {importanceRanges.length > 0 ? (
              (activeImportanceFilters || showGeneralContent !== undefined) ?
                renderFilteredStyledText(content, importanceRanges, activeImportanceFilters, showGeneralContent) :
                renderStyledText(content, importanceRanges)
            ) : null}
          </div>
          <textarea
            ref={textareaRef}
            value={canEdit ? content : getFilteredText()}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onMouseDown={(e) => {
              // 새로운 드래그 시작 시 기존 메뉴 닫기
              if (showImportanceMenu) {
                setShowImportanceMenu(false);
                setSelectedRange(null);
              }
              // 텍스트 선택을 위해 이벤트 전파 막기
              e.stopPropagation();
            }}
            onMouseUp={(e) => handleTextSelection(e)}
            data-block-id={block.id}
            disabled={!canEdit}
            placeholder={content === '' && isFocused ? "텍스트를 입력하세요" : ''}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              minHeight: '24px',
              border: 'none',
              borderRadius: '4px',
              padding: '1px 0',
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

        {/* 중요도 메뉴 - Portal을 사용하여 document.body에 렌더링 */}
        {showImportanceMenu && ReactDOM.createPortal(
          <div
            ref={menuRef}
            data-importance-menu
            onMouseDown={(e) => e.preventDefault()} // 선택 해제 방지
            style={{
              position: 'fixed',
              left: `${importanceMenuPosition.x}px`,
              top: `${importanceMenuPosition.y}px`,
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              padding: '4px',
              minWidth: '140px',
              maxWidth: '200px'
            }}
          >
            {Object.entries(IMPORTANCE_LABELS).map(([level, label]) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
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
          </div>,
          document.body
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
  const renderStyledTextForReadMode = (text: string, ranges: ImportanceRange[] = block.importanceRanges || []) => {

    // 배열 내용 자세히 확인
    if (ranges && ranges.length > 0) {
      ranges.forEach((range, index) => {
      });
    }

    if (!ranges || ranges.length === 0) {
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

  // 읽기 모드
  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1px 0',
        borderRadius: '4px',
        cursor: 'text',
        minHeight: '24px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.4',
        fontSize: '14px'
      }}
    >
{block.content ? (
        (activeImportanceFilters || showGeneralContent !== undefined) ?
          renderFilteredHighlightedText(block.content, block.importanceRanges, activeImportanceFilters, showGeneralContent) :
          renderStyledTextForReadMode(block.content, block.importanceRanges)
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>빈 텍스트</span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // props가 같으면 true 반환 (리렌더링 하지 않음)
  // props가 다르면 false 반환 (리렌더링 함)

  // block 객체 자체의 참조 비교로 단순화
  // importanceRanges 변경 시 block 객체가 새로 생성되므로 참조가 달라짐
  const isSame = (
    prevProps.block === nextProps.block &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.activeImportanceFilters === nextProps.activeImportanceFilters &&
    prevProps.showGeneralContent === nextProps.showGeneralContent
  );
  return isSame; // true면 리렌더링 안함, false면 리렌더링
});

export default TextBlockComponent;