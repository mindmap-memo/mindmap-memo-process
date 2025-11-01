import React from 'react';
import { TextBlock, ImportanceRange, ContentBlock } from '../../../../types';
import { useAnalyticsTrackers } from '../../../../features/analytics/hooks/useAnalyticsTrackers';

interface UseTextBlockInputParams {
  block: TextBlock;
  content: string;
  importanceRanges: ImportanceRange[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setContent: (content: string) => void;
  setIsFocused: (focused: boolean) => void;
  setShowImportanceMenu: (value: boolean) => void;
  setSelectedRange: (range: { start: number; end: number } | null) => void;
  onUpdate?: (block: TextBlock) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onInsertBlockAfter?: (afterBlockId: string, newBlock: ContentBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  onSaveToHistory?: () => void;
}

export const useTextBlockInput = (params: UseTextBlockInputParams) => {
  const {
    block,
    content,
    importanceRanges,
    textareaRef,
    setContent,
    setIsFocused,
    setShowImportanceMenu,
    setSelectedRange,
    onUpdate,
    onCreateNewBlock,
    onInsertBlockAfter,
    onDeleteBlock,
    onMergeWithPrevious,
    onSaveToHistory
  } = params;
  const analytics = useAnalyticsTrackers();

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

    // 로컬 상태 즉시 업데이트
    setContent(newContent);

    // 부모에게도 즉시 알림 (debounce 없이)
    if (onUpdate) {
      onUpdate({ ...block, content: newContent, importanceRanges });
    }

    // Track analytics (only if content is not empty)
    if (newContent.trim()) {
      analytics.trackMemoContentEdited();
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
            // Track analytics
            analytics.trackFileAttached('image');
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
            // Track analytics
            analytics.trackFileAttached('file');
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
    // blur 시 현재 textarea의 실제 값을 가져와서 저장
    const currentValue = textareaRef.current?.value || '';

    setIsFocused(false);

    // 내용이 변경되었으면 저장
    if (currentValue !== block.content && onUpdate) {
      // 로컬 상태도 업데이트
      setContent(currentValue);
      onUpdate({ ...block, content: currentValue, importanceRanges });

      // 실제로 내용이 변경되었을 때만 히스토리 저장
      if (onSaveToHistory) {
        setTimeout(() => onSaveToHistory(), 100); // 약간의 지연으로 업데이트 완료 후 저장
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // isEditing 파라미터를 사용하지 않으므로 제거할 수 있지만, 호환성 유지를 위해 남겨둠
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return {
    handleKeyDown,
    handleInputChange,
    handlePaste,
    handleFocus,
    handleBlur,
    handleClick
  };
};
