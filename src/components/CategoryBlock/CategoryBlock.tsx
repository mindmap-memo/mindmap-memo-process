import React from 'react';
import { CategoryBlock } from '../../types';
import ContextMenu from '../ContextMenu';
import QuickNavModal from '../QuickNavModal';
import { detectDoubleTap } from '../../utils/doubleTapUtils';
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
  onUpdateDragLine?: (mousePos: { x: number; y: number }) => void;
  onCancelConnection?: () => void;
  onPositionChange?: (categoryId: string, position: { x: number; y: number }) => void;
  onPositionDragEnd?: (categoryId: string, finalPosition: { x: number; y: number }, isShiftMode?: boolean) => void;
  onDetectCategoryDropForCategory?: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onMoveToCategory?: (itemId: string, categoryId: string | null) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  isDragTarget?: boolean;
  isCategoryBeingDragged?: boolean;
  isShiftPressed?: boolean;
  onOpenEditor?: () => void;
  isLongPressActive?: boolean;  // 롱프레스 상태
  longPressTargetId?: string | null;  // 롱프레스된 타겟 ID
  setIsLongPressActive?: (active: boolean, targetId?: string | null) => void;  // 롱프레스 상태 업데이트
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수 추가
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref 추가
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
  onUpdateDragLine,
  onCancelConnection,
  onPositionChange,
  onPositionDragEnd,
  onDetectCategoryDropForCategory,
  onSizeChange,
  onMoveToCategory,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 },
  onAddQuickNav,
  isQuickNavExists,
  isDragTarget = false,
  isCategoryBeingDragged = false,
  isShiftPressed = false,
  onOpenEditor,
  isLongPressActive: globalIsLongPressActive = false,
  longPressTargetId = null,
  setIsLongPressActive: externalSetIsLongPressActive,
  setIsShiftPressed,  // Shift 상태 업데이트 함수
  isShiftPressedRef  // Shift ref 추가
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
    isLongPressActive,
    setIsLongPressActive,
    lastUpdateTime,
    pendingPosition,
    isDraggingRef,
    titleRef,
    categoryRef,
    longPressTimerRef
  } = useCategoryBlockState(category);

  // 제목 편집 핸들러
  const { handleTitleClick, handleTitleDoubleClick, handleTitleSave, handleTitleKeyDown } = useCategoryTitleHandlers({
    category,
    isEditing,
    editTitle,
    setIsEditing,
    setEditTitle,
    titleRef,
    onUpdate,
    onOpenEditor,
    isSelected
  });

  // 컨텍스트 메뉴 핸들러 (lastLongPressEndRef를 드래그 핸들러보다 먼저 선언)
  const { handleContextMenu, handleAddQuickNav, handleQuickNavConfirm, lastLongPressEndRef } = useCategoryContextMenu({
    categoryId: category.id,
    contextMenu,
    setContextMenu,
    setShowQuickNavModal,
    onDelete,
    onAddQuickNav,
    isQuickNavExists
  });

  // 드래그 핸들러
  const { handleMouseDown, handleTouchStart, handleMouseMove, handleMouseUp, handleClick } = useCategoryDragHandlers({
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
    longPressTimerRef,
    isLongPressActive,
    setMouseDownPos,
    setDragMoved,
    setDragStart,
    setIsDraggingPosition,
    setIsLongPressActive,
    setIsLongPressActiveGlobal: externalSetIsLongPressActive,
    setIsShiftPressed,  // Shift 상태 업데이트 함수 전달
    isShiftPressedRef,  // Shift ref 전달
    lastLongPressEndRef,  // 롱프레스 종료 시간 ref 전달
    onClick,
    onDragStart,
    onDragEnd,
    onPositionChange,
    onPositionDragEnd,
    onDetectCategoryDropForCategory,
    onOpenEditor
  });

  // 연결 핸들러
  const { handleConnectionPointMouseDown, handleConnectionPointMouseUp } = useCategoryConnectionHandlers({
    categoryId: category.id,
    isConnecting,
    connectingFromId,
    setIsConnectionDragging,
    onStartConnection,
    onConnectItems,
    onUpdateDragLine,
    onCancelConnection,
    canvasOffset,
    canvasScale
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

  /**
   * 네이티브 터치 이벤트 리스너 등록
   * React 합성 이벤트보다 먼저 실행되어 롱프레스 타이머를 정확하게 시작
   */
  React.useEffect(() => {
    if (!categoryRef?.current) return;

    const handleNativeTouchStart = (e: TouchEvent) => {
      console.log('[CategoryBlock Native TouchStart] 이벤트 발생!', { categoryId: category.id });

      // 편집 모드거나 연결 모드면 무시
      if (isEditing || isConnecting) {
        console.log('[CategoryBlock Native TouchStart] 편집/연결 모드라 무시');
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        console.log('[CategoryBlock Native TouchStart] 드래그 준비 및 롱프레스 타이머 시작');

        // 롱프레스 타이머 시작
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
          console.log('[CategoryBlock Native TouchStart] 롱프레스 감지! Shift+드래그 모드 활성화');
          setIsLongPressActive(true);

          // 전역 롱프레스 상태 업데이트 (컨텍스트 메뉴 방지용)
          externalSetIsLongPressActive?.(true, category.id);

          // 햅틱 피드백
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 500);
      }
    };

    categoryRef.current.addEventListener('touchstart', handleNativeTouchStart, { passive: false });

    return () => {
      categoryRef.current?.removeEventListener('touchstart', handleNativeTouchStart);
    };
  }, [category.id, isEditing, isConnecting, longPressTimerRef, setIsLongPressActive, externalSetIsLongPressActive, categoryRef]);

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

  // Shift+드래그 또는 롱프레스 스타일 적용
  // ⚠️ 중요: 롱프레스는 이 카테고리가 타겟일 때만 적용
  const isThisCategoryLongPressed = isLongPressActive && longPressTargetId === category.id;
  const isShiftDragging = isDraggingPosition && (isShiftPressed || isThisCategoryLongPressed);

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
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
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
            onDoubleClick={handleTitleDoubleClick}
            title="더블클릭하여 편집"
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
      {/* 연결점 - 상단 */}
      <div
        data-category-id={category.id}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onTouchStart={handleConnectionPointMouseDown}
        onTouchEnd={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        style={{
          position: 'absolute',
          top: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 15,
          touchAction: 'none'
        }}
      >
        <div style={{
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
          boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      {/* 연결점 - 하단 */}
      <div
        data-category-id={category.id}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onTouchStart={handleConnectionPointMouseDown}
        onTouchEnd={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        style={{
          position: 'absolute',
          bottom: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 15,
          touchAction: 'none'
        }}
      >
        <div style={{
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
          boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      {/* 연결점 - 좌측 */}
      <div
        data-category-id={category.id}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onTouchStart={handleConnectionPointMouseDown}
        onTouchEnd={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        style={{
          position: 'absolute',
          left: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 15,
          touchAction: 'none'
        }}
      >
        <div style={{
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
          boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
      {/* 연결점 - 우측 */}
      <div
        data-category-id={category.id}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
        onTouchStart={handleConnectionPointMouseDown}
        onTouchEnd={handleConnectionPointMouseUp}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        style={{
          position: 'absolute',
          right: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? -75 : -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 150 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 15,
          touchAction: 'none'
        }}
      >
        <div style={{
          width: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          height: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? 48 : 8,
          backgroundColor: isConnecting && connectingFromId === category.id ? '#ef4444' : '#8b5cf6',
          borderRadius: '50%',
          border: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '5px solid white' : '2px solid white',
          boxShadow: (isConnecting && typeof window !== 'undefined' && window.innerWidth <= 768) ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)'
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

      {mouseDownPos && (
        <div
          style={{
            position: 'absolute',
            left: (category.size?.width || 200) + 10,
            top: 0,
            backgroundColor: isShiftPressed || isLongPressActive ? '#10b981' : '#374151',
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
          {isShiftPressed || isLongPressActive
            ? '카테고리를 다른 카테고리에 추가/제거하려면 드롭하세요'
            : '0.5초 이상 꾹 누르면 카테고리를 다른 카테고리에 종속/제거할 수 있습니다'
          }
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
