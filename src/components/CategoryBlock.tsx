import React, { useState } from 'react';
import { CategoryBlock } from '../types';

interface CategoryBlockProps {
  category: CategoryBlock;
  children?: React.ReactNode; // 하위 블록들이 렌더링된 컴포넌트들
  hasChildren?: boolean; // 실제 하위 아이템 존재 여부
  isDragging?: boolean;
  isSelected?: boolean;
  isMemoBeingDragged?: boolean; // 메모가 드래그 중인지 여부
  isConnecting?: boolean;
  isDisconnectMode?: boolean;
  connectingFromId?: string | null;
  onUpdate: (category: CategoryBlock) => void;
  onDelete: (categoryId: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onClick?: (categoryId: string, isShiftClick?: boolean) => void;
  onStartConnection?: (categoryId: string) => void;
  onConnectItems?: (fromId: string, toId: string) => void;
  onRemoveConnection?: (fromId: string, toId: string) => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onMoveToCategory?: (itemId: string, categoryId: string | null) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
}

const CategoryBlockComponent: React.FC<CategoryBlockProps> = ({
  category,
  children,
  hasChildren = false,
  isDragging = false,
  isSelected = false,
  isMemoBeingDragged = false,
  isConnecting = false,
  isDisconnectMode = false,
  connectingFromId = null,
  onUpdate,
  onDelete,
  onToggleExpanded,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onClick,
  onStartConnection,
  onConnectItems,
  onRemoveConnection,
  onPositionChange,
  onSizeChange,
  onMoveToCategory,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 }
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(category.title);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // MemoBlock과 동일한 드래그 시스템 사용
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);

  // 빠른 드래그 최적화를 위한 상태
  const lastUpdateTime = React.useRef<number>(0);
  const pendingPosition = React.useRef<{ x: number; y: number } | null>(null);

