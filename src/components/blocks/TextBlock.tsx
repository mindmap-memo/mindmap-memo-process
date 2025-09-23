import React, { useState, useRef, useEffect } from 'react';
import { TextBlock, ContentBlockType, ImportanceLevel, ImportanceRange } from '../../types';
import BlockSelector from '../BlockSelector';

// 중요도 레벨별 형광펜 스타일 정의
const getImportanceStyle = (level: ImportanceLevel) => {
  switch (level) {
    case 'critical':
      return { backgroundColor: '#ffcdd2', color: '#000' }; // 빨간 형광펜
    case 'high':
      return { backgroundColor: '#ffcc80', color: '#000' }; // 주황 형광펜
    case 'medium':
      return { backgroundColor: '#fff59d', color: '#000' }; // 노란 형광펜
    case 'low':
      return { backgroundColor: '#81d4fa', color: '#000' }; // 파란 형광펜
    case 'info':
      return { backgroundColor: '#c8e6c9', color: '#000' }; // 초록 형광펜
    default:
      return {};
  }
};

const IMPORTANCE_LABELS = {
  critical: '🔴 매우 중요',
  high: '🟠 중요',
  medium: '🟡 보통',
  low: '🔵 낮음',
  info: '⚪ 정보',
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
  onMergeWithPrevious
}) => {
  const [content, setContent] = useState(block.content);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [slashStartPos, setSlashStartPos] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showImportanceMenu, setShowImportanceMenu] = useState(false);
  const [importanceMenuPosition, setImportanceMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 외부에서 블록 내용이 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    if (block.content !== content) {
      setContent(block.content);
    }
  }, [block.content, block.importanceRanges]);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (content !== block.content) {
      const timeoutId = setTimeout(() => {
        if (onUpdate) {
          onUpdate({ ...block, content });
        }
      }, 300); // 300ms 후 자동 저장

      return () => clearTimeout(timeoutId);
    }
  }, [content, block, onUpdate]);

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

    // 백스페이스로 블록 합치기 (커서가 맨 앞에 있을 때)
    if (e.key === 'Backspace' && textareaRef.current?.selectionStart === 0) {
      // 현재 textarea의 실제 내용 가져오기
      const currentContent = textareaRef.current?.value || '';
      e.preventDefault();
      
      // 블록 합치기 시도 (내용이 있든 없든)
      if (onMergeWithPrevious) {
        onMergeWithPrevious(block.id, currentContent);
      } else {
        // 합치기가 불가능한 경우 (첫 번째 블록이거나 이전 블록이 텍스트가 아닌 경우)
        // 내용이 없는 경우에만 기존 로직 실행
        if (currentContent === '') {
          if (onFocusPrevious) {
            onFocusPrevious(block.id);
          }
          if (onDeleteBlock) {
            onDeleteBlock(block.id);
          }
        }
      }
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
    
    console.log('Applying importance:', level, 'to range:', selectedRange);
    console.log('Current block before update:', block);
    
    const ranges = block.importanceRanges || [];
    const newRange: ImportanceRange = {
      start: selectedRange.start,
      end: selectedRange.end,
      level: level
    };
    
    // 기존 범위와 겹치는 부분 제거
    const filteredRanges = ranges.filter(range => 
      range.end <= selectedRange.start || range.start >= selectedRange.end
    );
    
    // level이 'none'이 아닌 경우에만 새 범위 추가
    const updatedRanges = level === 'none' ? filteredRanges : [...filteredRanges, newRange];
    
    console.log('Updated ranges:', updatedRanges);
    
    const updatedBlock = { 
      ...block, 
      importanceRanges: updatedRanges 
    };
    
    console.log('Updated block being sent to onUpdate:', updatedBlock);
    
    if (onUpdate) {
      onUpdate(updatedBlock);
    }
    
    setShowImportanceMenu(false);
    setSelectedRange(null);
  };

  // 텍스트에 중요도 스타일 적용
  const renderStyledText = (text: string) => {
    console.log('🎨 TextBlock renderStyledText called for block:', block.id);
    console.log('🎨 Block content:', text);
    console.log('🎨 Block importance ranges:', block.importanceRanges);
    
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
          padding: '1px 3px',
          borderRadius: '3px',
          fontWeight: '500',
          color: 'transparent' // 텍스트는 투명하게, 배경색만 표시
        } : {
          color: 'transparent' // 일반 텍스트도 투명하게
        }}
      >
        {part.text}
      </span>
    ));
  };

  if (isEditing) {
    return (
      <>
        <div style={{ 
          marginBottom: '0px', 
          position: 'relative',
          minHeight: '28px'
        }}>
          {/* 배경에 스타일된 텍스트 표시 - 포커스가 없을 때만 */}
          {!isFocused && block.importanceRanges && block.importanceRanges.length > 0 && (
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
              {renderStyledText(content)}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onMouseUp={handleTextSelection}
            data-block-id={block.id}
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
              transition: 'all 0.15s ease'
            }}
            placeholder={content === '' && isFocused ? "'/'를 입력하여 블록을 추가하거나 바로 텍스트를 입력하세요" : ''}
            onMouseEnter={(e) => {
              if (!isFocused) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              if (!isFocused) {
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

  // 읽기 모드에서만 제대로 된 색상으로 중요도 표시
  const renderStyledTextForReadMode = (text: string) => {
    console.log('🎨 ReadMode renderStyledText called for block:', block.id);
    console.log('🎨 Block content:', text);
    console.log('🎨 Block importance ranges:', block.importanceRanges);
    
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
          padding: '1px 3px',
          borderRadius: '3px',
          fontWeight: '500'
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
      {block.content ? renderStyledTextForReadMode(block.content) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>빈 텍스트</span>
      )}
    </div>
  );
};

export default TextBlockComponent;