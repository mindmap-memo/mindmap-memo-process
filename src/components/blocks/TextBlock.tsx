import React, { useState, useRef, useEffect } from 'react';
import { TextBlock, ContentBlockType } from '../../types';
import BlockSelector from '../BlockSelector';

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
          onUpdate({ ...block, content });
        }
      }, 300); // 300ms 후 자동 저장

      return () => clearTimeout(timeoutId);
    }
  }, [content, block, onUpdate]);

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

  if (isEditing) {
    return (
      <>
        <div style={{ 
          marginBottom: '0px', 
          position: 'relative',
          minHeight: '28px'
        }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            data-block-id={block.id}
            style={{
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
      </>
    );
  }

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
      {block.content || ''}
    </div>
  );
};

export default TextBlockComponent;