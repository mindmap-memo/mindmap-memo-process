import React, { useState, useRef } from 'react';
import { ContentBlock, ContentBlockType, ImportanceLevel } from '../types';
import { shouldShowBlock } from '../utils/importanceStyles';
import TextBlockComponent from './blocks/TextBlock/TextBlock';
import CalloutBlockComponent from './blocks/CalloutBlock';
import ChecklistBlockComponent from './blocks/ChecklistBlock';
import ImageBlockComponent from './blocks/ImageBlock';
import FileBlockComponent from './blocks/FileBlock';
import BookmarkBlockComponent from './blocks/BookmarkBlock';
import QuoteBlockComponent from './blocks/QuoteBlock';
import CodeBlockComponent from './blocks/CodeBlock';
import SheetsBlockComponent from './blocks/SheetsBlock';

interface ContentBlockProps {
  block: ContentBlock;
  isEditing?: boolean;
  isSelected?: boolean;
  isDragSelected?: boolean; // 드래그로 선택된 블록인지
  isDragHovered?: boolean;
  pageId?: string;
  memoId?: string;
  onUpdate?: (block: ContentBlock) => void;
  onDelete?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onConvertToBlock?: (blockId: string, newBlockType: ContentBlockType) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onInsertBlockAfter?: (afterBlockId: string, newBlock: ContentBlock) => void;
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onBlockClick?: (blockId: string, event: React.MouseEvent) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  onBlockSelect?: (blockId: string) => void;
  onSaveToHistory?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
}

