import React, { useState } from 'react';
import { MemoBlock as MemoBlockType } from '../types';

interface MemoBlockProps {
  memo: MemoBlockType;
  isSelected: boolean;
  isDragHovered?: boolean;
  onClick: (isShiftClick?: boolean) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  isConnecting?: boolean;
  connectingFromId?: string | null;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

const MemoBlock: React.FC<MemoBlockProps> = ({ 
  memo, 
  isSelected,
  isDragHovered = false,
  onClick, 
  onPositionChange,
  onSizeChange,
  isConnecting, 
  connectingFromId, 
  onStartConnection, 
  onConnectMemos,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 }
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const memoRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting) {
      setIsDragging(true);
      // 스케일된 좌표계에서 드래그 시작점 계산
      const scaledMemoX = (memo.position.x * canvasScale) + canvasOffset.x;
      const scaledMemoY = (memo.position.y * canvasScale) + canvasOffset.y;
      setDragStart({
        x: e.clientX - scaledMemoX,
        y: e.clientY - scaledMemoY
      });
      e.preventDefault();
    }
  };

  const handleConnectionPointMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Connection point mouse down!', {
      memoId: memo.id,
      isConnecting,
      connectingFromId,
      memoTitle: memo.title
    });
    
    if (!isConnecting) {
      console.log('Starting connection from:', memo.id);
      setIsConnectionDragging(true);
      onStartConnection?.(memo.id);
    }
  };

  const handleConnectionPointMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Connection point mouse up!', {
      memoId: memo.id,
      isConnecting,
      connectingFromId,
      memoTitle: memo.title
    });
    
    if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
      console.log('Connecting memos:', connectingFromId, 'to', memo.id);
      onConnectMemos?.(connectingFromId, memo.id);
    }
    setIsConnectionDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // 스케일과 오프셋을 고려한 실제 위치 계산
      const rawX = e.clientX - dragStart.x - canvasOffset.x;
      const rawY = e.clientY - dragStart.y - canvasOffset.y;
      const newPosition = {
        x: rawX / canvasScale,
        y: rawY / canvasScale
      };
      onPositionChange(memo.id, newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  React.useEffect(() => {
    if (memoRef.current && onSizeChange) {
      const updateSize = () => {
        if (memoRef.current) {
          const rect = memoRef.current.getBoundingClientRect();
          // scale을 나누어서 실제 논리적 크기 계산
          const newSize = { 
            width: rect.width / canvasScale, 
            height: rect.height / canvasScale 
          };
          if (!memo.size || memo.size.width !== newSize.width || memo.size.height !== newSize.height) {
            onSizeChange(memo.id, newSize);
          }
        }
      };
      
      updateSize();
      
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(memoRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [memo.title, memo.content, memo.tags, memo.id, onSizeChange, canvasScale]);

  return (
    <div
      ref={memoRef}
      data-memo-block="true"
      onClick={(e) => onClick(e.shiftKey)}
      onMouseDown={handleMouseDown}
      onMouseUp={(e) => {
        // 연결 모드일 때 메모 블록 전체에서 연결 처리
        if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
          e.stopPropagation();
          console.log('Connecting to memo block:', connectingFromId, 'to', memo.id);
          onConnectMemos?.(connectingFromId, memo.id);
        }
      }}
      style={{
        position: 'absolute',
        left: memo.position.x,
        top: memo.position.y,
        backgroundColor: isSelected ? '#f3f4f6' : 'white',
        border: isDragHovered ? '2px solid #3b82f6' : (isSelected ? '2px solid #8b5cf6' : '1px solid #e5e7eb'),
        borderRadius: '12px',
        padding: '16px',
        minWidth: '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        userSelect: 'none',
        zIndex: 10
      }}
    >
      <div style={{ 
        fontWeight: '600', 
        marginBottom: '8px', 
        fontSize: '16px',
        color: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📝 {memo.title}
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: '#6b7280',
        lineHeight: '1.5',
        marginBottom: '8px'
      }}>
        {memo.content.length > 50 ? `${memo.content.substring(0, 50)}...` : memo.content || '텍스트를 입력하세요...'}
      </div>
      {memo.tags.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {memo.tags.map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                marginRight: '6px',
                fontWeight: '500'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* 연결점들 */}
      <div 
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        style={{ 
          position: 'absolute', 
          top: -8, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 16, 
          height: 16, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 5
        }} 
      >
        <div style={{
          width: 8,
          height: 8,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div 
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        style={{ 
          position: 'absolute', 
          bottom: -8, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 16, 
          height: 16, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 5
        }} 
      >
        <div style={{
          width: 8,
          height: 8,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div 
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        style={{ 
          position: 'absolute', 
          left: -8, 
          top: '50%', 
          transform: 'translateY(-50%)', 
          width: 16, 
          height: 16, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 5
        }} 
      >
        <div style={{
          width: 8,
          height: 8,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div 
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        style={{ 
          position: 'absolute', 
          right: -8, 
          top: '50%', 
          transform: 'translateY(-50%)', 
          width: 16, 
          height: 16, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 5
        }} 
      >
        <div style={{
          width: 8,
          height: 8,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
    </div>
  );
};

export default MemoBlock;