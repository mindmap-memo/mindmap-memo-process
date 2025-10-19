import { useState, useCallback, useEffect } from 'react';
import { Page, CanvasHistory, CanvasAction, CanvasActionType } from '../types';

interface UseCanvasHistoryProps {
  pages: Page[];
  currentPageId: string;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
}

interface UseCanvasHistoryReturn {
  canvasHistory: CanvasHistory;
  canUndo: boolean;
  canRedo: boolean;
  saveCanvasState: (actionType: CanvasActionType, description: string) => void;
  undoCanvasAction: () => void;
  redoCanvasAction: () => void;
}

export const useCanvasHistory = ({
  pages,
  currentPageId,
  setPages
}: UseCanvasHistoryProps): UseCanvasHistoryReturn => {
  // Canvas history for undo/redo functionality
  const [canvasHistory, setCanvasHistory] = useState<CanvasHistory>(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    return {
      past: [],
      present: currentPage ? {
        type: 'memo_create',
        timestamp: Date.now(),
        pageSnapshot: {
          memos: [...currentPage.memos],
          categories: [...(currentPage.categories || [])]
        },
        description: 'Initial state'
      } : null,
      future: [],
      maxHistorySize: 50
    };
  });

  // Canvas History Management Functions
  const saveCanvasState = useCallback((actionType: CanvasActionType, description: string) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return;

    const newAction: CanvasAction = {
      type: actionType,
      timestamp: Date.now(),
      pageSnapshot: {
        memos: [...currentPage.memos],
        categories: [...(currentPage.categories || [])]
      },
      description
    };

    setCanvasHistory(prev => {
      const newPast = prev.present ? [...prev.past, prev.present] : prev.past;

      // Limit history size
      const trimmedPast = newPast.length >= prev.maxHistorySize
        ? newPast.slice(-prev.maxHistorySize + 1)
        : newPast;

      return {
        ...prev,
        past: trimmedPast,
        present: newAction,
        future: [] // Clear future when new action is performed
      };
    });
  }, [pages, currentPageId]);

  const canUndo = canvasHistory.past.length > 0;
  const canRedo = canvasHistory.future.length > 0;

  const undoCanvasAction = useCallback(() => {
    console.log('⬅️ undoCanvasAction called', { canUndo, historyLength: canvasHistory.past.length });
    if (!canUndo || !canvasHistory.present) return;

    const previousAction = canvasHistory.past[canvasHistory.past.length - 1];

    // Restore the page state from the previous action
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: [...previousAction.pageSnapshot.memos],
            categories: [...previousAction.pageSnapshot.categories]
          }
        : page
    ));

    // Update history
    setCanvasHistory(prev => ({
      ...prev,
      past: prev.past.slice(0, -1),
      present: previousAction,
      future: prev.present ? [prev.present, ...prev.future] : prev.future
    }));

  }, [canUndo, canvasHistory, currentPageId, setPages]);

  const redoCanvasAction = useCallback(() => {
    console.log('➡️ redoCanvasAction called', { canRedo, futureLength: canvasHistory.future.length });
    if (!canRedo) return;

    const nextAction = canvasHistory.future[0];

    // Restore the page state from the next action
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: [...nextAction.pageSnapshot.memos],
            categories: [...nextAction.pageSnapshot.categories]
          }
        : page
    ));

    // Update history
    setCanvasHistory(prev => ({
      ...prev,
      past: prev.present ? [...prev.past, prev.present] : prev.past,
      present: nextAction,
      future: prev.future.slice(1)
    }));

  }, [canRedo, canvasHistory, currentPageId, setPages]);

  // Canvas keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Canvas undo/redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        console.log('🔄 Undo triggered from keyboard');
        e.preventDefault();
        undoCanvasAction();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        console.log('🔄 Redo triggered from keyboard');
        e.preventDefault();
        redoCanvasAction();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoCanvasAction, redoCanvasAction]);

  return {
    canvasHistory,
    canUndo,
    canRedo,
    saveCanvasState,
    undoCanvasAction,
    redoCanvasAction
  };
};
