import { useState, useCallback, useEffect } from 'react';
import { MemoBlock, ContentBlock } from '../../../types';

interface HistoryState {
  blocks: ContentBlock[];
  timestamp: number;
}

export const useUndoRedo = (
  selectedMemo: MemoBlock | undefined,
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void
) => {
  const [undoHistory, setUndoHistory] = useState<HistoryState[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryState[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // 히스토리에 현재 상태 저장
  const saveToHistory = useCallback(() => {
    if (!selectedMemo || isUndoRedoAction) {
      return;
    }

    const currentState: HistoryState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };

    // 마지막 상태와 동일하면 저장하지 않음
    setUndoHistory(prev => {
      const lastState = prev[prev.length - 1];
      if (lastState && JSON.stringify(lastState.blocks) === JSON.stringify(currentState.blocks)) {
        return prev;
      }

      const newHistory = [...prev, currentState];
      // 히스토리 크기 제한 (최대 50개)
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });

    // 새로운 액션이 발생하면 redo 히스토리 클리어
    setRedoHistory([]);
  }, [selectedMemo, isUndoRedoAction]);

  // Undo 기능
  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || !selectedMemo) return;

    setIsUndoRedoAction(true);

    // 현재 상태를 redo 히스토리에 저장
    const currentState: HistoryState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };
    setRedoHistory(prev => [...prev, currentState]);

    // undo 히스토리에서 이전 상태 복원
    const previousState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));

    onMemoUpdate(selectedMemo.id, { blocks: previousState.blocks });

    setTimeout(() => {
      setIsUndoRedoAction(false);
    }, 100);
  }, [undoHistory, selectedMemo, onMemoUpdate]);

  // Redo 기능
  const handleRedo = useCallback(() => {
    if (redoHistory.length === 0 || !selectedMemo) return;

    setIsUndoRedoAction(true);

    // 현재 상태를 undo 히스토리에 저장
    const currentState: HistoryState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };
    setUndoHistory(prev => [...prev, currentState]);

    // redo 히스토리에서 다음 상태 복원
    const nextState = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));

    onMemoUpdate(selectedMemo.id, { blocks: nextState.blocks });

    setTimeout(() => {
      setIsUndoRedoAction(false);
    }, 100);
  }, [redoHistory, selectedMemo, onMemoUpdate]);

  // 키보드 단축키 (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에 포커스가 있는지 확인
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      // Undo/Redo는 항상 허용
      if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
        if (event.shiftKey) {
          // Ctrl+Shift+Z: Redo
          event.preventDefault();
          handleRedo();
        } else {
          // Ctrl+Z: Undo
          event.preventDefault();
          handleUndo();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    undoHistory,
    redoHistory,
    saveToHistory,
    handleUndo,
    handleRedo,
    canUndo: undoHistory.length > 0,
    canRedo: redoHistory.length > 0
  };
};
