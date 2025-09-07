import React, { useState } from 'react';
import { MemoBlock as MemoBlockType } from '../types';

interface MemoBlockProps {
  memo: MemoBlockType;
  isSelected: boolean;
  onClick: () => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  isConnecting?: boolean;
  connectingFromId?: string | null;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
}

const MemoBlock: React.FC<MemoBlockProps> = ({ 
  memo, 
  isSelected, 
  onClick, 
  onPositionChange,
  onSizeChange,
  isConnecting, 
  connectingFromId, 
  onStartConnection, 
  onConnectMemos 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const memoRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - memo.position.x,
        y: e.clientY - memo.position.y
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
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
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
          const newSize = { width: rect.width, height: rect.height };
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
  }, [memo.title, memo.content, memo.tags, memo.id, onSizeChange]);

  return (
    <div
      ref={memoRef}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: memo.position.x,
        top: memo.position.y,
        backgroundColor: isSelected ? '#e3f2fd' : 'white',
        border: isSelected ? '2px solid #4a90e2' : '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        minWidth: '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        userSelect: 'none',
        zIndex: 10
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        {memo.title}
      </div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        {memo.content.length > 50 ? `${memo.content.substring(0, 50)}...` : memo.content || '내용을 입력하세요...'}
      </div>
      {memo.tags.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {memo.tags.map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#4a90e2',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginRight: '5px'
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
          width: 6,
          height: 6,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#4a90e2',
          borderRadius: '50%',
          border: '1px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
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
          width: 6,
          height: 6,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#4a90e2',
          borderRadius: '50%',
          border: '1px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
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
          width: 6,
          height: 6,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#4a90e2',
          borderRadius: '50%',
          border: '1px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
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
          width: 6,
          height: 6,
          backgroundColor: isConnecting && connectingFromId === memo.id ? '#ef4444' : '#4a90e2',
          borderRadius: '50%',
          border: '1px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }} />
      </div>
    </div>
  );
};

export default MemoBlock;