const ContentBlockComponent: React.FC<ContentBlockProps> = ({
  block,
  isEditing = false,
  isSelected = false,
  isDragSelected = false,
  isDragHovered = false,
  pageId,
  memoId,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onConvertToBlock,
  onCreateNewBlock,
  onInsertBlockAfter,
  onFocusPrevious,
  onFocusNext,
  onBlockClick,
  onMergeWithPrevious,
  onBlockSelect,
  onSaveToHistory,
  activeImportanceFilters,
  showGeneralContent,
  onResetFilters
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{left?: string, right?: string}>({left: '-100px'});
  const blockRef = useRef<HTMLDivElement>(null);

  // 블록 필터링 확인 - TextBlock은 별도로 처리하므로 제외
  const blockImportance = block.type !== 'text' ? (block as any).importance : undefined;
  const shouldShow = block.type === 'text' || shouldShowBlock(blockImportance, activeImportanceFilters, showGeneralContent);

  // 필터링된 블록은 렌더링하지 않음
  if (!shouldShow) {
    return null;
  }

  const renderBlock = () => {
    const commonProps = {
      block,
      isEditing,
      onUpdate,
      onDelete,
      onMoveUp,
      onMoveDown
    };

    switch (block.type) {
      case 'text':
        return <TextBlockComponent
          {...commonProps}
          block={block as any}
          onCreateNewBlock={onCreateNewBlock}
          onInsertBlockAfter={onInsertBlockAfter}
          onDeleteBlock={onDelete}
          onFocusPrevious={onFocusPrevious}
          onFocusNext={onFocusNext}
          onMergeWithPrevious={onMergeWithPrevious}
          onSaveToHistory={onSaveToHistory}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
          onResetFilters={onResetFilters}
        />;
      case 'callout':
        return <CalloutBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'checklist':
        return <ChecklistBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'image':
        return <ImageBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'file':
        return <FileBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'bookmark':
        return <BookmarkBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'quote':
        return <QuoteBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'code':
        return <CodeBlockComponent
          {...commonProps}
          block={block as any}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
        />;
      case 'sheets':
        return <SheetsBlockComponent
          block={block as any}
          onUpdate={onUpdate}
          onDelete={() => onDelete?.(block.id)}
          isSelected={isSelected}
          onSelect={() => onBlockSelect?.(block.id)}
          onCreateNewBlock={onCreateNewBlock}
        />;
      default:
        return null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onBlockClick) {
      onBlockClick(block.id, e);
    }
    // 드래그 선택을 위해 이벤트 전파 허용 - stopPropagation 제거
  };

  const calculateMenuPosition = () => {
    if (!blockRef.current) return {left: '-100px'};
    
    const blockRect = blockRef.current.getBoundingClientRect();
    const menuWidth = 90; // 메뉴의 예상 너비
    const margin = 10; // 여백
    
    // 기본 위치는 왼쪽
    let position: {left?: string, right?: string} = {left: '-100px'};
    
    // RightPanel 내부에서의 위치 체크
    // RightPanel의 부모 컨테이너 찾기
    const rightPanelElement = blockRef.current.closest('[style*="width"]') || 
                             blockRef.current.closest('.right-panel') ||
                             document.querySelector('.right-panel');
                             
    if (rightPanelElement) {
      const panelRect = rightPanelElement.getBoundingClientRect();
      const relativeLeft = blockRect.left - panelRect.left;
      
      // 왼쪽에 메뉴를 배치할 공간이 충분한지 확인
      if (relativeLeft < menuWidth + margin) {
        // 공간이 부족하면 오른쪽에 배치
        position = {left: '25px'}; // 드래그 핸들 오른쪽에 배치
      }
    } else {
      // RightPanel을 찾을 수 없는 경우 화면 기준으로 체크
      if (blockRect.left < menuWidth + margin) {
        position = {left: '25px'};
      }
    }
    
    return position;
  };

  const handleDragHandleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 블록 선택
    if (onBlockSelect) {
      onBlockSelect(block.id);
    }
    
    // 메뉴 위치 계산
    const newPosition = calculateMenuPosition();
    setMenuPosition(newPosition);
    
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action: 'delete' | 'duplicate') => {
    setShowMenu(false);
    if (action === 'delete' && onDelete) {
      onDelete(block.id);
    } else if (action === 'duplicate' && onDuplicate) {
      onDuplicate(block.id);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // 메뉴가 열려있지 않다면 마우스가 나갔을 때 메뉴도 닫기
    if (!showMenu) {
      setShowMenu(false);
    }
  };

  const handleHandleAreaMouseEnter = () => {
    setIsHovered(true);
  };

  const handleHandleAreaMouseLeave = () => {
    // 메뉴가 열려있지 않을 때만 숨기기
    if (!showMenu) {
      setIsHovered(false);
    }
  };

  // 점 세개 아이콘 SVG
  const DragHandleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="3" r="1" fill="#666"/>
      <circle cx="8" cy="3" r="1" fill="#666"/>
      <circle cx="12" cy="3" r="1" fill="#666"/>
      <circle cx="4" cy="8" r="1" fill="#666"/>
      <circle cx="8" cy="8" r="1" fill="#666"/>
      <circle cx="12" cy="8" r="1" fill="#666"/>
      <circle cx="4" cy="13" r="1" fill="#666"/>
      <circle cx="8" cy="13" r="1" fill="#666"/>
      <circle cx="12" cy="13" r="1" fill="#666"/>
    </svg>
  );

  // 드래그 중 하이라이트 또는 선택 상태에 따른 스타일 결정
  const getBlockStyle = () => {
    if (isDragHovered) {
      return {
        marginBottom: '0px', // 블록 간 간격 제거
        padding: '4px 8px', // 내부 여백 추가
        position: 'relative' as const,
        backgroundColor: '#e3f2fd', // 드래그 호버 시 배경색
        border: 'none', // 경계선 제거
        borderRadius: '0px', // 둥근 모서리 제거로 연속성 확보
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      };
    } else if (isSelected || isDragSelected) {
      return {
        marginBottom: '0px', // 블록 간 간격 제거
        padding: '4px 8px', // 내부 여백 추가
        position: 'relative' as const,
        backgroundColor: '#e8f4fd', // 선택된 블록 파란색 배경
        border: 'none', // 경계선 완전 제거
        borderRadius: '0px', // 둥근 모서리 제거로 연속성 확보
        cursor: 'text',
        transition: 'all 0.15s ease'
      };
    } else {
      return {
        marginBottom: '0px', // 블록 간 간격 제거
        padding: '4px 8px', // 일관된 내부 여백
        position: 'relative' as const,
        backgroundColor: 'transparent',
        border: 'none', // 경계선 완전 제거
        borderRadius: '0px', // 둥근 모서리 제거
        cursor: 'text', // 텍스트 커서로 변경
        transition: 'all 0.15s ease'
      };
    }
  };

  return (
    <div 
      ref={blockRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={getBlockStyle()}
    >
      {/* 드래그 핸들 영역 제거 */}

      {/* 드래그 핸들 버튼 제거 */}

      {/* 메뉴 제거 */}

      {renderBlock()}
    </div>
  );
};

export default ContentBlockComponent;