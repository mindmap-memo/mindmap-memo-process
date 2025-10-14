import { useCallback } from 'react';
import { MemoBlock, Page, MemoDisplaySize, CanvasActionType } from '../types';

/**
 * useMemoHandlers
 *
 * 메모 관련 CRUD 핸들러들을 관리하는 커스텀 훅입니다.
 *
 * **관리하는 기능:**
 * - 메모 업데이트 (updateMemo, updateMemoTitle, updateMemoBlockContent)
 * - 메모 크기 업데이트 (updateMemoSize, updateMemoDisplaySize)
 * - 메모 삭제 (deleteMemoBlock, deleteMemoById)
 * - 메모 추가 (addMemoBlock)
 *
 * @param props - pages, setPages, currentPageId 등
 * @returns 메모 관련 핸들러 함수들
 *
 * @example
 * ```tsx
 * const memoHandlers = useMemoHandlers({
 *   pages,
 *   setPages,
 *   currentPageId,
 *   selectedMemoId,
 *   setSelectedMemoId,
 *   saveCanvasState
 * });
 * ```
 */

interface UseMemoHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  selectedMemoId: string | null;
  setSelectedMemoId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMemoIds: string[];
  setSelectedMemoIds: React.Dispatch<React.SetStateAction<string[]>>;
  quickNavItems: any[];
  setQuickNavItems: React.Dispatch<React.SetStateAction<any[]>>;
  saveCanvasState?: (actionType: CanvasActionType, description: string) => void;
}

export const useMemoHandlers = (props: UseMemoHandlersProps) => {
  const {
    pages,
    setPages,
    currentPageId,
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,
    quickNavItems,
    setQuickNavItems,
    saveCanvasState
  } = props;

  /**
   * 메모 추가
   */
  const addMemoBlock = useCallback((position?: { x: number; y: number }) => {
    const newMemo: MemoBlock = {
      id: `memo-${Date.now()}`,
      title: '',
      content: '',
      tags: [],
      connections: [],
      position: position || { x: 100, y: 100 },
      blocks: [
        {
          id: `block-${Date.now()}`,
          type: 'text',
          content: ''
        }
      ]
    };

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: [...page.memos, newMemo] }
        : page
    ));

    setSelectedMemoId(newMemo.id);

    if (saveCanvasState) {
      setTimeout(() => {
        saveCanvasState('memo_create', `메모 추가: ${newMemo.id}`);
      }, 100);
    }

    return newMemo.id;
  }, [currentPageId, setPages, setSelectedMemoId, saveCanvasState]);

  /**
   * 메모 업데이트 (범용)
   */
  const updateMemo = useCallback((memoId: string, updates: Partial<MemoBlock>) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo =>
              memo.id === memoId
                ? { ...memo, ...updates }
                : memo
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 메모 크기 업데이트
   */
  const updateMemoSize = useCallback((memoId: string, size: { width: number; height: number }) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo =>
              memo.id === memoId
                ? { ...memo, size }
                : memo
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 메모 디스플레이 크기 업데이트
   */
  const updateMemoDisplaySize = useCallback((memoId: string, displaySize: MemoDisplaySize) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo =>
              memo.id === memoId
                ? { ...memo, displaySize }
                : memo
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 메모 제목 업데이트
   */
  const updateMemoTitle = useCallback((memoId: string, title: string) => {
    updateMemo(memoId, { title });
  }, [updateMemo]);

  /**
   * 메모 블록 내용 업데이트
   */
  const updateMemoBlockContent = useCallback((memoId: string, blockId: string, content: string) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo =>
              memo.id === memoId && memo.blocks
                ? {
                    ...memo,
                    blocks: memo.blocks.map(block =>
                      block.id === blockId && block.type === 'text'
                        ? { ...block, content }
                        : block
                    )
                  }
                : memo
            )
          }
        : page
    ));
  }, [currentPageId, setPages]);

  /**
   * 현재 선택된 메모 삭제
   */
  const deleteMemoBlock = useCallback(() => {
    if (!selectedMemoId) return;

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: page.memos.filter(memo => memo.id !== selectedMemoId) }
        : page
    ));
    setSelectedMemoId(null);

    if (saveCanvasState) {
      saveCanvasState('memo_delete', `메모 삭제: ${selectedMemoId}`);
    }
  }, [selectedMemoId, currentPageId, setPages, setSelectedMemoId, saveCanvasState]);

  /**
   * ID로 메모 삭제
   */
  const deleteMemoById = useCallback((memoId: string) => {
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        const updatedMemos = page.memos
          .filter(m => m.id !== memoId)
          .map(m => ({
            ...m,
            connections: m.connections.filter(connId => connId !== memoId)
          }));
        return { ...page, memos: updatedMemos };
      }
      return page;
    }));

    // 선택된 메모 목록에서 제거
    if (selectedMemoIds.includes(memoId)) {
      setSelectedMemoIds(prev => prev.filter(id => id !== memoId));
    }
    if (selectedMemoId === memoId) {
      setSelectedMemoId(null);
    }

    // Quick Nav에서 제거
    setQuickNavItems(prev => prev.filter(item => item.targetId !== memoId));

    if (saveCanvasState) {
      saveCanvasState('memo_delete', `메모 삭제: ${memoId}`);
    }
  }, [currentPageId, setPages, selectedMemoIds, setSelectedMemoIds, selectedMemoId, setSelectedMemoId, quickNavItems, setQuickNavItems, saveCanvasState]);

  return {
    addMemoBlock,
    updateMemo,
    updateMemoSize,
    updateMemoDisplaySize,
    updateMemoTitle,
    updateMemoBlockContent,
    deleteMemoBlock,
    deleteMemoById
  };
};
