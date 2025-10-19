import { useCallback } from 'react';
import { MemoBlock, Page, MemoDisplaySize, CanvasActionType } from '../types';
import { calculateCategoryArea, centerCanvasOnPosition } from '../utils/categoryAreaUtils';
import { createMemo, deleteMemo } from '../utils/api';

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
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  canvasScale: number;
  setCanvasOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
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
    leftPanelWidth,
    rightPanelOpen,
    rightPanelWidth,
    canvasScale,
    setCanvasOffset,
    saveCanvasState
  } = props;

  /**
   * 메모 추가
   * 영역과 겹치지 않는 위치를 자동으로 찾아 배치하고 화면 중앙으로 이동
   */
  const addMemoBlock = useCallback((position?: { x: number; y: number }) => {
    const originalPosition = position || { x: 100, y: 100 };
    let newPosition = { ...originalPosition };

    // 영역과 겹치지 않는 위치 찾기
    if (position) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage?.categories) {
        // 새 메모의 실제 크기 (기본 크기)
        const newMemoWidth = 320;
        const newMemoHeight = 180;
        let isOverlapping = true;
        let adjustedY = newPosition.y;
        const moveStep = 250; // 충분히 밀어내기 위한 이동 거리

        while (isOverlapping && adjustedY > -2000) {
          isOverlapping = false;

          for (const category of currentPage.categories) {
            if (category.isExpanded) {
              const area = calculateCategoryArea(category, currentPage);
              if (area) {
                // 새 메모 영역과 기존 영역이 겹치는지 확인
                const newMemoLeft = newPosition.x;
                const newMemoRight = newPosition.x + newMemoWidth;
                const newMemoTop = adjustedY;
                const newMemoBottom = adjustedY + newMemoHeight;

                const areaLeft = area.x;
                const areaRight = area.x + area.width;
                const areaTop = area.y;
                const areaBottom = area.y + area.height;

                // 겹침 여유 공간 추가 (20px 간격)
                const margin = 20;
                if (!(newMemoRight + margin < areaLeft || newMemoLeft - margin > areaRight ||
                      newMemoBottom + margin < areaTop || newMemoTop - margin > areaBottom)) {
                  // 겹침 - 위로 충분히 이동
                  isOverlapping = true;
                  adjustedY -= moveStep;
                  break;
                }
              }
            }
          }
        }

        newPosition = { x: newPosition.x, y: adjustedY };
      }
    }

    const newMemo: MemoBlock = {
      id: `memo-${Date.now()}`,
      title: '',
      content: '',
      tags: [],
      connections: [],
      position: newPosition,
      displaySize: 'medium',
      blocks: [
        {
          id: `block-${Date.now()}`,
          type: 'text',
          content: ''
        }
      ]
    };

    // 먼저 state 업데이트 (즉각적인 UI 반응)
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: [...page.memos, newMemo] }
        : page
    ));

    setSelectedMemoId(newMemo.id);

    // 데이터베이스에 저장 (비동기)
    createMemo({
      pageId: currentPageId,
      title: newMemo.title,
      position: newMemo.position,
      blocks: newMemo.blocks,
    }).then(createdMemo => {
      // 서버에서 생성된 실제 ID로 업데이트
      setPages(prev => prev.map(page =>
        page.id === currentPageId
          ? {
              ...page,
              memos: page.memos.map(m =>
                m.id === newMemo.id ? { ...m, id: createdMemo.id } : m
              )
            }
          : page
      ));
      setSelectedMemoId(createdMemo.id);
    }).catch(error => {
      console.error('메모 생성 실패:', error);
      // 실패 시 롤백
      setPages(prev => prev.map(page =>
        page.id === currentPageId
          ? { ...page, memos: page.memos.filter(m => m.id !== newMemo.id) }
          : page
      ));
    });

    // 위치가 변경된 경우 캔버스를 새 위치로 자동 이동
    if (position && (newPosition.x !== originalPosition.x || newPosition.y !== originalPosition.y)) {
      // 메모의 중심점 계산 (메모 중심이 화면 중앙에 오도록)
      const memoCenterX = newPosition.x + 160; // 메모 너비의 절반
      const memoCenterY = newPosition.y + 90; // 메모 높이의 절반

      // 캔버스 크기 (윈도우 크기 기준, 좌우 패널 제외)
      const canvasWidth = window.innerWidth - (leftPanelWidth + (rightPanelOpen ? rightPanelWidth : 0));
      const canvasHeight = window.innerHeight;

      const newOffset = centerCanvasOnPosition(
        { x: memoCenterX, y: memoCenterY },
        canvasWidth,
        canvasHeight,
        canvasScale
      );

      setCanvasOffset(newOffset);
    }

    if (saveCanvasState) {
      setTimeout(() => {
        saveCanvasState('memo_create', `메모 추가: ${newMemo.id}`);
      }, 100);
    }

    return newMemo.id;
  }, [pages, currentPageId, leftPanelWidth, rightPanelOpen, rightPanelWidth, canvasScale, setPages, setSelectedMemoId, setCanvasOffset, saveCanvasState]);

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
        ? {
            ...page,
            memos: page.memos.filter(memo => memo.id !== selectedMemoId),
            // 단축 이동 목록에서도 삭제된 메모 제거
            quickNavItems: (page.quickNavItems || []).filter(item => item.targetId !== selectedMemoId)
          }
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
    // 먼저 state 업데이트 (즉각적인 UI 반응)
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        const updatedMemos = page.memos
          .filter(m => m.id !== memoId)
          .map(m => ({
            ...m,
            connections: m.connections.filter(connId => connId !== memoId)
          }));

        // Quick Nav에서도 제거 (페이지별)
        const updatedQuickNavItems = (page.quickNavItems || []).filter(item => item.targetId !== memoId);

        return {
          ...page,
          memos: updatedMemos,
          quickNavItems: updatedQuickNavItems
        };
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

    // 데이터베이스에서 삭제 (비동기)
    deleteMemo(memoId).catch(error => {
      console.error('메모 삭제 실패:', error);
    });

    if (saveCanvasState) {
      saveCanvasState('memo_delete', `메모 삭제: ${memoId}`);
    }
  }, [currentPageId, setPages, selectedMemoIds, setSelectedMemoIds, selectedMemoId, setSelectedMemoId, saveCanvasState]);

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
