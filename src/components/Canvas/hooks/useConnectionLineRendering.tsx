import React from 'react';
import { Trash2 } from 'lucide-react';
import { Page } from '../../../types';
import { isInsideCollapsedCategory } from '../../../utils/categoryHierarchyUtils';

/**
 * useConnectionLineRendering
 *
 * 연결선 렌더링 로직을 담당하는 훅
 *
 * **주요 기능:**
 * - 메모-메모 연결선 렌더링
 * - 메모-카테고리 연결선 렌더링
 * - 카테고리-카테고리 연결선 렌더링
 * - 드래그 중인 연결선 렌더링
 *
 * @param params - 연결선 렌더링에 필요한 매개변수
 * @returns 연결선 렌더링 함수
 */

interface UseConnectionLineRenderingParams {
  currentPage: Page | undefined;
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  connectingFromDirection: 'top' | 'bottom' | 'left' | 'right' | null;
  dragLineEnd: { x: number; y: number } | null;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  getConnectionPoints: (block: any) => any;
  canvasScale: number;
}

export const useConnectionLineRendering = (params: UseConnectionLineRenderingParams) => {
  const {
    currentPage,
    isConnecting,
    isDisconnectMode,
    connectingFromId,
    connectingFromDirection,
    dragLineEnd,
    onRemoveConnection,
    onConnectMemos,
    getConnectionPoints,
    canvasScale
  } = params;

  /**
   * 연결선 렌더링
   * 메모-메모, 메모-카테고리, 카테고리-카테고리 연결선을 모두 렌더링합니다.
   * 드래그 중인 연결선도 포함됩니다.
   */
  const renderConnectionLines = React.useCallback(() => {
    if (!currentPage) return null;

    const lines: any[] = [];

    // 기존 연결선들 (메모-메모)
    currentPage.memos.forEach(memo => {
      memo.connections.forEach(connId => {
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        const connectedCategory = currentPage.categories?.find(c => c.id === connId);

        // 메모-메모 연결만 여기서 처리 (메모-카테고리는 카테고리 섹션에서 처리)
        if (!connectedMemo || memo.id >= connId) return;

        // 메모가 접힌 카테고리 안에 있으면 연결선 숨기기
        if (isInsideCollapsedCategory(memo.id, currentPage) ||
            isInsideCollapsedCategory(connectedMemo.id, currentPage)) {
          return;
        }

        // 최신 크기 정보로 연결점 계산 (DOM 기반)
        const fromPoints = getConnectionPoints(memo);
        const toPoints = getConnectionPoints(connectedMemo);

        // 중심점 계산 (연결점으로부터 계산)
        const centerFrom = {
          x: (fromPoints.left.x + fromPoints.right.x) / 2,
          y: (fromPoints.top.y + fromPoints.bottom.y) / 2
        };
        const centerTo = {
          x: (toPoints.left.x + toPoints.right.x) / 2,
          y: (toPoints.top.y + toPoints.bottom.y) / 2
        };

        const dx = centerTo.x - centerFrom.x;
        const dy = centerTo.y - centerFrom.y;

        let fromPoint, toPoint;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromPoint = fromPoints.right;
            toPoint = toPoints.left;
          } else {
            fromPoint = fromPoints.left;
            toPoint = toPoints.right;
          }
        } else {
          if (dy > 0) {
            fromPoint = fromPoints.bottom;
            toPoint = toPoints.top;
          } else {
            fromPoint = fromPoints.top;
            toPoint = toPoints.bottom;
          }
        }

        // 연결선 중간 지점 계산
        const midX = (fromPoint.x + toPoint.x) / 2;
        const midY = (fromPoint.y + toPoint.y) / 2;

        // 모바일 연결 모드 또는 PC 연결 해제 모드에서 삭제 UI 표시
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        const showDeleteUI = isDisconnectMode || (isMobile && isConnecting);

        lines.push(
          <g key={`${memo.id}-${connId}`}>
            {/* 투명한 넓은 클릭 영역 */}
            {showDeleteUI && (
              <line
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveConnection(memo.id, connId);
                }}
              />
            )}
            {/* 실제 보이는 연결선 - 모든 연결선 보라색 통일 */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={showDeleteUI ? "#ef4444" : "#a855f7"}
              strokeWidth={showDeleteUI ? "4" : "2"}
              style={{
                strokeDasharray: showDeleteUI ? '5,5' : '8,4',
                pointerEvents: 'none'
              }}
            />
            {/* Disconnect 모드 또는 모바일 연결 모드일 때 삭제 버튼 표시 */}
            {showDeleteUI && (
              <g transform={`translate(${midX}, ${midY})`}>
                {/* 배경 원 */}
                <circle
                  r={20 / Math.sqrt(canvasScale)}
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth={3 / Math.sqrt(canvasScale)}
                  style={{
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveConnection(memo.id, connId);
                  }}
                />
                {/* 쓰레기통 아이콘 */}
                <foreignObject
                  x={-12 / Math.sqrt(canvasScale)}
                  y={-12 / Math.sqrt(canvasScale)}
                  width={24 / Math.sqrt(canvasScale)}
                  height={24 / Math.sqrt(canvasScale)}
                  style={{ pointerEvents: 'none' }}
                >
                  <Trash2 size={24 / Math.sqrt(canvasScale)} color="white" />
                </foreignObject>
              </g>
            )}
          </g>
        );
      });
    });

    // 카테고리 연결선들 (카테고리끼리 & 메모-카테고리)
    (currentPage.categories || []).forEach(category => {
      category.connections.forEach(connId => {
        // 연결된 대상이 카테고리인지 메모인지 확인
        const connectedCategory = currentPage.categories?.find(c => c.id === connId);
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        const connected = connectedCategory || connectedMemo;

        if (!connected) return; // 연결 대상이 없으면 무시
        if (category.id >= connId) return; // 중복 연결선 방지 (같은 연결을 두 번 그리지 않음)

        // 카테고리나 연결 대상이 접힌 카테고리 안에 있으면 연결선 숨기기
        if (isInsideCollapsedCategory(category.id, currentPage) ||
            isInsideCollapsedCategory(connId, currentPage)) {
          return;
        }

        // getConnectionPoints 사용 (영역이 있으면 영역 기준으로 계산됨)
        const fromPoints = getConnectionPoints(category);
        const toPoints = getConnectionPoints(connected);

        // 최적 연결점 선택을 위한 중심점 계산
        // fromPoints와 toPoints가 이미 영역을 고려하므로, 이를 기반으로 중심 계산
        const centerFrom = {
          x: (fromPoints.left.x + fromPoints.right.x) / 2,
          y: (fromPoints.top.y + fromPoints.bottom.y) / 2
        };
        const centerTo = {
          x: (toPoints.left.x + toPoints.right.x) / 2,
          y: (toPoints.top.y + toPoints.bottom.y) / 2
        };

        const dx = centerTo.x - centerFrom.x;
        const dy = centerTo.y - centerFrom.y;

        let fromPoint, toPoint;

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromPoint = fromPoints.right;
            toPoint = toPoints.left;
          } else {
            fromPoint = fromPoints.left;
            toPoint = toPoints.right;
          }
        } else {
          if (dy > 0) {
            fromPoint = fromPoints.bottom;
            toPoint = toPoints.top;
          } else {
            fromPoint = fromPoints.top;
            toPoint = toPoints.bottom;
          }
        }

        // 연결선 중간 지점 계산
        const midX = (fromPoint.x + toPoint.x) / 2;
        const midY = (fromPoint.y + toPoint.y) / 2;

        // 모바일 연결 모드 또는 PC 연결 해제 모드에서 삭제 UI 표시
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        const showDeleteUI = isDisconnectMode || (isMobile && isConnecting);

        lines.push(
          <g key={`category-${category.id}-${connId}`}>
            {/* 투명한 넓은 클릭 영역 */}
            {showDeleteUI && (
              <line
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveConnection(category.id, connId);
                }}
              />
            )}
            {/* 실제 보이는 연결선 - 모든 연결선 보라색 통일 */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={showDeleteUI ? "#ef4444" : "#a855f7"}
              strokeWidth={showDeleteUI ? "4" : "2"}
              style={{
                strokeDasharray: showDeleteUI ? '5,5' : '8,4',
                pointerEvents: 'none'
              }}
            />
            {/* Disconnect 모드 또는 모바일 연결 모드일 때 삭제 버튼 표시 */}
            {showDeleteUI && (
              <g transform={`translate(${midX}, ${midY})`}>
                {/* 배경 원 */}
                <circle
                  r={20 / Math.sqrt(canvasScale)}
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth={3 / Math.sqrt(canvasScale)}
                  style={{
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveConnection(category.id, connId);
                  }}
                />
                {/* 쓰레기통 아이콘 */}
                <foreignObject
                  x={-12 / Math.sqrt(canvasScale)}
                  y={-12 / Math.sqrt(canvasScale)}
                  width={24 / Math.sqrt(canvasScale)}
                  height={24 / Math.sqrt(canvasScale)}
                  style={{ pointerEvents: 'none' }}
                >
                  <Trash2 size={24 / Math.sqrt(canvasScale)} color="white" />
                </foreignObject>
              </g>
            )}
          </g>
        );
      });
    });

    // 드래그 중인 라인 추가
    if (isConnecting && connectingFromId && dragLineEnd) {
      const connectingMemo = currentPage.memos.find(m => m.id === connectingFromId);
      const connectingCategory = (currentPage.categories || []).find(c => c.id === connectingFromId);

      let fromPoint;

      if (connectingMemo) {
        const fromPoints = getConnectionPoints(connectingMemo);

        // direction이 지정된 경우 해당 방향 사용, 아니면 자동 계산
        if (connectingFromDirection) {
          fromPoint = fromPoints[connectingFromDirection];
        } else {
          // 중심점 계산 (연결점으로부터 계산)
          const centerFrom = {
            x: (fromPoints.left.x + fromPoints.right.x) / 2,
            y: (fromPoints.top.y + fromPoints.bottom.y) / 2
          };

          const dx = dragLineEnd.x - centerFrom.x;
          const dy = dragLineEnd.y - centerFrom.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
          } else {
            fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
          }
        }
      } else if (connectingCategory) {
        // getConnectionPoints를 사용하여 영역 정보를 고려
        const fromPoints = getConnectionPoints(connectingCategory);

        // direction이 지정된 경우 해당 방향 사용, 아니면 자동 계산
        if (connectingFromDirection) {
          fromPoint = fromPoints[connectingFromDirection];
        } else {
          // 카테고리 중심점 계산
          const centerFrom = {
            x: (fromPoints.left.x + fromPoints.right.x) / 2,
            y: (fromPoints.top.y + fromPoints.bottom.y) / 2
          };

          const dx = dragLineEnd.x - centerFrom.x;
          const dy = dragLineEnd.y - centerFrom.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
          } else {
            fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
          }
        }
      }

      if (fromPoint) {

        const dragLine = (
          <line
            key="drag-line"
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={dragLineEnd.x}
            y2={dragLineEnd.y}
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="6,4"
            style={{
              animation: 'dash 1s linear infinite'
            }}
          />
        );
        lines.push(dragLine);
      }
    }

    return lines;
  }, [
    currentPage,
    isDisconnectMode,
    isConnecting,
    connectingFromId,
    connectingFromDirection,
    dragLineEnd,
    getConnectionPoints,
    onRemoveConnection,
    onConnectMemos,
    canvasScale
  ]);

  return {
    renderConnectionLines
  };
};
