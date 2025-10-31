import React from 'react';
import { MemoBlock } from '../../../types';

export interface UseInputHandlersProps {
  selectedMemo: MemoBlock | null;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  setSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface UseInputHandlersReturn {
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTagInputKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeTag: (tagToRemove: string) => void;
  handleBlockSelect: (blockId: string) => void;
}

/**
 * 입력 핸들러 훅
 *
 * RightPanel의 입력 필드 관련 핸들러를 관리합니다.
 *
 * **기능:**
 * - 메모 제목 변경 처리
 * - 태그 입력 및 추가/삭제 처리
 * - 블록 선택 처리
 */
export const useInputHandlers = ({
  selectedMemo,
  onMemoUpdate,
  setSelectedBlocks
}: UseInputHandlersProps): UseInputHandlersReturn => {
  const [tagInput, setTagInput] = React.useState('');

  const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedMemo) {
      console.error('[useInputHandlers] handleTitleChange: selectedMemo is null or undefined');
      return;
    }
    if (!onMemoUpdate) {
      console.error('[useInputHandlers] handleTitleChange: onMemoUpdate is null or undefined');
      return;
    }
    try {
      onMemoUpdate(selectedMemo.id, { title: e.target.value });
    } catch (error) {
      console.error('[useInputHandlers] handleTitleChange error:', error);
    }
  }, [selectedMemo, onMemoUpdate]);

  const handleTagInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  const handleTagInputKeyPress = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && selectedMemo) {
      const newTag = tagInput.trim();
      if (!selectedMemo.tags.includes(newTag)) {
        onMemoUpdate(selectedMemo.id, { tags: [...selectedMemo.tags, newTag] });
      }
      setTagInput('');
    }
  }, [tagInput, selectedMemo, onMemoUpdate]);

  const removeTag = React.useCallback((tagToRemove: string) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, {
        tags: selectedMemo.tags.filter(tag => tag !== tagToRemove)
      });
    }
  }, [selectedMemo, onMemoUpdate]);

  const handleBlockSelect = React.useCallback((blockId: string) => {
    // 드래그 핸들 버튼 클릭 시 해당 블록만 선택
    setSelectedBlocks([blockId]);
  }, [setSelectedBlocks]);

  return {
    tagInput,
    setTagInput,
    handleTitleChange,
    handleTagInputChange,
    handleTagInputKeyPress,
    removeTag,
    handleBlockSelect
  };
};
