import React, { useState } from 'react';
import { MemoBlock as MemoBlockType, MemoDisplaySize } from '../types';

interface MemoBlockProps {
  memo: MemoBlockType;
  isSelected: boolean;
  isDragHovered?: boolean;
  onClick: (isShiftClick?: boolean) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onDisplaySizeChange?: (id: string, size: MemoDisplaySize) => void;
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
  onDisplaySizeChange,
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
  const [dragMoved, setDragMoved] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const memoRef = React.useRef<HTMLDivElement>(null);

  // 크기별 스타일 정의
  const getSizeConfig = (size: MemoDisplaySize) => {
    switch (size) {
      case 'small':
        return {
          width: 180,
          maxHeight: 120,
          showContent: false,
          showTags: true,
          contentLength: 0
        };
      case 'medium':
        return {
          width: 300,
          maxHeight: 200,
          showContent: true,
          showTags: true,
          contentLength: 500
        };
      case 'large':
        return {
          width: 400,
          maxHeight: 300,
          showContent: true,
          showTags: true,
          contentLength: 1000
        };
      default:
        return {
          width: 200,
          maxHeight: 150,
          showContent: true,
          showTags: true,
          contentLength: 50
        };
    }
  };

  const sizeConfig = getSizeConfig(memo.displaySize || 'small');

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    setIsScrolling(true);
    
    // 기존 타이머가 있다면 클리어
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // 1초 후 스크롤 상태를 false로 변경
    const newTimeout = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
    
    setScrollTimeout(newTimeout);
  };

  // 커스텀 스크롤바 스타일 추가
  React.useEffect(() => {
    const shouldShowScrollbar = isScrolling || isHovering;
    const style = document.createElement('style');
    style.textContent = `
      .memo-block-container {
        scrollbar-width: thin;
        scrollbar-color: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3) transparent' : 'transparent transparent'};
        transition: scrollbar-color 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar {
        width: 6px;
      }
      
      .memo-block-container::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb {
        background: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3)' : 'transparent'};
        border-radius: 3px;
        transition: background 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }
    `;
    
    const existingStyle = document.querySelector('#memo-block-scrollbar-styles');
    if (existingStyle) {
      existingStyle.textContent = style.textContent;
    } else {
      style.id = 'memo-block-scrollbar-styles';
      document.head.appendChild(style);
    }
  }, [isScrolling, isHovering]);

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting) {
      setIsDragging(true);
      setDragMoved(false);
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
      if (!dragMoved) {
        setDragMoved(true);
      }
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
    <div style={{
      position: 'absolute',
      left: memo.position.x,
      top: memo.position.y,
      width: `${sizeConfig.width}px`,
      height: 'auto'
    }}>
      {/* 메모 블록 콘텐츠 */}
      <div
        ref={memoRef}
        className="memo-block-container"
        data-memo-block="true"
        onClick={(e) => {
          // 드래그로 이동했다면 클릭 이벤트를 무시
          if (!dragMoved) {
            onClick(e.shiftKey);
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={(e) => {
          // 연결 모드일 때 메모 블록 전체에서 연결 처리
          if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
            e.stopPropagation();
            console.log('Connecting to memo block:', connectingFromId, 'to', memo.id);
            onConnectMemos?.(connectingFromId, memo.id);
          }
        }}
        onScroll={handleScroll}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          backgroundColor: isSelected ? '#f3f4f6' : 'white',
          border: isDragHovered ? '2px solid #3b82f6' : (isSelected ? '2px solid #8b5cf6' : '1px solid #e5e7eb'),
          borderRadius: '12px',
          padding: '16px',
          width: `${sizeConfig.width}px`,
          maxHeight: `${sizeConfig.maxHeight}px`,
          overflowY: 'auto',
          overflowX: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          userSelect: 'none',
          zIndex: 10
        }}
      >
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '16px',
            color: memo.title ? '#1f2937' : '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1
          }}>
            📝 {memo.title || '제목을 입력해주세요'}
          </div>
          {isSelected && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['small', 'medium', 'large'] as MemoDisplaySize[]).map((size) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisplaySizeChange?.(memo.id, size);
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: memo.displaySize === size ? '#3b82f6' : '#f3f4f6',
                    color: memo.displaySize === size ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          )}
        </div>
        {sizeConfig.showTags && memo.tags.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
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
        {sizeConfig.showContent && (
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            {(() => {
              if (!memo.blocks || memo.blocks.length === 0) {
                return memo.content || '텍스트를 입력하세요...';
              }

              let totalContentLength = 0;
              const renderedBlocks: React.ReactNode[] = [];

              for (const block of memo.blocks) {
                if (totalContentLength >= sizeConfig.contentLength) {
                  renderedBlocks.push(<span key="more">...</span>);
                  break;
                }

                if (block.type === 'text') {
                  const content = block.content || '';
                  if (content.trim() === '') {
                    // 빈 텍스트 블록 - 줄바꿈으로 표시
                    renderedBlocks.push(<br key={block.id} />);
                  } else {
                    const remainingLength = sizeConfig.contentLength - totalContentLength;
                    const displayContent = content.length > remainingLength 
                      ? content.substring(0, remainingLength) + '...'
                      : content;
                    
                    renderedBlocks.push(
                      <div key={block.id} style={{ 
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {displayContent}
                      </div>
                    );
                    totalContentLength += content.length;
                  }
                } else if (block.type === 'image') {
                  const imageBlock = block as any;
                  if (imageBlock.url) {
                    renderedBlocks.push(
                      <div key={block.id} style={{ margin: '4px 0' }}>
                        <img 
                          src={imageBlock.url} 
                          alt={imageBlock.alt || '이미지'}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '60px',
                            borderRadius: '4px',
                            objectFit: 'cover'
                          }}
                        />
                        {imageBlock.caption && (
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            {imageBlock.caption}
                          </div>
                        )}
                      </div>
                    );
                    totalContentLength += 50; // 이미지는 대략 50글자로 계산
                  }
                } else if (block.type === 'callout') {
                  const calloutBlock = block as any;
                  renderedBlocks.push(
                    <div key={block.id} style={{ 
                      backgroundColor: '#f3f4f6', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      margin: '2px 0',
                      fontSize: '12px'
                    }}>
                      {calloutBlock.emoji && <span>{calloutBlock.emoji} </span>}
                      {calloutBlock.content}
                    </div>
                  );
                  totalContentLength += calloutBlock.content?.length || 0;
                }
              }

              return renderedBlocks.length > 0 ? renderedBlocks : '텍스트를 입력하세요...';
            })()}
          </div>
        )}
      </div>
      
      {/* 연결점들 - 메모 블록 외부에 배치 */}
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
          zIndex: 15
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
          zIndex: 15
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
          zIndex: 15
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
          zIndex: 15
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