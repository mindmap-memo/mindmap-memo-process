import React from 'react';
import { ContentBlock, ContentBlockType } from '../types';
import TextBlockComponent from './blocks/TextBlock';
import CalloutBlockComponent from './blocks/CalloutBlock';
import ChecklistBlockComponent from './blocks/ChecklistBlock';
import ImageBlockComponent from './blocks/ImageBlock';
import FileBlockComponent from './blocks/FileBlock';
import BookmarkBlockComponent from './blocks/BookmarkBlock';
import QuoteBlockComponent from './blocks/QuoteBlock';
import CodeBlockComponent from './blocks/CodeBlock';
import TableBlockComponent from './blocks/TableBlock';

interface ContentBlockProps {
  block: ContentBlock;
  isEditing?: boolean;
  isSelected?: boolean;
  isDragHovered?: boolean;
  onUpdate?: (block: ContentBlock) => void;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onConvertToBlock?: (blockId: string, newBlockType: ContentBlockType) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onBlockClick?: (blockId: string, event: React.MouseEvent) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
}

const ContentBlockComponent: React.FC<ContentBlockProps> = ({ 
  block, 
  isEditing = false,
  isSelected = false,
  isDragHovered = false,
  onUpdate, 
  onDelete,
  onMoveUp,
  onMoveDown,
  onConvertToBlock,
  onCreateNewBlock,
  onFocusPrevious,
  onFocusNext,
  onBlockClick,
  onMergeWithPrevious
}) => {
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
          onConvertToBlock={onConvertToBlock ? (newBlockType) => onConvertToBlock(block.id, newBlockType) : undefined}
          onCreateNewBlock={onCreateNewBlock}
          onDeleteBlock={onDelete}
          onFocusPrevious={onFocusPrevious}
          onFocusNext={onFocusNext}
          onMergeWithPrevious={onMergeWithPrevious}
        />;
      case 'callout':
        return <CalloutBlockComponent {...commonProps} block={block as any} />;
      case 'checklist':
        return <ChecklistBlockComponent {...commonProps} block={block as any} />;
      case 'image':
        return <ImageBlockComponent {...commonProps} block={block as any} />;
      case 'file':
        return <FileBlockComponent {...commonProps} block={block as any} />;
      case 'bookmark':
        return <BookmarkBlockComponent {...commonProps} block={block as any} />;
      case 'quote':
        return <QuoteBlockComponent {...commonProps} block={block as any} />;
      case 'code':
        return <CodeBlockComponent {...commonProps} block={block as any} />;
      case 'table':
        return <TableBlockComponent {...commonProps} block={block as any} />;
      default:
        return null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log('Block clicked:', block.id);
    if (onBlockClick) {
      onBlockClick(block.id, e);
    }
    // 드래그 선택을 위해 이벤트 전파 허용 - stopPropagation 제거
  };

  // 드래그 중 하이라이트 또는 선택 상태에 따른 스타일 결정
  const getBlockStyle = () => {
    if (isDragHovered) {
      return {
        marginBottom: '2px',
        padding: '2px 0',
        position: 'relative' as const,
        backgroundColor: '#e3f2fd',
        borderLeft: '3px solid #64b5f6',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      };
    } else if (isSelected) {
      return {
        marginBottom: '2px',
        padding: '2px 0',
        position: 'relative' as const,
        backgroundColor: '#e3f2fd',
        borderLeft: '3px solid #2196f3',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      };
    } else {
      return {
        marginBottom: '2px',
        padding: '2px 0',
        position: 'relative' as const,
        backgroundColor: 'transparent',
        borderLeft: '3px solid transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      };
    }
  };

  return (
    <div 
      onClick={handleClick}
      style={getBlockStyle()}
    >
      {renderBlock()}
    </div>
  );
};

export default ContentBlockComponent;