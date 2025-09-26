import React, { useState } from 'react';
import { CategoryBlock } from '../types';

interface CategoryBlockProps {
  category: CategoryBlock;
  children?: React.ReactNode; // 하위 블록들이 렌더링된 컴포넌트들
  isDragging?: boolean;
  isSelected?: boolean;
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
  onClick?: (categoryId: string) => void;
  onStartConnection?: (categoryId: string) => void;
  onConnectItems?: (fromId: string, toId: string) => void;
  onRemoveConnection?: (fromId: string, toId: string) => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  canvasScale?: number;
}

const CategoryBlockComponent: React.FC<CategoryBlockProps> = ({
  category,
  children,
  isDragging = false,
  isSelected = false,
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
  canvasScale = 1
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(category.title);
  const [isHovered, setIsHovered] = useState(false);

  // MemoBlock과 동일한 드래그 시스템 사용
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
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
      onClick?.(category.id);
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
    if (e.button === 0 && !isConnecting) {
      setIsDraggingPosition(true);
      setDragMoved(false);
      setDragStart({
        x: e.clientX - category.position.x,
        y: e.clientY - category.position.y
      });
      e.preventDefault(); // 이제 draggable이 제거되어서 안전
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

  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingPosition && onPositionChange) {
      if (!dragMoved) {
        setDragMoved(true);
      }
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      onPositionChange(category.id, newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPosition(false);
  };

  React.useEffect(() => {
    if (isDraggingPosition) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPosition, dragStart]);

  // ResizeObserver로 실제 크기 측정
  React.useEffect(() => {
    if (!categoryRef.current || !onSizeChange) return;

    const resizeObserver = new ResizeObserver(() => {
      if (categoryRef.current) {
        const rect = categoryRef.current.getBoundingClientRect();
        // scale을 나누어서 실제 논리적 크기 계산
        const newSize = {
          width: rect.width / canvasScale,
          height: rect.height / canvasScale
        };
        if (!category.size || category.size.width !== newSize.width || category.size.height !== newSize.height) {
          onSizeChange(category.id, newSize);
        }
      }
    });

    resizeObserver.observe(categoryRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [category.id, category.size, onSizeChange, canvasScale]);

  // 드래그 앤 드롭 핸들러 (하위 아이템을 받기 위한 용도만)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e);
  };

  // MemoBlock과 동일한 스타일 구조 - 주황색 테마
  const categoryStyle: React.CSSProperties = {
    minWidth: '200px',
    minHeight: '80px',
    backgroundColor: isSelected ? '#fff3e0' : '#ffe0b2',
    border: isSelected ? '2px solid #ff9800' : '1px solid #ffb74d',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
    cursor: isDraggingPosition ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.7 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    zIndex: 1
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: category.isExpanded && children ? '12px' : '0',
    minHeight: '24px'
  };

  const expandButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    marginRight: '8px',
    fontSize: '14px',
    color: '#666',
    display: category.children.length > 0 ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const folderIconStyle: React.CSSProperties = {
    marginRight: '8px',
    fontSize: '18px',
    color: '#ff9800'
  };

  const titleStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    backgroundColor: 'transparent',
    border: isEditing ? '1px solid #1976d2' : 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    outline: 'none'
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
      width: 'auto',
      height: 'auto'
    }}>
      {/* 카테고리 블록 콘텐츠 */}
      <div
        ref={categoryRef}
        data-category-block="true"
        style={categoryStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <div style={headerStyle}>
        <button
          style={expandButtonStyle}
          onClick={handleExpandToggle}
          title={category.isExpanded ? '접기' : '펼치기'}
        >
          {category.isExpanded ? '▼' : '▶'}
        </button>

        <span style={folderIconStyle}>📁</span>

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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#ff9800',
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#ff9800',
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#ff9800',
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
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#ff9800',
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
            color: '#999',
            fontSize: '12px',
            padding: '8px',
            border: '1px dashed #ccc',
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