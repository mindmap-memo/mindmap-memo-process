import React from 'react';
import { MemoBlock, Page, ImportanceLevel } from '../../types';
import ContentBlockComponent from '../ContentBlock';

interface BlockDragPreviewProps {
  isDraggingBlock: boolean;
  draggedBlockId: string | null;
  selectedMemo: MemoBlock | null;
  dragPreviewPosition: { x: number; y: number };
  currentPage: Page | undefined;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
}

/**
 * 블록 드래그 프리뷰 컴포넌트
 *
 * 블록을 드래그할 때 마우스를 따라다니는 프리뷰를 표시합니다.
 */
const BlockDragPreview: React.FC<BlockDragPreviewProps> = ({
  isDraggingBlock,
  draggedBlockId,
  selectedMemo,
  dragPreviewPosition,
  currentPage,
  activeImportanceFilters,
  showGeneralContent,
  onResetFilters
}) => {
  if (!isDraggingBlock || !draggedBlockId || !selectedMemo?.blocks) {
    return null;
  }

  return (
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
  );
};

export default BlockDragPreview;
