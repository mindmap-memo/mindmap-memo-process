import React from 'react';
import { MemoBlock } from '../../../types';

export interface UseKeyboardEventsProps {
  selectedBlocks: string[];
  setSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  setDragSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMemo: MemoBlock | null;
  handleBlocksDelete: () => void;
  handleBlocksMove: (direction: 'up' | 'down') => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

/**
 * 키보드 이벤트 처리 훅
 *
 * RightPanel에서 키보드 단축키를 처리합니다.
 *
 * **기능:**
 * - Delete/Backspace: 선택된 블록 삭제
 * - Escape: 블록 선택 해제
 * - Ctrl/Cmd + Arrow Up/Down: 블록 이동
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 */
export const useKeyboardEvents = ({
  selectedBlocks,
  setSelectedBlocks,
  setDragSelectedBlocks,
  selectedMemo,
  handleBlocksDelete,
  handleBlocksMove,
  handleUndo,
  handleRedo
}: UseKeyboardEventsProps) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에 포커스가 있을 때 처리
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      if (isInputFocused) {
        // Enter 키는 항상 허용 (블록 생성을 위해)
        if (event.key === 'Enter') {
          return;
        }

        // Undo/Redo는 입력 필드에서도 허용 (z 또는 Z)
        if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
          // Undo/Redo 로직으로 넘어감
        }
        // 선택된 블록이 있고 Delete/Backspace를 눌렀을 때만 예외 처리
        else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlocks.length > 0) {
          // 텍스트가 선택되어 있거나 커서가 중간에 있으면 일반 편집 동작
          const textarea = activeElement as HTMLTextAreaElement;

          if (textarea.selectionStart !== textarea.selectionEnd ||
              (textarea.selectionStart > 0 && textarea.selectionStart < textarea.value.length)) {
            return;
          }

          // 빈 입력 필드이거나 커서가 맨 앞/뒤에 있으면 블록 삭제 허용
        } else {
          return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksDelete();
        }
      } else if (event.key === 'Escape') {
        if (selectedBlocks.length > 0) {
          setSelectedBlocks([]);
          setDragSelectedBlocks([]);
        }
      } else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('up');
        }
      } else if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('down');
        }
      } else if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
        // RightPanel이 포커스되어 있을 때만 블록 Undo/Redo 처리
        // 그렇지 않으면 Canvas의 Undo/Redo가 작동하도록 통과
        const target = event.target as HTMLElement;
        const isInRightPanel = target.closest('[data-right-panel="true"]');

        if (isInRightPanel) {
          console.log('RightPanel: Handling Ctrl+Z in RightPanel');
          if (event.shiftKey) {
            // Ctrl+Shift+Z: Redo
            event.preventDefault();
            handleRedo();
          } else {
            // Ctrl+Z: Undo
            event.preventDefault();
            handleUndo();
          }
        } else {
          console.log('RightPanel: Not in RightPanel, letting Ctrl+Z pass through');
          // RightPanel 밖에서 발생한 이벤트는 통과
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBlocks, selectedMemo, handleBlocksDelete, handleBlocksMove, handleUndo, handleRedo, setSelectedBlocks, setDragSelectedBlocks]);
};
