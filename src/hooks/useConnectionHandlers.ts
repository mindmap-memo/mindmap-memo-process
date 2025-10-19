import { useCallback } from 'react';
import { Page, CanvasActionType } from '../types';
import { isAncestor } from '../utils/categoryHierarchyUtils';

/**
 * useConnectionHandlers
 *
 * 메모/카테고리 간 연결(connection) 관련 핸들러를 관리하는 커스텀 훅입니다.
 *
 * **관리하는 기능:**
 * - 연결 모드 토글 (disconnectMemo)
 * - 메모/카테고리 연결 (connectMemos)
 * - 연결 제거 (removeConnection)
 * - 연결 시작 (startConnection)
 * - 드래그 라인 업데이트 (updateDragLine)
 * - 연결 취소 (cancelConnection)
 *
 * @param props - pages, setPages, currentPageId, connection 상태들
 * @returns 연결 관련 핸들러 함수들
 */

interface UseConnectionHandlersProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  currentPageId: string;
  isDisconnectMode: boolean;
  setIsDisconnectMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectingFromId: React.Dispatch<React.SetStateAction<string | null>>;
  setConnectingFromDirection: React.Dispatch<React.SetStateAction<'top' | 'bottom' | 'left' | 'right' | null>>;
  setDragLineEnd: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  saveCanvasState?: (actionType: CanvasActionType, description: string) => void;
}

export const useConnectionHandlers = (props: UseConnectionHandlersProps) => {
  const {
    pages,
    setPages,
    currentPageId,
    isDisconnectMode,
    setIsDisconnectMode,
    setIsConnecting,
    setConnectingFromId,
    setConnectingFromDirection,
    setDragLineEnd,
    saveCanvasState
  } = props;

  /**
   * 연결 해제 모드 토글
   */
  const disconnectMemo = useCallback(() => {
    setIsDisconnectMode(prev => !prev);
  }, [setIsDisconnectMode]);

  /**
   * 두 메모/카테고리를 연결
   * - 메모끼리만, 카테고리끼리만 연결 가능
   * - 카테고리의 경우 부모-자식 관계가 있으면 연결 금지
   */
  const connectMemos = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    // 현재 페이지에서 아이템 타입 확인
    const currentPageData = pages.find(p => p.id === currentPageId);
    if (!currentPageData) return;

    const fromMemo = currentPageData.memos.find(m => m.id === fromId);
    const toMemo = currentPageData.memos.find(m => m.id === toId);
    const fromCategory = (currentPageData.categories || []).find(c => c.id === fromId);
    const toCategory = (currentPageData.categories || []).find(c => c.id === toId);

    // 연결 규칙: 메모끼리만, 카테고리끼리만 연결 가능
    const isValidConnection =
      (fromMemo && toMemo) || // 메모-메모 연결
      (fromCategory && toCategory); // 카테고리-카테고리 연결

    if (!isValidConnection) {
      setIsConnecting(false);
      setConnectingFromId(null);
      setConnectingFromDirection(null);
      return;
    }

    // 카테고리-카테고리 연결 시 부모-자식 관계 체크
    if (fromCategory && toCategory) {
      const categories = currentPageData.categories || [];

      // fromCategory가 toCategory의 조상인지 확인 (from이 to의 부모/조부모/...)
      const fromIsAncestorOfTo = isAncestor(fromId, toId, categories);
      // toCategory가 fromCategory의 조상인지 확인 (to가 from의 부모/조부모/...)
      const toIsAncestorOfFrom = isAncestor(toId, fromId, categories);

      // 부모-자식 관계가 있으면 연결 금지
      if (fromIsAncestorOfTo || toIsAncestorOfFrom) {
        setIsConnecting(false);
        setConnectingFromId(null);
        setConnectingFromDirection(null);
        return;
      }
    }

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo => {
              if (memo.id === fromId && fromMemo && toMemo) {
                return {
                  ...memo,
                  connections: memo.connections.includes(toId)
                    ? memo.connections
                    : [...memo.connections, toId]
                };
              }
              if (memo.id === toId && fromMemo && toMemo) {
                return {
                  ...memo,
                  connections: memo.connections.includes(fromId)
                    ? memo.connections
                    : [...memo.connections, fromId]
                };
              }
              return memo;
            }),
            categories: (page.categories || []).map(category => {
              if (category.id === fromId && fromCategory && toCategory) {
                return {
                  ...category,
                  connections: category.connections.includes(toId)
                    ? category.connections
                    : [...category.connections, toId]
                };
              }
              if (category.id === toId && fromCategory && toCategory) {
                return {
                  ...category,
                  connections: category.connections.includes(fromId)
                    ? category.connections
                    : [...category.connections, fromId]
                };
              }
              return category;
            })
          }
        : page
    ));

    setIsConnecting(false);
    setConnectingFromId(null);

    // Save canvas state for undo/redo
    if (saveCanvasState) {
      setTimeout(() => saveCanvasState('connection_add', `연결 추가: ${fromId} ↔ ${toId}`), 0);
    }
  }, [pages, currentPageId, setPages, setIsConnecting, setConnectingFromId, setConnectingFromDirection, saveCanvasState]);

  /**
   * 두 메모/카테고리 간의 연결 제거
   */
  const removeConnection = useCallback((fromId: string, toId: string) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo => ({
              ...memo,
              connections: memo.connections.filter(id =>
                !(memo.id === fromId && id === toId) &&
                !(memo.id === toId && id === fromId)
              )
            })),
            categories: (page.categories || []).map(category => ({
              ...category,
              connections: category.connections.filter(id =>
                !(category.id === fromId && id === toId) &&
                !(category.id === toId && id === fromId)
              )
            }))
          }
        : page
    ));

    // Save canvas state for undo/redo
    if (saveCanvasState) {
      setTimeout(() => saveCanvasState('connection_remove', `연결 제거: ${fromId} ↔ ${toId}`), 0);
    }
  }, [currentPageId, setPages, saveCanvasState]);

  /**
   * 연결 시작
   */
  const startConnection = useCallback((memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => {
    setIsConnecting(true);
    setConnectingFromId(memoId);
    setConnectingFromDirection(direction || null);
  }, [setIsConnecting, setConnectingFromId, setConnectingFromDirection]);

  /**
   * 드래그 라인 끝점 업데이트
   */
  const updateDragLine = useCallback((mousePos: { x: number; y: number }) => {
    setDragLineEnd(mousePos);
  }, [setDragLineEnd]);

  /**
   * 연결 취소
   */
  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromId(null);
    setConnectingFromDirection(null);
    setDragLineEnd(null);
  }, [setIsConnecting, setConnectingFromId, setConnectingFromDirection, setDragLineEnd]);

  return {
    disconnectMemo,
    connectMemos,
    removeConnection,
    startConnection,
    updateDragLine,
    cancelConnection
  };
};
