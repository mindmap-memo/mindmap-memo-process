import React from 'react';
import { MemoBlock, Page, ImportanceLevel, CategoryBlock } from '../../types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../utils/importanceStyles';
import Resizer from '../Resizer';
import ContentBlockComponent from '../ContentBlock';
import GoogleAuth from '../GoogleAuth';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useBlockHandlers } from './hooks/useBlockHandlers';
import { useFileHandlers } from './hooks/useFileHandlers';
import { useDragSelection } from './hooks/useDragSelection';
import { useContextMenu } from './hooks/useContextMenu';
import { useBlockDrag } from './hooks/useBlockDrag';
import { useInputHandlers } from './hooks/useInputHandlers';
import { useKeyboardEvents } from './hooks/useKeyboardEvents';
import { useTableCreation } from './hooks/useTableCreation';
import { useConnectedMemos } from './hooks/useConnectedMemos';
import { useUIState } from './hooks/useUIState';
import PanelHeader from './PanelHeader';
import MultiSelectView from './MultiSelectView';
import CategoryEditView from './CategoryEditView';
import { getSpacerHeight, isBlockVisible, getTopSelectedBlockPosition, blockTypes, ensureBlocks, isDefaultFilterState } from './utils/blockUtils';

interface RightPanelProps {
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];
  selectedCategory: CategoryBlock | undefined;
  selectedCategories: CategoryBlock[];
  currentPage: Page | undefined;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  selectedMemo,
  selectedMemos,
  selectedCategory,
  selectedCategories,
  currentPage,
  onMemoUpdate,
  onCategoryUpdate,
  onMemoSelect,
  onCategorySelect,
  onFocusMemo,
  width,
  onResize,
  isFullscreen = false,
  onToggleFullscreen,
  activeImportanceFilters,
  showGeneralContent = true,
  onResetFilters
}) => {
  const [selectedBlocks, setSelectedBlocks] = React.useState<string[]>([]);
  const [dragSelectedBlocks, setDragSelectedBlocks] = React.useState<string[]>([]);
  const [dragJustCompleted, setDragJustCompleted] = React.useState(false);

  const blocksContainerRef = React.useRef<HTMLDivElement>(null);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const importanceButtonRef = React.useRef<HTMLButtonElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0); // RightPanel 강제 리렌더링용

  // UI 상태 훅 사용
  const {
    showMenu,
    setShowMenu,
    menuPosition,
    setMenuPosition,
    isGoogleSignedIn,
    setIsGoogleSignedIn,
    showConnectedMemos,
    setShowConnectedMemos,
    isTitleFocused,
    setIsTitleFocused,
    showContextMenu,
    setShowContextMenu,
    showImportanceSubmenu,
    setShowImportanceSubmenu,
    submenuPosition,
    setSubmenuPosition,
    submenuTopOffset,
    setSubmenuTopOffset,
    showEmptySpaceMenu,
    setShowEmptySpaceMenu,
    clickedPosition,
    setClickedPosition
  } = useUIState();

  // Undo/Redo 훅 사용
  const { saveToHistory, handleUndo, handleRedo, canUndo, canRedo } = useUndoRedo(selectedMemo, onMemoUpdate);

  // 블록 핸들러 훅 사용
  const {
    createNewBlock,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockMove,
    handleConvertBlock,
    handleCreateNewBlock,
    handleInsertBlockAfter,
    handleMergeWithPrevious,
    handleFocusPrevious,
    handleFocusNext
  } = useBlockHandlers(selectedMemo, onMemoUpdate, saveToHistory, forceUpdate);

  // 파일 핸들러 훅 사용
  const {
    handleFileAttach,
    handleFileSelect,
    handleAddTextBlock,
    handleFileDrop,
    handleDragOver
  } = useFileHandlers({
    selectedMemo: selectedMemo || null,
    clickedPosition,
    onMemoUpdate,
    saveToHistory,
    setShowEmptySpaceMenu,
    fileInputRef
  });

  // 드래그 선택 훅 사용
  const {
    isDragSelecting,
    isDragMoved,
    dragStart,
    dragEnd,
    dragHoveredBlocks,
    handleBlockClick,
    handleMouseDown,
    handleMemoAreaClick
  } = useDragSelection({
    selectedMemo: selectedMemo || null,
    selectedBlocks,
    setSelectedBlocks,
    dragSelectedBlocks,
    setDragSelectedBlocks,
    dragJustCompleted,
    setDragJustCompleted,
    blocksContainerRef,
    rightPanelRef
  });

  // 컨텍스트 메뉴 훅 사용
  const {
    contextMenuPosition,
    emptySpaceMenuPosition,
    handleEmptySpaceContextMenu,
    handleBlockContextMenu,
    handleDeleteSelectedBlocks,
    handleApplyImportance,
    handleBlocksMove,
    handleBlocksDelete,
    addNewBlock
  } = useContextMenu({
    selectedMemo: selectedMemo || null,
    selectedBlocks,
    setSelectedBlocks,
    dragSelectedBlocks,
    setDragSelectedBlocks,
    showContextMenu,
    setShowContextMenu,
    showEmptySpaceMenu,
    setShowEmptySpaceMenu,
    setClickedPosition,
    onMemoUpdate,
    createNewBlock,
    saveToHistory
  });

  // 블록 드래그 훅 사용
  const {
    isDraggingBlock,
    draggedBlockId,
    dropTargetIndex,
    dragStartY,
    currentDragY,
    dragPreviewPosition,
    handleBlockDragStart
  } = useBlockDrag({
    selectedMemo: selectedMemo || null,
    onMemoUpdate,
    blocksContainerRef
  });

  // 입력 핸들러 훅 사용
  const {
    tagInput,
    setTagInput,
    handleTitleChange,
    handleTagInputChange,
    handleTagInputKeyPress,
    removeTag,
    handleBlockSelect
  } = useInputHandlers({
    selectedMemo: selectedMemo || null,
    onMemoUpdate,
    setSelectedBlocks
  });

  // 키보드 이벤트 훅 사용
  useKeyboardEvents({
    selectedBlocks,
    setSelectedBlocks,
    setDragSelectedBlocks,
    selectedMemo: selectedMemo || null,
    handleBlocksDelete,
    handleBlocksMove,
    handleUndo,
    handleRedo
  });

  // 테이블 생성 신호 감지 훅 사용
  useTableCreation({
    selectedMemo: selectedMemo || null,
    onMemoUpdate
  });

  // 연결된 메모 자동 펼침 훅 사용
  useConnectedMemos({
    selectedMemo: selectedMemo || null,
    setShowConnectedMemos
  });


  return (
    <div
      ref={rightPanelRef}
      data-right-panel="true"
      data-tutorial="right-panel"
      onClick={handleMemoAreaClick}
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      style={{
        display: 'flex',
        height: '100vh',
        flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #e1e5e9',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      width: isFullscreen ? '100vw' : `${width}px`,
      minWidth: '250px',
      zIndex: isFullscreen ? 9999 : 'auto'
    }}>
      {!isFullscreen && (
        <Resizer
          direction="right"
          onResize={onResize}
        />
      )}

      <PanelHeader
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        activeImportanceFilters={activeImportanceFilters}
        showGeneralContent={showGeneralContent}
        onResetFilters={onResetFilters}
      />

      <div
        ref={rightPanelRef}
        className="right-panel-content"
        style={{ flex: 1, overflow: 'auto', padding: '16px' }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleEmptySpaceContextMenu}
      >
        {(selectedMemos.length > 1 || selectedCategories.length > 1 || (selectedMemos.length > 0 && selectedCategories.length > 0)) ? (
          <MultiSelectView
            selectedMemos={selectedMemos}
            selectedCategories={selectedCategories}
            onCategorySelect={onCategorySelect}
            onFocusMemo={onFocusMemo}
          />
        ) : selectedCategory ? (
          <CategoryEditView
            selectedCategory={selectedCategory}
            currentPage={currentPage}
            onCategoryUpdate={onCategoryUpdate}
            onCategorySelect={onCategorySelect}
            onFocusMemo={onFocusMemo}
          />
        ) : selectedMemo ? (
          // 단일 메모 편집 모드
          <div>
            {/* 제목 입력 */}
            <div style={{ marginBottom: '20px', paddingLeft: '20px' }}>
              <input
                type="text"
                placeholder="제목을 입력해주세요"
                value={selectedMemo.title}
                onChange={handleTitleChange}
                style={{
                  width: '100%',
                  padding: '2px 0',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  borderRadius: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  color: '#1f2937',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                  setIsTitleFocused(true);
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                  setIsTitleFocused(false);
                }}
              />
            </div>

            {/* Google 인증 - 임시 숨김 */}
            {false && (
              <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                <GoogleAuth onAuthSuccess={setIsGoogleSignedIn} />
              </div>
            )}

            {/* 태그 관리 */}
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {selectedMemo.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginBottom: '8px' 
                }}>
                  {selectedMemo.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <input
                type="text"
                placeholder="태그를 입력하세요 (Enter로 추가)"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyPress={handleTagInputKeyPress}
                style={{
                  width: '100%',
                  padding: '2px 0',
                  border: 'none',
                  borderBottom: '1px solid #e5e7eb',
                  borderRadius: '0',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  color: '#6b7280',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                  e.target.style.color = '#1f2937';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = '#e5e7eb';
                  e.target.style.color = '#6b7280';
                }}
              />
            </div>

            {/* 연결된 메모들 */}
            {selectedMemo.connections.length > 0 && (
              <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                <div
                  onClick={() => setShowConnectedMemos(!showConnectedMemos)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0,
                    marginRight: '8px'
                  }}>
                    연결된 메모 ({selectedMemo.connections.length})
                  </h4>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    style={{
                      transform: showConnectedMemos ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="#6b7280"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {showConnectedMemos && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    alignItems: 'start'
                  }}>
                    {selectedMemo.connections.map(connectionId => {
                      const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
                      return connectedMemo ? (
                        <div
                          key={connectionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusMemo(connectionId);
                          }}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6b7280',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <div style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            width: '100%'
                          }}>
                            {connectedMemo.title || '제목 없음'}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: 'fixed',
                    top: `${menuPosition.y}px`,
                    left: `${menuPosition.x}px`,
                    backgroundColor: 'white',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    minWidth: '150px',
                    zIndex: 1001
                  }}
                >
                  <div
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      color: '#666',
                      borderBottom: '1px solid #f0f0f0',
                      marginBottom: '4px'
                    }}
                  >
                    {selectedBlocks.length}개 블록 선택됨
                  </div>
                  <button
                    onClick={() => {
                      handleBlocksMove('up');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ↑ 위로 이동
                  </button>
                  <button
                    onClick={() => {
                      handleBlocksMove('down');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ↓ 아래로 이동
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
                  <button
                    onClick={() => {
                      handleBlocksDelete();
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      color: '#ff4444'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBlocks([]);
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    선택 해제
                  </button>
                </div>
              </>
            )}

            {/* 우클릭 컨텍스트 메뉴 */}
            {showContextMenu && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => {
                    setShowContextMenu(false);
                    setShowImportanceSubmenu(false);
                  }}
                />
                <div
                  data-context-menu="true"
                  style={{
                    position: 'fixed',
                    top: `${contextMenuPosition.y}px`,
                    left: `${contextMenuPosition.x}px`,
                    backgroundColor: 'white',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    minWidth: '150px',
                    zIndex: 1001
                  }}
                >
                  <button
                    onClick={handleDeleteSelectedBlocks}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      color: '#ff4444'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    삭제
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
                  <div style={{ position: 'relative' }}>
                    <button
                      ref={importanceButtonRef}
                      onClick={() => {
                        if (!showImportanceSubmenu && importanceButtonRef.current) {
                          // 서브메뉴를 열 때 위치 계산
                          const rect = importanceButtonRef.current.getBoundingClientRect();
                          const submenuWidth = 140;
                          const submenuHeight = 280; // 8개 항목 * 약 34px + 구분선
                          const spaceOnRight = window.innerWidth - rect.right;
                          const spaceBelow = window.innerHeight - rect.top;

                          // 오른쪽에 공간이 충분하면 오른쪽에, 아니면 왼쪽에 표시
                          setSubmenuPosition(spaceOnRight >= submenuWidth + 10 ? 'right' : 'left');

                          // 아래쪽 경계 체크 - 서브메뉴가 화면 아래로 나가면 위로 조정
                          let topOffset = 0;
                          if (spaceBelow < submenuHeight + 10) {
                            topOffset = Math.max(-(submenuHeight - spaceBelow + 10), -(rect.top - 10));
                          }
                          setSubmenuTopOffset(topOffset);
                        }
                        setShowImportanceSubmenu(!showImportanceSubmenu);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      중요도 부여
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>▶</span>
                    </button>

                    {/* 중요도 서브메뉴 */}
                    {showImportanceSubmenu && (
                      <div
                        data-context-menu="true"
                        style={{
                          position: 'absolute',
                          ...(submenuPosition === 'right'
                            ? { left: '100%', marginLeft: '4px' }
                            : { right: '100%', marginRight: '4px' }
                          ),
                          top: submenuTopOffset,
                          backgroundColor: 'white',
                          border: '1px solid #e1e5e9',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          padding: '8px 0',
                          minWidth: '140px',
                          zIndex: 1002
                        }}
                      >
                        <button
                          onClick={() => handleApplyImportance('critical')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.critical, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.critical}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('important')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff7ed'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.important, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.important}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('opinion')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef9c3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.opinion, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.opinion}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('reference')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.reference, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.reference}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('question')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.question, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.question}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('idea')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.idea, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.idea}
                        </button>
                        <button
                          onClick={() => handleApplyImportance('data')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.data, borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.data}
                        </button>
                        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 8px' }} />
                        <button
                          onClick={() => handleApplyImportance('none')}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ width: '16px', height: '16px', backgroundColor: IMPORTANCE_COLORS.none, border: '1px solid #e5e7eb', borderRadius: '3px', display: 'inline-block' }}></span>
                          {IMPORTANCE_LABELS.none}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 블록들 렌더링 */}
            <div
              ref={blocksContainerRef}
              className="blocks-container"
              onContextMenu={handleBlockContextMenu}
              style={{
                marginBottom: '16px',
                position: 'relative',
                userSelect: 'none',
                minHeight: '200px',
                padding: '20px'
              }}
            >
              {/* 드래그 선택 박스 오버레이 */}
              {isDragSelecting && isDragMoved && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(dragStart.x, dragEnd.x)}px`,
                    top: `${Math.min(dragStart.y, dragEnd.y)}px`,
                    width: `${Math.abs(dragEnd.x - dragStart.x)}px`,
                    height: `${Math.abs(dragEnd.y - dragStart.y)}px`,
                    backgroundColor: 'rgba(33, 150, 243, 0.15)', // 약간 더 진한 배경
                    border: '2px solid #2196f3',
                    borderRadius: '2px', // 살짝 둥근 모서리
                    pointerEvents: 'none',
                    zIndex: 999,
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)' // 그림자 추가로 더 잘 보이게
                  }}
                />
              )}
{(() => {
                const blocks = ensureBlocks(selectedMemo).blocks || [];
                const renderedElements: React.ReactElement[] = [];
                let consecutiveHiddenBlocks = 0;

                const defaultFilterState = isDefaultFilterState(activeImportanceFilters, showGeneralContent);

                blocks.forEach((block, index) => {
                  const isSelected = selectedBlocks.includes(block.id);
                  const topSelectedIndex = getTopSelectedBlockPosition(selectedBlocks, selectedMemo);
                  const isFirstSelected = topSelectedIndex === index;
                  const blockVisible = isBlockVisible(block, activeImportanceFilters, showGeneralContent);

                  if (blockVisible) {
                    // 공백 처리: 숨겨진 블록이 2개 이상 연속으로 있었고, 기본 상태가 아닐 때
                    if (!defaultFilterState && consecutiveHiddenBlocks >= 2) {
                      // 마지막 블록인지 확인 (뒤에 보이는 블록이 있는지 체크)
                      const hasVisibleBlocksAfter = blocks.slice(index + 1).some(laterBlock => isBlockVisible(laterBlock));

                      if (hasVisibleBlocksAfter) {
                        const spacerHeight = getSpacerHeight(consecutiveHiddenBlocks);
                        renderedElements.push(
                          <div key={`spacer-${block.id}`} style={{
                            height: spacerHeight,
                            opacity: 0.4,
                            fontSize: '12px',
                            color: '#9ca3af',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '4px 0'
                          }}>
                            ⋯
                          </div>
                        );
                      }
                    }

                    const isDragging = draggedBlockId === block.id;
                    const blockIndex = selectedMemo.blocks?.findIndex(b => b.id === block.id) ?? -1;
                    const shouldShowDropIndicator = dropTargetIndex === blockIndex;

                    renderedElements.push(
                      <React.Fragment key={block.id}>
                        {shouldShowDropIndicator && (
                          <div style={{
                            height: '2px',
                            backgroundColor: '#3b82f6',
                            margin: '8px 0',
                            borderRadius: '1px',
                            boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                          }} />
                        )}
                        <div
                          data-block-id={block.id}
                          style={{
                            position: 'relative',
                            marginBottom: '0px',
                            opacity: isDragging ? 0.2 : 1,
                            transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                            transition: isDragging ? 'none' : 'transform 0.15s ease, opacity 0.15s ease',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '4px'
                          }}
                        >
                          {/* 드래그 핸들 */}
                          <div
                            onMouseDown={(e) => handleBlockDragStart(e, block.id)}
                            style={{
                              cursor: 'grab',
                              padding: '4px',
                              marginTop: '8px',
                              opacity: 0.3,
                              transition: 'opacity 0.15s ease',
                              flexShrink: 0,
                              userSelect: 'none',
                              fontSize: '16px',
                              lineHeight: 1,
                              color: '#6b7280'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.3';
                            }}
                          >
                            ⋮⋮
                          </div>

                          {/* 블록 콘텐츠 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <ContentBlockComponent
                              block={block}
                              isEditing={!isTitleFocused}
                              isSelected={isSelected}
                              isDragSelected={dragSelectedBlocks.includes(block.id)}
                              isDragHovered={dragHoveredBlocks.includes(block.id)}
                              pageId={currentPage?.id}
                              memoId={selectedMemo?.id}
                              onUpdate={handleBlockUpdate}
                              onDelete={handleBlockDelete}
                              onDuplicate={handleBlockDuplicate}
                              onMoveUp={(blockId) => handleBlockMove(blockId, 'up')}
                              onMoveDown={(blockId) => handleBlockMove(blockId, 'down')}
                              onConvertToBlock={handleConvertBlock}
                              onCreateNewBlock={handleCreateNewBlock}
                              onInsertBlockAfter={handleInsertBlockAfter}
                              onFocusPrevious={handleFocusPrevious}
                              onFocusNext={handleFocusNext}
                              onBlockClick={handleBlockClick}
                              onMergeWithPrevious={handleMergeWithPrevious}
                              onBlockSelect={handleBlockSelect}
                              onSaveToHistory={saveToHistory}
                              activeImportanceFilters={activeImportanceFilters}
                              showGeneralContent={showGeneralContent}
                              onResetFilters={onResetFilters}
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );

                    consecutiveHiddenBlocks = 0; // 리셋
                  } else {
                    // 블록이 숨겨짐
                    if (!defaultFilterState) {
                      consecutiveHiddenBlocks++;
                    }
                  }
                });

                // 맨 끝에 드롭 인디케이터 표시
                if (dropTargetIndex === blocks.length) {
                  renderedElements.push(
                    <div key="drop-indicator-end" style={{
                      height: '2px',
                      backgroundColor: '#3b82f6',
                      margin: '8px 0',
                      borderRadius: '1px',
                      boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                    }} />
                  );
                }

                return renderedElements;
              })()}
            </div>

          </div>
        ) : (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            메모나 카테고리를 선택하여 편집하세요
          </div>
        )}

        {/* 드래그 프리뷰 */}
        {isDraggingBlock && draggedBlockId && selectedMemo?.blocks && (
          <div
            style={{
              position: 'fixed',
              left: `${dragPreviewPosition.x}px`,
              top: `${dragPreviewPosition.y}px`,
              pointerEvents: 'none',
              zIndex: 10001,
              opacity: 0.8,
              transform: 'rotate(-2deg)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
              maxWidth: '600px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              {/* 드래그 핸들 */}
              <div
                style={{
                  padding: '4px',
                  marginTop: '8px',
                  opacity: 0.5,
                  flexShrink: 0,
                  userSelect: 'none',
                  fontSize: '16px',
                  lineHeight: 1,
                  color: '#6b7280'
                }}
              >
                ⋮⋮
              </div>

              {/* 블록 콘텐츠 복사본 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <ContentBlockComponent
                  block={selectedMemo.blocks.find(b => b.id === draggedBlockId)!}
                  isEditing={false}
                  isSelected={false}
                  isDragSelected={false}
                  isDragHovered={false}
                  pageId={currentPage?.id}
                  memoId={selectedMemo?.id}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onConvertToBlock={() => {}}
                  onCreateNewBlock={() => {}}
                  onInsertBlockAfter={() => {}}
                  onFocusPrevious={() => {}}
                  onFocusNext={() => {}}
                  onBlockClick={() => {}}
                  onMergeWithPrevious={() => {}}
                  onBlockSelect={() => {}}
                  onSaveToHistory={() => {}}
                  activeImportanceFilters={activeImportanceFilters}
                  showGeneralContent={showGeneralContent}
                  onResetFilters={onResetFilters}
                />
              </div>
            </div>
          </div>
        )}

        {/* 빈 공간 우클릭 컨텍스트 메뉴 */}
        {showEmptySpaceMenu && (
          <div
            data-context-menu="true"
            style={{
              position: 'fixed',
              left: `${emptySpaceMenuPosition.x}px`,
              top: `${emptySpaceMenuPosition.y}px`,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '4px',
              zIndex: 10000,
              minWidth: '160px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={handleFileAttach}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>📎</span>
              <span>파일 첨부</span>
            </div>
            <div
              onClick={handleAddTextBlock}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>➕</span>
              <span>입력창 추가</span>
            </div>
          </div>
        )}

        {/* 숨겨진 파일 input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};

export default RightPanel;