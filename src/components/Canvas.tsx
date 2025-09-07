import React from 'react';
import { Page } from '../types';
import MemoBlock from './MemoBlock';

interface CanvasProps {
  currentPage: Page | undefined;
  selectedMemoId: string | null;
  onMemoSelect: (memoId: string) => void;
  onAddMemo: () => void;
  onDeleteMemo: () => void;
  onDisconnectMemo: () => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  dragLineEnd: { x: number; y: number } | null;
  onStartConnection: (memoId: string) => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCancelConnection: () => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onUpdateDragLine: (mousePos: { x: number; y: number }) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  currentPage,
  selectedMemoId,
  onMemoSelect,
  onAddMemo,
  onDeleteMemo,
  onDisconnectMemo,
  onMemoPositionChange,
  onMemoSizeChange,
  isConnecting,
  isDisconnectMode,
  connectingFromId,
  dragLineEnd,
  onStartConnection,
  onConnectMemos,
  onCancelConnection,
  onRemoveConnection,
  onUpdateDragLine
}) => {
  const getConnectionPoints = (memo: any) => {
    const width = memo.size?.width || 200;
    const height = memo.size?.height || 95;
    
    return {
      top: { x: memo.position.x + width / 2, y: memo.position.y },
      bottom: { x: memo.position.x + width / 2, y: memo.position.y + height },
      left: { x: memo.position.x, y: memo.position.y + height / 2 },
      right: { x: memo.position.x + width, y: memo.position.y + height / 2 }
    };
  };

  const renderConnectionLines = () => {
    if (!currentPage) return null;
    
    const lines: JSX.Element[] = [];
    
    // 기존 연결선들
    currentPage.memos.forEach(memo => {
      memo.connections.forEach(connId => {
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        if (!connectedMemo || memo.id >= connId) return;
        
        const fromPoints = getConnectionPoints(memo);
        const toPoints = getConnectionPoints(connectedMemo);
        
        const fromWidth = memo.size?.width || 200;
        const fromHeight = memo.size?.height || 95;
        const toWidth = connectedMemo.size?.width || 200;
        const toHeight = connectedMemo.size?.height || 95;
        
        const centerFrom = { x: memo.position.x + fromWidth / 2, y: memo.position.y + fromHeight / 2 };
        const centerTo = { x: connectedMemo.position.x + toWidth / 2, y: connectedMemo.position.y + toHeight / 2 };
        
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
        
        lines.push(
          <line
            key={`${memo.id}-${connId}`}
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={toPoint.x}
            y2={toPoint.y}
            stroke={isDisconnectMode ? "#ef4444" : "#4a90e2"}
            strokeWidth="2"
            style={{ 
              cursor: isDisconnectMode ? 'pointer' : 'default',
              strokeDasharray: isDisconnectMode ? '5,5' : 'none'
            }}
            onClick={() => isDisconnectMode && onRemoveConnection(memo.id, connId)}
          />
        );
      });
    });

    // 드래그 중인 라인 추가
    if (isConnecting && connectingFromId && dragLineEnd) {
      const connectingMemo = currentPage.memos.find(m => m.id === connectingFromId);
      if (connectingMemo) {
        const fromPoints = getConnectionPoints(connectingMemo);
        
        const connectingWidth = connectingMemo.size?.width || 200;
        const connectingHeight = connectingMemo.size?.height || 95;
        
        const centerFrom = { x: connectingMemo.position.x + connectingWidth / 2, y: connectingMemo.position.y + connectingHeight / 2 };
        const dx = dragLineEnd.x - centerFrom.x;
        const dy = dragLineEnd.y - centerFrom.y;
        
        let fromPoint;
        if (Math.abs(dx) > Math.abs(dy)) {
          fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
        } else {
          fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
        }
        
        const dragLine = (
          <line
            key="drag-line"
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={dragLineEnd.x}
            y2={dragLineEnd.y}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="8,4"
            style={{
              animation: 'dash 1s linear infinite'
            }}
          />
        );
        lines.push(dragLine);
      }
    }

    return lines;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isConnecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      onUpdateDragLine({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div 
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={(e) => {
        if (isConnecting && e.target === e.currentTarget) {
          onCancelConnection();
        }
      }}
      onMouseMove={handleMouseMove}
    >
      {/* SVG로 연결선 그리기 */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isDisconnectMode ? 'auto' : 'none',
          zIndex: 0
        }}
      >
        <defs>
          <style>
            {`
              @keyframes dash {
                to {
                  stroke-dashoffset: -24;
                }
              }
            `}
          </style>
        </defs>
        {renderConnectionLines()}
      </svg>

      {/* 메모 블록들 */}
      {currentPage?.memos.map(memo => (
        <MemoBlock
          key={memo.id}
          memo={memo}
          isSelected={selectedMemoId === memo.id}
          onClick={() => onMemoSelect(memo.id)}
          onPositionChange={onMemoPositionChange}
          onSizeChange={onMemoSizeChange}
          isConnecting={isConnecting}
          connectingFromId={connectingFromId}
          onStartConnection={onStartConnection}
          onConnectMemos={onConnectMemos}
        />
      ))}

      {/* 하단 버튼들 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9'
      }}>
        <button
          onClick={onAddMemo}
          style={{
            backgroundColor: 'white',
            color: '#333',
            border: '1px solid #d1d5db',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          블록 추가
        </button>
        <button
          onClick={onDisconnectMemo}
          style={{
            backgroundColor: isDisconnectMode ? '#fee2e2' : 'white',
            color: isDisconnectMode ? '#dc2626' : '#333',
            border: `1px solid ${isDisconnectMode ? '#fca5a5' : '#d1d5db'}`,
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!isDisconnectMode) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }
          }}
          onMouseOut={(e) => {
            if (!isDisconnectMode) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
        >
          {isDisconnectMode ? '연결 해제 모드' : '연결 해제'}
        </button>
        <button
          onClick={onDeleteMemo}
          disabled={!selectedMemoId}
          style={{
            backgroundColor: 'white',
            color: selectedMemoId ? '#dc2626' : '#9ca3af',
            border: '1px solid #d1d5db',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: selectedMemoId ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (selectedMemoId) {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
};

export default Canvas;