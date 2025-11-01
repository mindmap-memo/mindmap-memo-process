import React from 'react';
import ReactDOM from 'react-dom';
import { TextBlock, ImportanceLevel, ContentBlock } from '../../../types';
import { useTextBlockState } from './hooks/useTextBlockState';
import { useTextFiltering } from './hooks/useTextFiltering';
import { useImportanceHandling } from './hooks/useImportanceHandling';
import { useTextBlockInput } from './hooks/useTextBlockInput';
import { useTextBlockRendering } from './hooks/useTextBlockRendering';
import { useTextBlockEffects } from './hooks/useTextBlockEffects';

const IMPORTANCE_LABELS = {
  critical: '🔴 매우중요',
  important: '🟠 중요',
  opinion: '🟣 의견',
  reference: '🔵 참고',
  question: '🟡 질문',
  idea: '🟢 아이디어',
  data: '⚫ 데이터',
  none: '강조 해제'
};

interface TextBlockProps {
  block: TextBlock;
  isEditing?: boolean;
  onUpdate?: (block: TextBlock) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onInsertBlockAfter?: (afterBlockId: string, newBlock: ContentBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  onSaveToHistory?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
}

const TextBlockComponent: React.FC<TextBlockProps> = ({
  block,
  isEditing = false,
  onUpdate,
  onCreateNewBlock,
  onInsertBlockAfter,
  onDeleteBlock,
  onFocusPrevious,
  onFocusNext,
  onMergeWithPrevious,
  onSaveToHistory,
  activeImportanceFilters,
  showGeneralContent,
  onResetFilters
}) => {
  // 상태 관리 훅
  const {
    content,
    setContent,
    importanceRanges,
    setImportanceRanges,
    isFocused,
    setIsFocused,
    showImportanceMenu,
    setShowImportanceMenu,
    importanceMenuPosition,
    setImportanceMenuPosition,
    selectedRange,
    setSelectedRange,
    backgroundKey,
    setBackgroundKey,
    textareaRef,
    menuRef,
    readModeRef,
    backgroundLayerRef
  } = useTextBlockState(block.content, block.importanceRanges);

  // 텍스트 필터링 훅
  const { getFilteredText, canEdit } = useTextFiltering(
    block,
    content,
    true, // 초기 canEdit 값 (useTextFiltering 내부에서 재계산됨)
    activeImportanceFilters,
    showGeneralContent
  );

  // 중요도 처리 훅
  const { handleTextSelection, applyImportance } = useImportanceHandling({
    block,
    content,
    importanceRanges,
    isEditing,
    canEdit,
    textareaRef,
    setImportanceRanges,
    setBackgroundKey,
    setShowImportanceMenu,
    setImportanceMenuPosition,
    setSelectedRange,
    selectedRange,
    onUpdate,
    onSaveToHistory
  });

  // 입력 핸들러 훅
  const {
    handleKeyDown,
    handleInputChange,
    handlePaste,
    handleFocus,
    handleBlur,
    handleClick
  } = useTextBlockInput({
    block,
    content,
    importanceRanges,
    textareaRef,
    setContent,
    setIsFocused,
    setShowImportanceMenu,
    setSelectedRange,
    onUpdate,
    onCreateNewBlock,
    onInsertBlockAfter,
    onDeleteBlock,
    onMergeWithPrevious,
    onSaveToHistory
  });

  // 렌더링 훅
  const {
    renderFilteredHighlightedText,
    renderStyledTextForReadMode,
    backgroundLayer
  } = useTextBlockRendering({
    block,
    content,
    importanceRanges,
    backgroundKey,
    activeImportanceFilters,
    showGeneralContent
  });

  // useEffect 훅
  useTextBlockEffects({
    block,
    content,
    isFocused,
    isEditing,
    showImportanceMenu,
    importanceRanges,
    textareaRef,
    readModeRef,
    setContent,
    setImportanceRanges,
    setBackgroundKey,
    setShowImportanceMenu,
    setSelectedRange
  });

  if (isEditing) {
    // 편집 모드
    return (
      <>
        <div style={{
          marginBottom: '0px',
          position: 'relative',
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* 배경에 스타일된 텍스트 표시 - 중요도가 있을 때만 렌더링 */}
          {backgroundLayer && (
            <div
              ref={backgroundLayerRef}
              data-importance-background="true"
              key={`bg-${block.id}-${backgroundKey}`}
              style={{
                position: 'absolute',
                top: '2px',
                left: '0px',
                right: '0px',
                bottom: '0px',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.4',
                padding: '0px',
                pointerEvents: 'none',
                zIndex: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                userSelect: 'none'
              }}
            >
              {backgroundLayer}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={canEdit ? content : getFilteredText()}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onMouseDown={(e) => {
              // 새로운 드래그 시작 시 기존 메뉴 닫기
              if (showImportanceMenu) {
                setShowImportanceMenu(false);
                setSelectedRange(null);
              }
              // 텍스트 선택을 위해 이벤트 전파 막기
              e.stopPropagation();
            }}
            onMouseUp={(e) => handleTextSelection(e)}
            data-block-id={block.id}
            disabled={!canEdit}
            placeholder={content === '' ? "텍스트를 입력하거나 파일을 드래그해 추가하세요" : ''}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              minHeight: '24px',
              border: 'none',
              borderRadius: '4px',
              padding: '1px 0',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'none',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              outline: 'none',
              lineHeight: '1.4',
              color: 'inherit',
              cursor: !canEdit ? 'not-allowed' : 'text'
            }}
            onMouseEnter={(e) => {
              // 중요도가 없고 포커스되지 않은 경우에만 배경색 변경
              if (!isFocused && (!importanceRanges || importanceRanges.length === 0)) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              // 항상 투명으로 복원 (중요도 배경이 보이도록)
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          />
        </div>

        {/* 중요도 메뉴 - Portal을 사용하여 document.body에 렌더링 */}
        {showImportanceMenu && ReactDOM.createPortal(
          <div
            ref={menuRef}
            data-importance-menu
            onMouseDown={(e) => e.preventDefault()} // 선택 해제 방지
            style={{
              position: 'fixed',
              left: `${importanceMenuPosition.x}px`,
              top: `${importanceMenuPosition.y}px`,
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              padding: '4px',
              minWidth: '140px',
              maxWidth: '200px'
            }}
          >
            {Object.entries(IMPORTANCE_LABELS).map(([level, label]) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
                  applyImportance(level as ImportanceLevel);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {label}
              </button>
            ))}
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      ref={readModeRef}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1px 0',
        borderRadius: '4px',
        cursor: 'text',
        minHeight: '24px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.4',
        fontSize: '14px'
      }}
    >
      {block.content ? (
        (activeImportanceFilters || showGeneralContent !== undefined) ?
          renderFilteredHighlightedText(block.content, block.importanceRanges, activeImportanceFilters, showGeneralContent) :
          renderStyledTextForReadMode(block.content, block.importanceRanges)
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>빈 텍스트</span>
      )}
    </div>
  );
};

export default TextBlockComponent;
