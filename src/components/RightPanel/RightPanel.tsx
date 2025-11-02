import React from 'react';
import { MemoBlock, Page, ImportanceLevel, CategoryBlock } from '../../types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../utils/importanceStyles';
import Resizer from '../Resizer';
import ContentBlockComponent from '../ContentBlock';
import BlockEditor from '../editor/BlockEditor';
import GoogleAuth from '../GoogleAuth';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useBlockHandlers } from './hooks/useBlockHandlers';
import { useFileHandlers } from './hooks/useFileHandlers';
import { useDragSelection } from './hooks/useDragSelection';
import { useContextMenu } from './hooks/useContextMenu';
import { useBlockDrag } from './hooks/useBlockDrag';
import { useInputHandlers } from './hooks/useInputHandlers';
import { useKeyboardEvents } from './hooks/useKeyboardEvents';
import { useConnectedMemos } from './hooks/useConnectedMemos';
import { useUIState } from './hooks/useUIState';
import { useRightPanelRendering } from './hooks/useRightPanelRendering';
import { useRightPanelMenus } from './hooks/useRightPanelMenus';
import { useRightPanelMemoView } from './hooks/useRightPanelMemoView';
import { useEmptySpaceMenu } from './hooks/useEmptySpaceMenu';
import { useMultiBlockImportance } from './hooks/useMultiBlockImportance';
import { useAddBlockButton } from './hooks/useAddBlockButton';
import { usePanelFileDrop } from './hooks/usePanelFileDrop';
import PanelHeader from './PanelHeader';
import MultiSelectView from './MultiSelectView';
import CategoryEditView from './CategoryEditView';
import BlockDragPreview from './BlockDragPreview';

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
  const [pendingFileType, setPendingFileType] = React.useState<'image' | 'file' | null>(null);

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

  // 연결된 메모 자동 펼침 훅 사용
  useConnectedMemos({
    selectedMemo: selectedMemo || null,
    setShowConnectedMemos
  });

  // 렌더링 훅 사용
  const { renderDragSelectionOverlay, renderBlocks } = useRightPanelRendering({
    selectedMemo: selectedMemo || null,
    selectedBlocks,
    dragSelectedBlocks,
    dragHoveredBlocks,
    isTitleFocused,
    currentPage,
    activeImportanceFilters,
    showGeneralContent,
    isDragSelecting,
    isDragMoved,
    dragStart,
    dragEnd,
    isDraggingBlock,
    draggedBlockId,
    dropTargetIndex,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockMove,
    handleConvertBlock,
    handleCreateNewBlock,
    handleInsertBlockAfter,
    handleMergeWithPrevious,
    handleFocusPrevious,
    handleFocusNext,
    handleBlockClick,
    handleBlockSelect,
    handleBlockDragStart,
    saveToHistory,
    onResetFilters
  });

  // 메뉴 렌더링 훅 사용
  const { renderDropdownMenu, renderContextMenu } = useRightPanelMenus({
    showMenu,
    setShowMenu,
    menuPosition,
    selectedBlocks,
    setSelectedBlocks,
    showContextMenu,
    setShowContextMenu,
    contextMenuPosition,
    showImportanceSubmenu,
    setShowImportanceSubmenu,
    submenuPosition,
    setSubmenuPosition,
    submenuTopOffset,
    setSubmenuTopOffset,
    importanceButtonRef,
    handleBlocksMove,
    handleBlocksDelete,
    handleDeleteSelectedBlocks,
    handleApplyImportance
  });

  // 메모 뷰 렌더링 훅 사용
  const { renderTitleInput, renderTagsSection, renderConnectedMemos } = useRightPanelMemoView({
    selectedMemo: selectedMemo || null,
    currentPage,
    tagInput,
    showConnectedMemos,
    setShowConnectedMemos,
    setIsTitleFocused,
    handleTitleChange,
    handleTagInputChange,
    handleTagInputKeyPress,
    removeTag,
    onFocusMemo
  });

  // 빈 공간 메뉴 렌더링 훅 사용
  const { renderEmptySpaceMenu } = useEmptySpaceMenu({
    showEmptySpaceMenu,
    emptySpaceMenuPosition,
    handleFileAttach,
    handleAddTextBlock
  });

  // 멀티 블록 중요도 훅 사용
  const { renderImportanceMenu } = useMultiBlockImportance({
    selectedMemo: selectedMemo || null,
    onMemoUpdate,
    saveToHistory
  });

  // 패널 파일 드롭 훅 사용
  const {
    isDraggingOver,
    handleDragOver: handlePanelDragOver,
    handleDragLeave: handlePanelDragLeave,
    handleDrop: handlePanelDrop,
  } = usePanelFileDrop({
    onFileDrop: (file: File) => {
      // 파일 타입에 따라 적절한 블록 생성
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (selectedMemo && e.target?.result) {
            const newBlock = {
              id: `${Date.now()}${Math.random()}`,
              type: 'image' as const,
              url: e.target.result as string,
              src: e.target.result as string,
              alt: file.name,
            };
            onMemoUpdate(selectedMemo.id, {
              blocks: [...selectedMemo.blocks, newBlock]
            });
            saveToHistory();
          }
        };
        reader.readAsDataURL(file);
      } else {
        // 일반 파일
        const reader = new FileReader();
        reader.onload = (e) => {
          if (selectedMemo && e.target?.result) {
            const newBlock = {
              id: `${Date.now()}${Math.random()}`,
              type: 'file' as const,
              url: e.target.result as string,
              name: file.name,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || 'application/octet-stream',
              fileData: e.target.result as string,
            };
            onMemoUpdate(selectedMemo.id, {
              blocks: [...selectedMemo.blocks, newBlock]
            });
            saveToHistory();
          }
        };
        reader.readAsDataURL(file);
      }
    },
    enabled: !!selectedMemo && !selectedCategory
  });

  // + 버튼 훅 사용
  const { renderAddBlockButton } = useAddBlockButton({
    onAddBlock: (type: string) => {
      if (!selectedMemo) return;

      if (type === 'text') {
        const newBlock = {
          id: `${Date.now()}${Math.random()}`,
          type: 'text' as const,
          content: '',
        };
        onMemoUpdate(selectedMemo.id, {
          blocks: [...selectedMemo.blocks, newBlock]
        });
      } else if (type === 'image') {
        setPendingFileType('image');
        if (fileInputRef.current) {
          fileInputRef.current.accept = 'image/*';
          fileInputRef.current.click();
        }
      } else if (type === 'file') {
        setPendingFileType('file');
        if (fileInputRef.current) {
          fileInputRef.current.accept = '*';
          fileInputRef.current.click();
        }
      }
    },
    show: !!selectedMemo && !selectedCategory
  });

  // + 버튼에서 파일 선택 핸들러
  const handleAddBlockFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMemo) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;

      if (pendingFileType === 'image') {
        const newBlock = {
          id: `${Date.now()}${Math.random()}`,
          type: 'image' as const,
          url: event.target.result as string,
          src: event.target.result as string,
          alt: file.name,
        };
        onMemoUpdate(selectedMemo.id, {
          blocks: [...selectedMemo.blocks, newBlock]
        });
      } else {
        const newBlock = {
          id: `${Date.now()}${Math.random()}`,
          type: 'file' as const,
          url: event.target.result as string,
          name: file.name,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          fileData: event.target.result as string,
        };
        onMemoUpdate(selectedMemo.id, {
          blocks: [...selectedMemo.blocks, newBlock]
        });
      }

      saveToHistory();
      setPendingFileType(null);
    };
    reader.readAsDataURL(file);

    // input 초기화
    e.target.value = '';
  };

  return (
    <div
      ref={rightPanelRef}
      data-right-panel="true"
      data-tutorial="right-panel"
      onClick={handleMemoAreaClick}
      onDrop={(e) => {
        handleFileDrop(e);
        handlePanelDrop(e);
      }}
      onDragOver={(e) => {
        handleDragOver(e);
        handlePanelDragOver(e);
      }}
      onDragLeave={handlePanelDragLeave}
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
            {renderTitleInput()}

            {/* Google 인증 - 임시 숨김 */}
            {false && (
              <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                <GoogleAuth onAuthSuccess={setIsGoogleSignedIn} />
              </div>
            )}

            {renderTagsSection()}
            {renderConnectedMemos()}

            {/* 드롭다운 메뉴 */}
            {renderDropdownMenu()}

            {/* 우클릭 컨텍스트 메뉴 */}
            {renderContextMenu()}

            {/* 블록들 렌더링 */}
            <div
              ref={blocksContainerRef}
              className="blocks-container"
              onContextMenu={handleBlockContextMenu}
              style={{
                marginBottom: '16px',
                position: 'relative',
                minHeight: '200px',
                padding: '20px'
              }}
            >
              {/* 드래그 선택 박스 오버레이 */}
              {renderDragSelectionOverlay()}

              {/* 빈 상태 안내 문구 */}
              {selectedMemo && selectedMemo.blocks.length === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#9ca3af',
                  fontSize: '14px',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  텍스트를 입력하거나 파일을 드래그해 추가하세요
                </div>
              )}

              {/* 블록 에디터 */}
              <BlockEditor
                initialBlocks={selectedMemo.blocks}
                onChange={(blocks) => {
                  onMemoUpdate(selectedMemo.id, { blocks });
                }}
                placeholder="텍스트를 입력하거나 파일을 드래그해 추가하세요"
              />
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

        <BlockDragPreview
          isDraggingBlock={isDraggingBlock}
          draggedBlockId={draggedBlockId}
          selectedMemo={selectedMemo || null}
          dragPreviewPosition={dragPreviewPosition}
          currentPage={currentPage}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
          onResetFilters={onResetFilters}
        />

        {/* 빈 공간 우클릭 컨텍스트 메뉴 */}
        {renderEmptySpaceMenu()}

        {/* 멀티 블록 중요도 메뉴 */}
        {renderImportanceMenu()}

        {/* 숨겨진 파일 input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleAddBlockFileSelect}
        />
      </div>

      {/* 파일 드래그 오버 오버레이 */}
      {isDraggingOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '3px dashed #8b5cf6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#8b5cf6',
          }}>
            파일을 여기에 드롭하세요
          </div>
        </div>
      )}

      {/* 블록 추가 버튼 */}
      {renderAddBlockButton()}
    </div>
  );
};

export default RightPanel;
