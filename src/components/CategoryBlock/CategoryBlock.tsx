import React from 'react';
import { CategoryBlock } from '../../types';
import ContextMenu from '../ContextMenu';
import QuickNavModal from '../QuickNavModal';
import { useCategoryBlockState } from './hooks/useCategoryBlockState';
import { useCategoryTitleHandlers } from './hooks/useCategoryTitleHandlers';
import { useCategoryDragHandlers } from './hooks/useCategoryDragHandlers';
import { useCategoryConnectionHandlers } from './hooks/useCategoryConnectionHandlers';
import { useCategoryContextMenu } from './hooks/useCategoryContextMenu';
import { useCategoryDropHandlers } from './hooks/useCategoryDropHandlers';
import { useCategoryResizeObserver } from './hooks/useCategoryResizeObserver';
import { useCategoryDragEffects } from './hooks/useCategoryDragEffects';

interface CategoryBlockProps {
  category: CategoryBlock;
  children?: React.ReactNode;
  hasChildren?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  isMemoBeingDragged?: boolean;
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
  onPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onMoveToCategory?: (itemId: string, categoryId: string | null) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  isDragTarget?: boolean;
  isCategoryBeingDragged?: boolean;
  isShiftPressed?: boolean;
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
  onPositionDragEnd,
  onSizeChange,
  onMoveToCategory,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 },
  onAddQuickNav,
  isQuickNavExists,
  isDragTarget = false,
  isCategoryBeingDragged = false,
  isShiftPressed = false
}) => {
  // 상태 관리
  const {
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    isHovered,
    setIsHovered,
    isDragOver,
    setIsDragOver,
    contextMenu,
    setContextMenu,
    showQuickNavModal,
    setShowQuickNavModal,
    isDraggingPosition,
    setIsDraggingPosition,
    isConnectionDragging,
    setIsConnectionDragging,
    dragStart,
    setDragStart,
    mouseDownPos,
    setMouseDownPos,
    dragMoved,
    setDragMoved,
    lastUpdateTime,
    pendingPosition,
    isDraggingRef,
    titleRef,
    categoryRef
  } = useCategoryBlockState(category);

  // 제목 편집 핸들러
  const { handleTitleClick, handleTitleSave, handleTitleKeyDown } = useCategoryTitleHandlers({
    category,
    isEditing,
    editTitle,
    setIsEditing,
    setEditTitle,
    titleRef,
    onUpdate
  });

  // 드래그 핸들러
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleClick } = useCategoryDragHandlers({
    category,
    isEditing,
    isConnecting,
    mouseDownPos,
    isDraggingRef,
    dragStart,
    dragMoved,
    canvasScale,
    canvasOffset,
    pendingPosition,
    lastUpdateTime,
    setMouseDownPos,
    setDragMoved,
    setDragStart,
    setIsDraggingPosition,
    onClick,
    onDragStart,
    onDragEnd,
    onPositionChange,
    onPositionDragEnd
  });

  // 연결 핸들러
  const { handleConnectionPointMouseDown, handleConnectionPointMouseUp } = useCategoryConnectionHandlers({
    categoryId: category.id,
    isConnecting,
    connectingFromId,
    setIsConnectionDragging,
    onStartConnection,
    onConnectItems
  });

  // 컨텍스트 메뉴 핸들러
  const { handleContextMenu, handleAddQuickNav, handleQuickNavConfirm } = useCategoryContextMenu({
    categoryId: category.id,
    contextMenu,
    setContextMenu,
    setShowQuickNavModal,
    onDelete,
    onAddQuickNav,
    isQuickNavExists
  });

  // 드롭 핸들러
  const { handleDragOver, handleDragLeave, handleDrop } = useCategoryDropHandlers({
    categoryId: category.id,
    setIsDragOver,
    onDragOver,
    onDrop,
    onMoveToCategory
  });

  // ResizeObserver 효과
  useCategoryResizeObserver({
    category,
    categoryRef,
    isDraggingPosition,
    isCategoryBeingDragged,
    isMemoBeingDragged,
    isHovered,
    isDragOver,
    canvasScale,
    onSizeChange
  });

  // 드래그 이벤트 효과
  useCategoryDragEffects({
    mouseDownPos,
    isDraggingPosition,
    handleMouseMove,
    handleMouseUp
  });

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded(category.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    if (window.confirm(`카테고리 "${category.title}"를 삭제하시겠습니까? 하위 아이템들은 최상위로 이동됩니다.`)) {
      onDelete(category.id);
    }
  };

  // 카테고리 블록 스타일 - 하위 아이템이 있으면 태그 스타일로 표시
  const isHighlighted = isDragOver || (isMemoBeingDragged && isHovered) || (isCategoryBeingDragged && isHovered);
  const isTagMode = hasChildren && !isHighlighted;

  // Shift+드래그 스타일 적용
  const isShiftDragging = isDraggingPosition && isShiftPressed;

  const categoryStyle: React.CSSProperties = {
    width: isTagMode ? 'auto' : '100%',
    minWidth: isTagMode ? '80px' : '200px',
    minHeight: isTagMode ? '32px' : '80px',
    backgroundColor: isShiftDragging ? '#10b981' : (isHighlighted ? '#581c87' : (isSelected ? '#7c3aed' : '#8b5cf6')),
    border: isShiftDragging ? '2px solid #059669' : (isHighlighted ? '3px solid #4c1d95' : (isSelected ? '2px solid #6d28d9' : '1px solid #7c3aed')),
    borderRadius: isTagMode ? '16px' : '8px',
    padding: isTagMode ? '6px 12px' : '16px',
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
    marginBottom: category.isExpanded && children && !isTagMode ? '12px' : '0',
    minHeight: isTagMode ? '20px' : '24px',
    width: '100%',
    overflow: 'hidden'
  };

  const expandButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: isTagMode ? '0' : '4px',
    marginRight: isTagMode ? '4px' : '8px',
    fontSize: isTagMode ? '10px' : '14px',
    color: 'white',
    display: hasChildren ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const titleStyle: React.CSSProperties = {
    flex: 1,
    fontSize: isTagMode ? '13px' : '16px',
    fontWeight: isTagMode ? 500 : 600,
    color: 'white',
    backgroundColor: 'transparent',
    border: isEditing ? '1px solid #1976d2' : 'none',
    borderRadius: '4px',
    padding: isTagMode ? '2px 4px' : '4px 8px',
    outline: 'none',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    whiteSpace: isTagMode ? 'nowrap' : 'normal',
    overflow: isTagMode ? 'hidden' : 'visible',
    textOverflow: isTagMode ? 'ellipsis' : 'clip'
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
      <div
        ref={categoryRef}
        data-category-block="true"
        data-category-id={category.id}
        draggable={!isDraggingPosition}
        style={categoryStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseUp={(e) => {
          if (isConnecting && connectingFromId && connectingFromId !== category.id) {
            e.stopPropagation();
            onConnectItems?.(connectingFromId, category.id);
          }
        }}
        onMouseEnter={() => {
          if (isMemoBeingDragged || isCategoryBeingDragged) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
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
            {isShiftDragging && (
              <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginRight: '4px' }}>+</span>
            )}
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

      {!isTagMode && category.tags.length > 0 && (
        <div style={tagsStyle}>
          {category.tags.map((tag, index) => (
            <span key={index} style={tagStyle}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {!isTagMode && category.isExpanded && children && (
        <div style={childrenContainerStyle}>
          {children}
        </div>
      )}

      {!isTagMode && (<>
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
      </>)}

      {!isTagMode && category.isExpanded && (
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

      {isDraggingPosition && !isShiftPressed && (
        <div
          style={{
            position: 'absolute',
            left: (category.size?.width || 200) + 10,
            top: 0,
            backgroundColor: '#374151',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          SHIFT + 드래그로 메모나 카테고리를 다른 카테고리 영역에 종속, 제거하세요
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onSetQuickNav={handleAddQuickNav}
          onDelete={() => {
            setContextMenu(null);
            if (window.confirm(`카테고리 "${category.title}"를 삭제하시겠습니까? 하위 아이템들은 최상위로 이동됩니다.`)) {
              onDelete(category.id);
            }
          }}
        />
      )}

      <QuickNavModal
        isOpen={showQuickNavModal}
        onClose={() => {
          setShowQuickNavModal(false);
        }}
        onConfirm={handleQuickNavConfirm}
        initialName={category.title || '제목 없는 카테고리'}
      />
    </div>
  );
};

export default CategoryBlockComponent;
