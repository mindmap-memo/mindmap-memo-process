import React, { useState, useRef } from 'react';
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
import SheetsBlockComponent from './blocks/SheetsBlock';

interface ContentBlockProps {
  block: ContentBlock;
  isEditing?: boolean;
  isSelected?: boolean;
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
  onFocusPrevious?: (blockId: string) => void;
  onFocusNext?: (blockId: string) => void;
  onBlockClick?: (blockId: string, event: React.MouseEvent) => void;
  onMergeWithPrevious?: (blockId: string, content: string) => void;
  onBlockSelect?: (blockId: string) => void;
}

const ContentBlockComponent: React.FC<ContentBlockProps> = ({ 
  block, 
  isEditing = false,
  isSelected = false,
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
  onFocusPrevious,
  onFocusNext,
  onBlockClick,
  onMergeWithPrevious,
  onBlockSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{left?: string, right?: string}>({left: '-100px'});
  const blockRef = useRef<HTMLDivElement>(null);
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
        return <TableBlockComponent {...commonProps} block={block as any} pageId={pageId} memoId={memoId} />;
      case 'sheets':
        return <SheetsBlockComponent 
          block={block as any} 
          onUpdate={onUpdate}
          onDelete={() => onDelete?.(block.id)}
          isSelected={isSelected} 
          onSelect={() => onBlockSelect?.(block.id)}
          onCreateNewBlock={onCreateNewBlock}
          onCreateTableBlock={(tableData) => {
            // 구글 시트 데이터로 새 테이블 블록 생성
            if (onUpdate) {
              // 현재 블록 위치를 찾고 바로 뒤에 새 테이블 블록 추가
              const tableBlock = {
                id: `table-${Date.now()}`,
                type: 'table' as const,
                headers: tableData.headers,
                rows: tableData.rows,
                columns: tableData.columns || [], // 감지된 컬럼 정보
                cells: tableData.cells || []      // 생성된 셀 데이터
              };
              
              // 부모 컴포넌트에 새 블록을 추가하라고 신호를 보냄
              (window as any).createTableAfterBlock = {
                afterBlockId: block.id,
                tableBlock: tableBlock
              };
              
              alert('시트 데이터가 테이블 블록으로 생성되었습니다!');
            }
          }}
        />;
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
      ref={blockRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={getBlockStyle()}
    >
      {/* 세로 라인 호버 영역 - 보이지 않지만 마우스 감지용 */}
      <div
        style={{
          position: 'absolute',
          left: '-40px',
          top: '0',
          width: '30px',
          height: '100%',
          zIndex: 5
        }}
        onMouseEnter={handleHandleAreaMouseEnter}
        onMouseLeave={handleHandleAreaMouseLeave}
      />

      {/* 드래그 핸들 버튼 */}
      {(isHovered || showMenu) && (
        <div
          style={{
            position: 'absolute',
            left: '-30px',
            top: '4px', // 블록 왼쪽 위에 고정
            width: '20px',
            height: '20px',
            backgroundColor: showMenu ? '#f5f5f5' : 'white',
            border: showMenu ? '1px solid #999' : '1px solid #ddd',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onClick={handleDragHandleClick}
          onMouseEnter={(e) => {
            const element = e.currentTarget as HTMLElement;
            element.style.backgroundColor = '#f5f5f5';
            element.style.borderColor = '#999';
            handleHandleAreaMouseEnter();
          }}
          onMouseLeave={(e) => {
            const element = e.currentTarget as HTMLElement;
            element.style.backgroundColor = showMenu ? '#f5f5f5' : 'white';
            element.style.borderColor = showMenu ? '#999' : '#ddd';
          }}
        >
          <DragHandleIcon />
        </div>
      )}

      {/* 메뉴 */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            ...menuPosition, // 동적으로 계산된 위치 적용
            top: '26px', // 드래그 핸들 바로 아래에 위치
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000, // z-index 높이기
            minWidth: '90px',
            overflow: 'visible'
          }}
          onMouseEnter={handleHandleAreaMouseEnter}
          onMouseLeave={handleHandleAreaMouseLeave}
        >
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              borderBottom: '1px solid #eee'
            }}
            onClick={() => handleMenuAction('duplicate')}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'white';
            }}
          >
            복제
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#dc3545'
            }}
            onClick={() => handleMenuAction('delete')}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'white';
            }}
          >
            삭제
          </div>
        </div>
      )}

      {/* 메뉴가 열려있을 때 바깥 클릭 감지용 오버레이 */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 15
          }}
          onClick={() => setShowMenu(false)}
        />
      )}

      {renderBlock()}
    </div>
  );
};

export default ContentBlockComponent;