  const titleRef = React.useRef<HTMLInputElement>(null);
  const categoryRef = React.useRef<HTMLDivElement>(null);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(category.title);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const handleTitleSave = () => {
    setIsEditing(false);
    if (editTitle.trim() !== category.title) {
      onUpdate({
        ...category,
        title: editTitle.trim() || 'Untitled Category'
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(category.title);
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(category.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    // MemoBlock과 동일하게 dragMoved만 체크 (isConnectionDragging 제거)
    if (!dragMoved && !isEditing) {
      onClick?.(category.id, e.shiftKey);
    }
  };


  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`카테고리 "${category.title}"를 삭제하시겠습니까? 하위 아이템들은 최상위로 이동됩니다.`)) {
      onDelete(category.id);
    }
  };

  // MemoBlock과 동일한 드래그 핸들러들
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isConnecting && !isEditing) {
      setIsDraggingPosition(true);
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (category.position.x * (canvasScale || 1) + (canvasOffset?.x || 0)),
        y: e.clientY - (category.position.y * (canvasScale || 1) + (canvasOffset?.y || 0))
      });
      e.preventDefault(); // 기본 드래그 동작 방지
    }
  };

  const handleConnectionPointMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isConnecting) {
      setIsConnectionDragging(true);
      onStartConnection?.(category.id);
    }
  };

  const handleConnectionPointMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isConnecting && connectingFromId && connectingFromId !== category.id) {
      onConnectItems?.(connectingFromId, category.id);
    }
    setIsConnectionDragging(false);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDraggingPosition && onPositionChange) {
      if (!dragMoved) {
        setDragMoved(true);
      }

      // MemoBlock과 동일한 방식으로 canvasScale과 canvasOffset 고려
      const newPosition = {
        x: (e.clientX - dragStart.x - (canvasOffset?.x || 0)) / (canvasScale || 1),
        y: (e.clientY - dragStart.y - (canvasOffset?.y || 0)) / (canvasScale || 1)
      };

      // 빠른 드래그 시 업데이트 빈도 조절 (50ms마다만 업데이트)
      const now = Date.now();
      pendingPosition.current = newPosition;

      if (now - lastUpdateTime.current >= 50) {
        onPositionChange(category.id, newPosition);
        lastUpdateTime.current = now;
      }
    }
  }, [isDraggingPosition, onPositionChange, dragMoved, dragStart, canvasOffset, canvasScale, category.id]);

  const handleMouseUp = React.useCallback(() => {
    if (isDraggingPosition && onPositionChange) {
      // 드래그가 끝날 때 최종 위치 업데이트 (대기 중인 위치가 있으면 사용)
      if (pendingPosition.current) {
        onPositionChange(category.id, pendingPosition.current);
      }

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
    }
    setIsDraggingPosition(false);
  }, [isDraggingPosition, onPositionChange, category.id]);

  React.useEffect(() => {
    if (isDraggingPosition) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPosition, handleMouseMove, handleMouseUp]);

  // ResizeObserver로 실제 크기 측정 (드래그 중에는 비활성화)
  React.useEffect(() => {
    if (!categoryRef.current || !onSizeChange) return;

    let timeoutId: NodeJS.Timeout;

    const updateSize = () => {
      // 드래그 중이거나 호버/하이라이트 중일 때는 크기 업데이트 방지
      const isCurrentlyHighlighted = isDragOver || (isMemoBeingDragged && isHovered);
      if (isDraggingPosition || isCurrentlyHighlighted) {
        return;
      }

      if (categoryRef.current) {
        const rect = categoryRef.current.getBoundingClientRect();
        // 0이거나 매우 작은 크기는 무시 (컴포넌트가 사라지는 중일 수 있음)
        if (rect.width < 10 || rect.height < 10) {
          return;
        }

        // scale을 나누어서 실제 논리적 크기 계산
        const newSize = {
          width: Math.round(rect.width / canvasScale),
          height: Math.round(rect.height / canvasScale)
        };

        // 크기 변화가 충분히 클 때만 업데이트 (5px 이상 차이)
        if (!category.size ||
            Math.abs(category.size.width - newSize.width) > 5 ||
            Math.abs(category.size.height - newSize.height) > 5) {
          // 디바운싱: 100ms 후에 업데이트
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            onSizeChange(category.id, newSize);
          }, 100);
        }
      }
    };

    // 초기 크기 설정을 위한 지연 실행
    timeoutId = setTimeout(updateSize, 50);

    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver 콜백도 디바운싱
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 100);
    });

    if (categoryRef.current) {
      resizeObserver.observe(categoryRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [category.id, category.title, category.tags, category.children, onSizeChange, canvasScale, isDraggingPosition, isMemoBeingDragged, isHovered, isDragOver]);

  // 드래그 앤 드롭 핸들러 (하위 아이템을 받기 위한 용도만)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('🎯 CategoryBlock dragOver:', category.id, category.title);
    setIsDragOver(true);
    onDragOver?.(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 드래그가 자식 요소로 이동한 경우가 아닐 때만 상태 변경
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📥 CategoryBlock drop event:', { categoryId: category.id, categoryTitle: category.title });
    setIsDragOver(false);

    // 드래그된 아이템의 ID 가져오기
    const draggedItemId = e.dataTransfer.getData('text/plain');
    console.log('🔗 Dragged item ID:', draggedItemId);

    if (draggedItemId && onMoveToCategory) {
      console.log('✅ Calling onMoveToCategory:', draggedItemId, '->', category.id);
      onMoveToCategory(draggedItemId, category.id);
    } else {
      console.log('❌ Cannot move to category:', { draggedItemId, hasOnMoveToCategory: !!onMoveToCategory });
    }

    onDrop?.(e);
  };

  // 카테고리 블록 스타일 - 보라색 테마 + 메모 드래그 시 시각적 피드백
  const isHighlighted = isDragOver || (isMemoBeingDragged && isHovered);
  const categoryStyle: React.CSSProperties = {
    width: '100%', // 부모 컨테이너에 맞춤
    minWidth: '200px',
    minHeight: '80px',
    backgroundColor: isHighlighted ? '#581c87' : (isSelected ? '#7c3aed' : '#8b5cf6'),
    border: isHighlighted ? '3px solid #4c1d95' : (isSelected ? '2px solid #6d28d9' : '1px solid #7c3aed'),
    borderRadius: '8px',
    padding: '16px',
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.3)' : (isHighlighted ? '0 6px 20px rgba(139, 92, 246, 0.6)' : '0 2px 8px rgba(0,0,0,0.1)'),
    cursor: isDraggingPosition ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.7 : (isHighlighted ? 0.8 : 1),
    transition: isDraggingPosition ? 'none' : 'all 0.1s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    zIndex: 5,
    boxSizing: 'border-box',
    transform: isHighlighted ? 'scale(1.3)' : 'scale(1)'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: category.isExpanded && children ? '12px' : '0',
    minHeight: '24px',
    width: '100%', // 전체 너비 사용
    overflow: 'hidden' // 내용이 넘치면 숨김
  };

  const expandButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    marginRight: '8px',
    fontSize: '14px',
    color: 'white',
    display: hasChildren ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center'
  };


  const titleStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: 'transparent',
    border: isEditing ? '1px solid #1976d2' : 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    outline: 'none',
    minWidth: 0, // flex 아이템이 축소될 수 있도록
    maxWidth: '100%', // 부모 컨테이너를 넘지 않도록
    boxSizing: 'border-box' // 패딩 포함한 전체 크기 계산
  };

  const controlsStyle: React.CSSProperties = {
    display: isHovered ? 'flex' : 'none',
    alignItems: 'center',
    marginLeft: '8px'
  };

  const deleteButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '14px',
    color: '#f44336',
    borderRadius: '4px'
  };

  const childrenContainerStyle: React.CSSProperties = {
    marginLeft: '16px',
    paddingLeft: '12px',
    borderLeft: '2px solid #e0e0e0',
    display: category.isExpanded ? 'block' : 'none'
  };

  const tagsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: category.tags.length > 0 ? '8px' : '0'
  };

  const tagStyle: React.CSSProperties = {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500
  };

  return (
    <div style={{
      position: 'absolute',
      left: category.position.x,
      top: category.position.y,
      width: category.size?.width ? `${category.size.width}px` : 'auto',
      height: 'auto'
    }}>
      {/* 카테고리 블록 콘텐츠 */}
      <div
        ref={categoryRef}
        data-category-block="true"
        draggable={false}
        style={categoryStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={(e) => {
          // 연결 모드일 때 카테고리 블록 전체에서 연결 처리
          if (isConnecting && connectingFromId && connectingFromId !== category.id) {
            e.stopPropagation();
            onConnectItems?.(connectingFromId, category.id);
          }
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          console.log('🖱️ CategoryBlock mouse enter:', category.id, category.title);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          console.log('🖱️ CategoryBlock mouse leave:', category.id, category.title);
        }}
      >
      <div style={headerStyle}>
        <button
          style={expandButtonStyle}
          onClick={handleExpandToggle}
          title={category.isExpanded ? '접기' : '펼치기'}
        >
          {category.isExpanded ? '▼' : '▶'}
        </button>


        {isEditing ? (
          <input
            ref={titleRef}
            style={titleStyle}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            placeholder="카테고리 이름..."
          />
        ) : (
          <div
            style={titleStyle}
            onClick={handleTitleClick}
            title="클릭하여 편집"
          >
            {category.title}
          </div>
        )}

        <div style={controlsStyle}>
          <button
            style={deleteButtonStyle}
            onClick={handleDelete}
            title="카테고리 삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 태그 표시 */}
      {category.tags.length > 0 && (
        <div style={tagsStyle}>
          {category.tags.map((tag, index) => (
            <span key={index} style={tagStyle}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 하위 블록들 */}
      {category.isExpanded && children && (
        <div style={childrenContainerStyle}>
          {children}
        </div>
      )}

      {/* MemoBlock과 동일한 4면 연결점들 */}
      <div
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>

      {/* 드롭 존 표시 */}
      {category.isExpanded && (
        <div
          style={{
            minHeight: '20px',
            textAlign: 'center',
            color: 'white',
            fontSize: '12px',
            padding: '8px',
            border: '1px dashed white',
            borderRadius: '4px',
            marginTop: '12px'
          }}
        >
          여기에 메모나 카테고리를 드래그하세요
        </div>
      )}
      </div>
    </div>
  );
};

export default CategoryBlockComponent;