import React from 'react';
import { MemoBlock, Page, ContentBlock, ContentBlockType, TextBlock, ImportanceLevel, CategoryBlock } from '../../types';
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
  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
  const isDefaultFilterState = () => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

    return (!activeImportanceFilters ||
            (activeImportanceFilters.size === allLevels.length &&
             allLevels.every(level => activeImportanceFilters.has(level)))) &&
           showGeneralContent !== false;
  };
  const [selectedBlocks, setSelectedBlocks] = React.useState<string[]>([]);
  const [dragSelectedBlocks, setDragSelectedBlocks] = React.useState<string[]>([]);
  const [dragJustCompleted, setDragJustCompleted] = React.useState(false);

  const blocksContainerRef = React.useRef<HTMLDivElement>(null);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const importanceButtonRef = React.useRef<HTMLButtonElement>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [isGoogleSignedIn, setIsGoogleSignedIn] = React.useState(false);
  const [showConnectedMemos, setShowConnectedMemos] = React.useState(false);
  const [isTitleFocused, setIsTitleFocused] = React.useState(false);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [showImportanceSubmenu, setShowImportanceSubmenu] = React.useState(false);
  const [submenuPosition, setSubmenuPosition] = React.useState<'right' | 'left'>('right');
  const [submenuTopOffset, setSubmenuTopOffset] = React.useState<number>(0);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0); // RightPanel 강제 리렌더링용

  // 빈 공간 우클릭 컨텍스트 메뉴
  const [showEmptySpaceMenu, setShowEmptySpaceMenu] = React.useState(false);
  const [clickedPosition, setClickedPosition] = React.useState<number | null>(null); // 블록 삽입 위치
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // 메모가 변경될 때마다 연결된 메모를 펼침
  React.useEffect(() => {
    if (selectedMemo) {
      setShowConnectedMemos(true);
    }
  }, [selectedMemo?.id]);

  // 공백 크기를 계산하는 함수 (최대 1블록 높이로 제한)
  const getSpacerHeight = (consecutiveHiddenBlocks: number): string => {
    if (consecutiveHiddenBlocks <= 1) return '0';
    return '0.8em'; // 적당한 공백 크기
  };

  // 블록이 필터링되어 보이는지 확인하는 함수
  const isBlockVisible = (block: ContentBlock): boolean => {
    // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
    const isDefaultFilterState = (!activeImportanceFilters ||
                                 (activeImportanceFilters.size === allLevels.length &&
                                  allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                showGeneralContent !== false;

    if (isDefaultFilterState) return true;

    if (block.type === 'text') {
      const textBlock = block as TextBlock;
      if (!textBlock.content || textBlock.content.trim() === '') {
        return showGeneralContent !== false;
      }

      if (!textBlock.importanceRanges || textBlock.importanceRanges.length === 0) {
        return showGeneralContent !== false;
      }

      // 필터에 맞는 중요도 범위가 있는지 확인
      return textBlock.importanceRanges.some(range =>
        activeImportanceFilters && activeImportanceFilters.has(range.level)
      ) || (showGeneralContent !== false && textBlock.importanceRanges.length < textBlock.content.length);
    }

    // 다른 블록 타입들은 기본적으로 표시
    return true;
  };

  // 선택된 블록 중 첫 번째 블록의 위치 계산
  const getTopSelectedBlockPosition = () => {
    if (selectedBlocks.length === 0 || !selectedMemo?.blocks) return null;
    
    const firstSelectedIndex = selectedMemo.blocks.findIndex(block => 
      selectedBlocks.includes(block.id)
    );
    
    if (firstSelectedIndex === -1) return null;
    
    return firstSelectedIndex;
  };

  // 전역 테이블 생성 신호 감지
  React.useEffect(() => {
    const checkForTableCreation = () => {
      const signal = (window as any).createTableAfterBlock;
      if (signal && selectedMemo) {
        const { afterBlockId, tableBlock } = signal;
        
        // 현재 메모에서 해당 블록 찾기
        const blockIndex = selectedMemo.blocks?.findIndex(block => block.id === afterBlockId);
        
        if (blockIndex !== undefined && blockIndex >= 0 && selectedMemo.blocks) {
          const updatedBlocks = [...selectedMemo.blocks];
          updatedBlocks.splice(blockIndex + 1, 0, tableBlock);
          
          onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
          
          // 신호 제거
          delete (window as any).createTableAfterBlock;
        }
      }
    };
    
    const interval = setInterval(checkForTableCreation, 100);
    return () => clearInterval(interval);
  }, [selectedMemo, onMemoUpdate]);

  // 기존 키보드 이벤트 리스너 제거 (중복)

  // 빈 공간 우클릭 핸들러 (패널의 빈 영역)



  // 블록 선택 관련 핸들러들


  // 키보드 이벤트 처리 (Delete 키로 블록 삭제)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      // 입력 필드에 포커스가 있을 때 처리
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      if (isInputFocused) {

        // Enter 키는 항상 허용 (블록 생성을 위해)
        if (event.key === 'Enter') {
          return;
        }

        // Undo/Redo는 입력 필드에서도 허용 (z 또는 Z)
        if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
          // Undo/Redo 로직으로 넘어감
        }
        // 선택된 블록이 있고 Delete/Backspace를 눌렀을 때만 예외 처리
        else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlocks.length > 0) {
          // 텍스트가 선택되어 있거나 커서가 중간에 있으면 일반 편집 동작
          const textarea = activeElement as HTMLTextAreaElement;

          if (textarea.selectionStart !== textarea.selectionEnd ||
              (textarea.selectionStart > 0 && textarea.selectionStart < textarea.value.length)) {
            return;
          }

          // 빈 입력 필드이거나 커서가 맨 앞/뒤에 있으면 블록 삭제 허용
        } else {
          return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksDelete();
        } else {
        }
      } else if (event.key === 'Escape') {
        if (selectedBlocks.length > 0) {
          setSelectedBlocks([]);
          setDragSelectedBlocks([]);
        }
      } else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('up');
        }
      } else if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('down');
        }
      } else if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
        // RightPanel이 포커스되어 있을 때만 블록 Undo/Redo 처리
        // 그렇지 않으면 Canvas의 Undo/Redo가 작동하도록 통과
        const target = event.target as HTMLElement;
        const isInRightPanel = target.closest('[data-right-panel="true"]');

        if (isInRightPanel) {
          console.log('RightPanel: Handling Ctrl+Z in RightPanel');
          if (event.shiftKey) {
            // Ctrl+Shift+Z: Redo
            event.preventDefault();
            handleRedo();
          } else {
            // Ctrl+Z: Undo
            event.preventDefault();
            handleUndo();
          }
        } else {
          console.log('RightPanel: Not in RightPanel, letting Ctrl+Z pass through');
          // RightPanel 밖에서 발생한 이벤트는 통과
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBlocks, selectedMemo, onMemoUpdate, handleUndo, handleRedo]);


  // 기존 메모에 blocks가 없으면 초기화
  const ensureBlocks = (memo: MemoBlock): MemoBlock => {
    if (!memo.blocks || memo.blocks.length === 0) {
      return {
        ...memo,
        blocks: memo.content ? 
          [{ id: memo.id + '_text', type: 'text', content: memo.content }] :
          [{ id: memo.id + '_text', type: 'text', content: '' }]
      };
    }
    return memo;
  };



  const blockTypes = [
    { type: 'text' as ContentBlockType, label: '텍스트', icon: '📝' },
    { type: 'callout' as ContentBlockType, label: '콜아웃', icon: '💡' },
    { type: 'checklist' as ContentBlockType, label: '체크리스트', icon: '✓' },
    { type: 'quote' as ContentBlockType, label: '인용구', icon: '💬' },
    { type: 'code' as ContentBlockType, label: '코드', icon: '💻' },
    { type: 'image' as ContentBlockType, label: '이미지', icon: '🖼️' },
    { type: 'file' as ContentBlockType, label: '파일', icon: '📎' },
    { type: 'bookmark' as ContentBlockType, label: '북마크', icon: '🔖' },
    { type: 'table' as ContentBlockType, label: '테이블', icon: '📊' }
  ];

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
      
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{
            margin: '0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            메모 편집
          </h2>

          {/* 필터링 해제 버튼 - 기본 상태가 아닐 때만 표시 */}
          {!isDefaultFilterState() && (
            <button
              onClick={() => onResetFilters && onResetFilters()}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              📝 필터링 해제 후 편집
            </button>
          )}
        </div>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            style={{
              padding: '8px',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
          >
{isFullscreen ? '◧' : '⛶'}
          </button>
        )}
      </div>

      <div
        ref={rightPanelRef}
        className="right-panel-content"
        style={{ flex: 1, overflow: 'auto', padding: '16px' }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleEmptySpaceContextMenu}
      >
        {(selectedMemos.length > 1 || selectedCategories.length > 1 || (selectedMemos.length > 0 && selectedCategories.length > 0)) ? (
          // 멀티 선택 모드
          <div>
            <h3 style={{
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              선택된 아이템 (메모 {selectedMemos.length}개, 카테고리 {selectedCategories.length}개)
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {/* 선택된 카테고리들 */}
              {selectedCategories.map(category => (
                <div
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fff3e0',
                    border: '1px solid #ffb74d',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffe0b2';
                    e.currentTarget.style.borderColor = '#ff9800';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff3e0';
                    e.currentTarget.style.borderColor = '#ffb74d';
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {category.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '4px'
                  }}>
                    하위 아이템: {category.children.length}개
                  </div>
                </div>
              ))}

              {/* 선택된 메모들 */}
              {selectedMemos.map(memo => (
                <div
                  key={memo.id}
                  onClick={() => onFocusMemo(memo.id)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {memo.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {memo.content || '내용 없음'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedCategory ? (
          // 단일 카테고리 편집 모드
          <div>
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              <input
                type="text"
                value={selectedCategory.title}
                onChange={(e) => onCategoryUpdate({ ...selectedCategory, title: e.target.value })}
                placeholder="카테고리 제목을 입력하세요..."
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
                  color: '#ff9800',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#ff9800';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              />
            </div>

            {/* 태그 관리 */}
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {selectedCategory.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {selectedCategory.tags.map((tag, index) => (
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
                        onClick={() => {
                          const newTags = selectedCategory.tags.filter((_, i) => i !== index);
                          onCategoryUpdate({ ...selectedCategory, tags: newTags });
                        }}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const newTag = e.currentTarget.value.trim();
                    if (!selectedCategory.tags.includes(newTag)) {
                      onCategoryUpdate({
                        ...selectedCategory,
                        tags: [...selectedCategory.tags, newTag]
                      });
                    }
                    e.currentTarget.value = '';
                  }
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

            {/* 연결된 아이템들 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                paddingLeft: '20px'
              }}>
                연결된 카테고리
              </h4>

              <div style={{ paddingLeft: '20px' }}>
                {selectedCategory.connections && selectedCategory.connections.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {selectedCategory.connections.map(connectionId => {
                      const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
                      const connectedCategory = currentPage?.categories?.find(c => c.id === connectionId);
                      const connectedItem = connectedMemo || connectedCategory;

                      if (!connectedItem) return null;

                      return (
                        <div
                          key={connectionId}
                          onClick={() => {
                            if (connectedMemo) {
                              onFocusMemo(connectionId);
                            } else if (connectedCategory) {
                              onCategorySelect(connectionId);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: connectedMemo ? '#f0f9ff' : '#fff3e0',
                            border: `1px solid ${connectedMemo ? '#bae6fd' : '#ffcc02'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>
                            {connectedMemo ? '📝 ' : ''}{connectedItem.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                    border: '1px dashed #d1d5db',
                    borderRadius: '6px'
                  }}>
                    연결된 아이템이 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 하위 카테고리 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                paddingLeft: '20px'
              }}>
                하위 카테고리
              </h4>

              <div style={{ paddingLeft: '20px' }}>
                {(() => {
                  const childCategories = selectedCategory.children
                    ?.map(childId => currentPage?.categories?.find(c => c.id === childId))
                    .filter(Boolean) as CategoryBlock[] | undefined;

                  return childCategories && childCategories.length > 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {childCategories.map(childCategory => (
                        <div
                          key={childCategory.id}
                          onClick={() => onCategorySelect(childCategory.id)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#fff3e0',
                            border: '1px solid #ffcc02',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>
                            📁 {childCategory.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px',
                      border: '1px dashed #d1d5db',
                      borderRadius: '6px'
                    }}>
                      하위 카테고리가 없습니다
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 하위 메모 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                paddingLeft: '20px'
              }}>
                하위 메모
              </h4>

              <div style={{ paddingLeft: '20px' }}>
                {(() => {
                  const childMemos = selectedCategory.children
                    ?.map(childId => {
                      const memo = currentPage?.memos.find(m => m.id === childId);
                      return memo;
                    })
                    .filter(Boolean) as MemoBlock[] | undefined;

                  return childMemos && childMemos.length > 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {childMemos.map(childMemo => (
                        <div
                          key={childMemo.id}
                          onClick={() => onFocusMemo(childMemo.id)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>
                            📝 {childMemo.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px',
                      border: '1px dashed #d1d5db',
                      borderRadius: '6px'
                    }}>
                      하위 메모가 없습니다
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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

                // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
                const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
                const isDefaultFilterState = (!activeImportanceFilters ||
                                             (activeImportanceFilters.size === allLevels.length &&
                                              allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                            showGeneralContent !== false;

                blocks.forEach((block, index) => {
                  const isSelected = selectedBlocks.includes(block.id);
                  const topSelectedIndex = getTopSelectedBlockPosition();
                  const isFirstSelected = topSelectedIndex === index;
                  const blockVisible = isBlockVisible(block);

                  if (blockVisible) {
                    // 공백 처리: 숨겨진 블록이 2개 이상 연속으로 있었고, 기본 상태가 아닐 때
                    if (!isDefaultFilterState && consecutiveHiddenBlocks >= 2) {
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
                    if (!isDefaultFilterState) {
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