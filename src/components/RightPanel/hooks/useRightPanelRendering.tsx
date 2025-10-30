import React from 'react';
import { MemoBlock, Page, ImportanceLevel, ContentBlock, ContentBlockType } from '../../../types';
import ContentBlockComponent from '../../ContentBlock';
import { getSpacerHeight, isBlockVisible, getTopSelectedBlockPosition, ensureBlocks, isDefaultFilterState } from '../utils/blockUtils';

interface UseRightPanelRenderingProps {
  selectedMemo: MemoBlock | null;
  selectedBlocks: string[];
  dragSelectedBlocks: string[];
  dragHoveredBlocks: string[];
  isTitleFocused: boolean;
  currentPage: Page | undefined;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent: boolean;
  isDragSelecting: boolean;
  isDragMoved: boolean;
  dragStart: { x: number; y: number };
  dragEnd: { x: number; y: number };
  isDraggingBlock: boolean;
  draggedBlockId: string | null;
  dropTargetIndex: number | null;
  handleBlockUpdate: (updatedBlock: ContentBlock) => void;
  handleBlockDelete: (blockId: string) => void;
  handleBlockDuplicate: (blockId: string) => void;
  handleBlockMove: (blockId: string, direction: 'up' | 'down') => void;
  handleConvertBlock: (blockId: string, newBlockType: ContentBlockType) => void;
  handleCreateNewBlock: (afterBlockId: string, content: string) => void;
  handleInsertBlockAfter: (afterBlockId: string, newBlock: ContentBlock) => void;
  handleMergeWithPrevious: (blockId: string, currentContent: string) => void;
  handleFocusPrevious: (blockId: string) => void;
  handleFocusNext: (blockId: string) => void;
  handleBlockClick: (blockId: string, e: React.MouseEvent) => void;
  handleBlockSelect: (blockId: string) => void;
  handleBlockDragStart: (e: React.MouseEvent, blockId: string) => void;
  saveToHistory: () => void;
  onResetFilters?: () => void;
}

export const useRightPanelRendering = ({
  selectedMemo,
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
}: UseRightPanelRenderingProps) => {

  const renderDragSelectionOverlay = () => {
    if (!isDragSelecting || !isDragMoved) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${Math.min(dragStart.x, dragEnd.x)}px`,
          top: `${Math.min(dragStart.y, dragEnd.y)}px`,
          width: `${Math.abs(dragEnd.x - dragStart.x)}px`,
          height: `${Math.abs(dragEnd.y - dragStart.y)}px`,
          backgroundColor: 'rgba(33, 150, 243, 0.15)',
          border: '2px solid #2196f3',
          borderRadius: '2px',
          pointerEvents: 'none',
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)'
        }}
      />
    );
  };

  const renderBlocks = () => {
    if (!selectedMemo) return [];

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
          const hasVisibleBlocksAfter = blocks.slice(index + 1).some(laterBlock => isBlockVisible(laterBlock, activeImportanceFilters, showGeneralContent));

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
  };

  return {
    renderDragSelectionOverlay,
    renderBlocks
  };
};
