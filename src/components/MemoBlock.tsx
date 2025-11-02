import React, { useState } from 'react';
import { MemoBlock as MemoBlockType, MemoDisplaySize, ImportanceLevel, ImportanceRange, Page } from '../types';
import ContextMenu from './ContextMenu';
import QuickNavModal from './QuickNavModal';
import styles from '../scss/components/MemoBlock.module.scss';
import {
  getImportanceStyle,
  renderHighlightedText,
  getSpacerHeight,
  isBlockVisible,
  getHighestImportanceLevel
} from './MemoBlock/utils/renderingUtils';
import { useMemoBlockDrag } from './MemoBlock/hooks/useMemoBlockDrag';
import { useMemoBlockState } from './MemoBlock/hooks/useMemoBlockState';
import { useMemoBlockHandlers } from './MemoBlock/hooks/useMemoBlockHandlers';

interface MemoBlockProps {
  memo: MemoBlockType;
  isSelected: boolean;
  isDragHovered?: boolean;
  onClick: (isShiftClick?: boolean) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onDisplaySizeChange?: (id: string, size: MemoDisplaySize) => void;
  onDetectCategoryOnDrop?: (memoId: string, position: { x: number; y: number }) => void;
  isConnecting?: boolean;
  connectingFromId?: string | null;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onDragStart?: (memoId: string) => void;
  onDragEnd?: () => void;
  enableImportanceBackground?: boolean;
  currentPage?: Page;
  isDraggingAnyMemo?: boolean;
  isShiftPressed?: boolean;
  onDelete?: (id: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onTitleUpdate?: (id: string, title: string) => void;
  onBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
}

const MemoBlock: React.FC<MemoBlockProps> = ({
  memo,
  isSelected,
  isDragHovered = false,
  onClick,
  onPositionChange,
  onSizeChange,
  onDisplaySizeChange,
  onDetectCategoryOnDrop,
  isConnecting,
  connectingFromId,
  onStartConnection,
  onConnectMemos,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 },
  activeImportanceFilters,
  showGeneralContent,
  enableImportanceBackground = false,
  onDragStart,
  onDragEnd,
  currentPage,
  isDraggingAnyMemo = false,
  isShiftPressed = false,
  onDelete,
  onAddQuickNav,
  isQuickNavExists,
  onTitleUpdate,
  onBlockUpdate
}) => {
  // 드래그 관련 상태 및 핸들러 (커스텀 훅)
  const {
    isDragging,
    isConnectionDragging,
    dragMoved,
    cursorPosition,
    handleMouseDown,
    handleConnectionPointMouseDown,
    handleConnectionPointMouseUp
  } = useMemoBlockDrag({
    memo,
    isConnecting,
    isDraggingAnyMemo,
    isShiftPressed,
    canvasScale,
    canvasOffset,
    currentPage,
    onPositionChange,
    onDetectCategoryOnDrop,
    onStartConnection,
    onConnectMemos,
    onDragStart,
    onDragEnd,
    connectingFromId
  });

  // 상태 관리 훅 사용
  const state = useMemoBlockState(memo);
  const {
    contextMenu,
    setContextMenu,
    showQuickNavModal,
    setShowQuickNavModal,
    isEditingTitle,
    setIsEditingTitle,
    editedTitle,
    setEditedTitle,
    titleInputRef,
    isEditingAllBlocks,
    setIsEditingAllBlocks,
    editedAllContent,
    setEditedAllContent,
    allContentTextareaRef: allBlocksInputRef,
    isScrolling,
    setIsScrolling,
    scrollTimeout,
    setScrollTimeout,
    isHovering,
    setIsHovering,
    memoRef
  } = state;

  // 핸들러 훅 사용
  const handlers = useMemoBlockHandlers({
    memo,
    isSelected,
    isEditingTitle,
    setIsEditingTitle,
    editedTitle,
    setEditedTitle,
    titleInputRef,
    isEditingAllBlocks,
    setIsEditingAllBlocks,
    editedAllContent,
    setEditedAllContent,
    allBlocksInputRef,
    setContextMenu,
    setShowQuickNavModal,
    setIsScrolling,
    scrollTimeout,
    setScrollTimeout,
    onTitleUpdate,
    onBlockUpdate,
    onAddQuickNav
  });

  const {
    handleContextMenu,
    handleQuickNavConfirm,
    handleTitleDoubleClick,
    handleTitleBlur,
    handleTitleKeyDown,
    handleAllBlocksDoubleClick,
    handleAllBlocksBlur,
    handleAllBlocksKeyDown,
    handleScroll
  } = handlers;

  // 크기별 스타일 정의
  const getSizeConfig = (size: MemoDisplaySize) => {
    switch (size) {
      case 'small':
        return {
          width: 180,
          maxHeight: 3000,
          showContent: false,
          showTags: true,
          contentLength: 0
        };
      case 'medium':
        return {
          width: 300,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 500
        };
      case 'large':
        return {
          width: 400,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 1000
        };
      default:
        return {
          width: 200,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 50
        };
    }
  };

  const sizeConfig = getSizeConfig(memo.displaySize || 'small');

  // 컨텍스트 메뉴 닫기
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, setContextMenu]);

  // 배경색은 항상 흰색 또는 선택 시 회색 (#f3f4f6)
  const backgroundColor = React.useMemo(() => {
    return isSelected ? '#f3f4f6' : 'white';
  }, [isSelected]);

  // 커스텀 스크롤바 스타일 추가
  React.useEffect(() => {
    const shouldShowScrollbar = isScrolling || isHovering;
    const style = document.createElement('style');
    style.textContent = `
      .memo-block-container {
        scrollbar-width: thin;
        scrollbar-color: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3) transparent' : 'transparent transparent'};
        transition: scrollbar-color 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar {
        width: 6px;
      }
      
      .memo-block-container::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb {
        background: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3)' : 'transparent'};
        border-radius: 3px;
        transition: background 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }
    `;
    
    const existingStyle = document.querySelector('#memo-block-scrollbar-styles');
    if (existingStyle) {
      existingStyle.textContent = style.textContent;
    } else {
      style.id = 'memo-block-scrollbar-styles';
      document.head.appendChild(style);
    }
  }, [isScrolling, isHovering]);

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []); // 의존성 배열을 빈 배열로 변경

  React.useEffect(() => {
    if (memoRef.current && onSizeChange) {
      let timeoutId: NodeJS.Timeout;

      const updateSize = () => {
        // 드래그 중일 때는 크기 업데이트 방지
        if (isDragging) {
          return;
        }

        if (memoRef.current) {
          const rect = memoRef.current.getBoundingClientRect();
          // 0이거나 매우 작은 크기는 무시 (컴포넌트가 사라지는 중일 수 있음)
          if (rect.width < 10 || rect.height < 10) {
            return;
          }

          // scale을 나누어서 실제 논리적 크기 계산
          const newSize = {
            width: Math.round(rect.width / canvasScale),
            height: Math.round(rect.height / canvasScale)
          };

          // 크기 변화가 충분히 클 때만 업데이트 (5px 이상 차이)
          if (!memo.size ||
              Math.abs(memo.size.width - newSize.width) > 5 ||
              Math.abs(memo.size.height - newSize.height) > 5) {
            // 디바운싱: 100ms 후에 업데이트
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              onSizeChange(memo.id, newSize);
            }, 100);
          }
        }
      };

      // 초기 크기 설정을 위한 지연 실행
      timeoutId = setTimeout(updateSize, 50);

      const resizeObserver = new ResizeObserver(() => {
        // ResizeObserver 콜백도 디바운싱
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateSize, 100);
      });

      if (memoRef.current) {
        resizeObserver.observe(memoRef.current);
      }

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    }
  }, [memo.title, memo.content, memo.tags, memo.blocks, memo.id, onSizeChange, canvasScale, isDragging]);

  return (
    <div
      className={styles.memoBlockWrapper}
      style={{
        transform: `translate3d(${memo.position.x}px, ${memo.position.y}px, 0)`,
        width: `${sizeConfig.width}px`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
    >
      {/* 메모 블록 콘텐츠 */}
      <div
        ref={memoRef}
        className={`${styles.memoBlockContainer} ${
          isDragging && isShiftPressed ? styles.shiftDragging :
          isDragHovered ? styles.dragHovered :
          isSelected ? styles.selected :
          styles.notSelected
        } ${isDragging ? styles.dragging : styles.notDragging}`}
        data-memo-block="true"
        onClick={(e) => {
          // 드래그로 이동했다면 클릭 이벤트를 무시
          if (!dragMoved) {
            onClick(e.shiftKey);
          }
        }}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={(e) => {
          // 연결 모드일 때 메모 블록 전체에서 연결 처리
          if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
            e.stopPropagation();
            onConnectMemos?.(connectingFromId, memo.id);
          }
        }}
        onScroll={handleScroll}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        draggable={false}
        style={{
          backgroundColor,
          width: `${sizeConfig.width}px`,
          maxHeight: `${sizeConfig.maxHeight}px`
        }}
      >
        <div className={styles.titleContainer}>
          <div
            onDoubleClick={handleTitleDoubleClick}
            className={`${styles.title} ${memo.title ? styles.withTitle : styles.withoutTitle} ${isSelected ? styles.editable : styles.notEditable}`}
          >
            {isDragging && isShiftPressed && (
              <span className={styles.shiftDragIcon}>+</span>
            )}
            {!isEditingTitle ? (
              <>📝 {memo.title || '제목을 입력해주세요'}</>
            ) : (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                className={styles.titleInput}
              />
            )}
          </div>
          {isSelected && (
            <div className={styles.sizeButtons}>
              {(['small', 'medium', 'large'] as MemoDisplaySize[]).map((size) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisplaySizeChange?.(memo.id, size);
                  }}
                  className={`${styles.sizeButton} ${memo.displaySize === size ? styles.active : styles.inactive}`}
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          )}
        </div>
        {sizeConfig.showTags && memo.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {memo.tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {sizeConfig.showContent && (
          <div
            onDoubleClick={handleAllBlocksDoubleClick}
            className={`${styles.contentContainer} ${isSelected ? styles.editable : styles.notEditable}`}
          >
            {isEditingAllBlocks ? (
              <textarea
                ref={allBlocksInputRef}
                value={editedAllContent}
                onChange={(e) => {
                  setEditedAllContent(e.target.value);
                  // 높이 자동 조절
                  if (allBlocksInputRef.current) {
                    allBlocksInputRef.current.style.height = 'auto';
                    allBlocksInputRef.current.style.height = allBlocksInputRef.current.scrollHeight + 'px';
                  }
                }}
                onBlur={handleAllBlocksBlur}
                onKeyDown={handleAllBlocksKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                className={styles.allBlocksTextarea}
              />
            ) : (
              <>
                {(() => {
                  if (!memo.blocks || memo.blocks.length === 0) {
                    return memo.content || '텍스트를 입력하세요...';
                  }

              // 기본 상태(모든 필터 활성화) 확인
              const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
              const isDefaultFilterState = (!activeImportanceFilters ||
                                          (activeImportanceFilters.size === allLevels.length &&
                                           allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                         showGeneralContent !== false;

              let totalContentLength = 0;
              const renderedBlocks: React.ReactNode[] = [];
              let consecutiveHiddenBlocks = 0; // 연속으로 숨겨진 블록 개수

              for (let index = 0; index < memo.blocks.length; index++) {
                const block = memo.blocks[index];

                if (totalContentLength >= sizeConfig.contentLength) {
                  renderedBlocks.push(<span key="more">...</span>);
                  break;
                }

                const blockVisible = isBlockVisible(block, activeImportanceFilters, showGeneralContent);

                if (blockVisible) {
                  // 연속으로 숨겨진 블록이 2개 이상일 때만 공백 표시
                  if (consecutiveHiddenBlocks >= 2) {
                    // 뒤에 더 표시될 블록이 있는지 확인
                    const hasVisibleBlocksAfter = memo.blocks.slice(index + 1).some(laterBlock => isBlockVisible(laterBlock, activeImportanceFilters, showGeneralContent));

                    if (hasVisibleBlocksAfter) {
                      const spacerHeight = getSpacerHeight(consecutiveHiddenBlocks);
                      renderedBlocks.push(
                        <div key={`spacer-${block.id}`} style={{
                          height: spacerHeight,
                          opacity: 0.3,
                          fontSize: '12px',
                          color: '#9ca3af',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ⋯
                        </div>
                      );
                    }
                  }

                  if (block.type === 'text') {
                    const content = block.content || '';
                    if (content.trim() === '') {
                      // 빈 텍스트 블록은 줄바꿈으로 표시
                      renderedBlocks.push(<br key={`${block.id}-${index}`} />);
                    } else {
                      const remainingLength = sizeConfig.contentLength - totalContentLength;
                      const displayContent = content.length > remainingLength
                        ? content.substring(0, remainingLength) + '...'
                        : content;

                      // importanceRanges 적용을 위해 TextBlock 타입으로 캐스팅
                      const textBlock = block as any;

                      // 기본 상태에서는 필터링 없이 원본 표시, 그 외에는 필터링 적용
                      const filteredResult = isDefaultFilterState
                        ? displayContent
                        : renderHighlightedText(displayContent, textBlock.importanceRanges, activeImportanceFilters, showGeneralContent);

                      // 실제 내용 렌더링
                      renderedBlocks.push(
                        <div
                          key={`${block.id}-${index}`}
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {isDefaultFilterState ? (
                            // 기본 상태에서는 하이라이팅 적용된 원본 표시
                            renderHighlightedText(displayContent, textBlock.importanceRanges, undefined, true)
                          ) : (
                            filteredResult
                          )}
                        </div>
                      );
                      totalContentLength += content.length;
                    }
                  } else if (block.type === 'image') {
                    const imageBlock = block as any;
                    if (imageBlock.url) {
                      const imageImportanceStyle = imageBlock.importance ? getImportanceStyle(imageBlock.importance) : {};
                      renderedBlocks.push(
                        <div key={`${block.id}-${index}`} style={{
                          margin: '4px 0',
                          padding: imageImportanceStyle.backgroundColor ? '8px' : '0',
                          backgroundColor: imageImportanceStyle.backgroundColor,
                          borderRadius: '4px',
                          border: (imageImportanceStyle as any).borderLeft
                        }}>
                          <img
                            src={imageBlock.url}
                            alt={imageBlock.alt || '이미지'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '60px',
                              borderRadius: '4px',
                              objectFit: 'cover'
                            }}
                          />
                          {imageBlock.caption && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                              {imageBlock.caption}
                            </div>
                          )}
                        </div>
                      );
                      totalContentLength += 50; // 이미지는 대략 50글자로 계산
                    }
                  } else if (block.type === 'file') {
                    const fileBlock = block as any;
                    const fileImportanceStyle = fileBlock.importance ? getImportanceStyle(fileBlock.importance) : {};
                    renderedBlocks.push(
                      <div key={block.id} style={{
                        margin: '4px 0',
                        padding: '6px 8px',
                        backgroundColor: fileImportanceStyle.backgroundColor || '#f8f9fa',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        border: (fileImportanceStyle as any).borderLeft || 'none'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fileBlock.name || '파일'}
                        </div>
                      </div>
                    );
                    totalContentLength += 30; // 파일은 대략 30글자로 계산
                  } else if (block.type === 'bookmark') {
                    const bookmarkBlock = block as any;
                    const bookmarkImportanceStyle = bookmarkBlock.importance ? getImportanceStyle(bookmarkBlock.importance) : {};
                    try {
                      const urlObj = new URL(bookmarkBlock.url);
                      renderedBlocks.push(
                        <div key={block.id} style={{
                          margin: '4px 0',
                          padding: '8px',
                          backgroundColor: bookmarkImportanceStyle.backgroundColor || '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: (bookmarkImportanceStyle as any).borderLeft || '1px solid #e0e0e0'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            🔗 {bookmarkBlock.title || urlObj.hostname}
                          </div>
                          {bookmarkBlock.description && (
                            <div style={{ fontSize: '11px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bookmarkBlock.description}
                            </div>
                          )}
                        </div>
                      );
                      totalContentLength += 40; // 북마크는 대략 40글자로 계산
                    } catch {
                      // URL 파싱 실패 시 기본 렌더링
                      renderedBlocks.push(
                        <div key={block.id} style={{
                          margin: '4px 0',
                          padding: '8px',
                          backgroundColor: bookmarkImportanceStyle.backgroundColor || '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: (bookmarkImportanceStyle as any).borderLeft || '1px solid #e0e0e0'
                        }}>
                          🔗 {bookmarkBlock.title || 'URL'}
                        </div>
                      );
                      totalContentLength += 20;
                    }
                  }

                  consecutiveHiddenBlocks = 0; // 보이는 블록 발견시 리셋
                } else {
                  consecutiveHiddenBlocks++; // 숨겨진 블록 카운트 증가
                }
              }

              return renderedBlocks.length > 0 ? renderedBlocks : '텍스트를 입력하세요...';
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* 연결점들 - 메모 블록 외부에 배치 */}
      <div
        className={`${styles.connectionPoint} ${styles.top}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.bottom}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.left}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.right}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>

      {/* 드래그 중 힌트 UI - 메모 상단에 표시 */}
      {isDragging && !isShiftPressed && (
        <div className={styles.dragHint}>
          SHIFT + 드래그로 메모나 카테고리를 다른 카테고리 영역에 종속, 제거하세요
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onDelete={() => {
          if (onDelete) {
            onDelete(memo.id);
          }
        }}
        onSetQuickNav={() => {
          // 중복 체크
          if (isQuickNavExists && isQuickNavExists(memo.id, 'memo')) {
            alert('이미 단축 이동이 설정되어 있습니다.');
            return;
          }
          setShowQuickNavModal(true);
        }}
      />

      {/* 단축 이동 이름 입력 모달 */}
      <QuickNavModal
        isOpen={showQuickNavModal}
        onClose={() => {
          setShowQuickNavModal(false);
        }}
        onConfirm={handleQuickNavConfirm}
        initialName={memo.title || '제목 없는 메모'}
      />
    </div>
  );
};

export default MemoBlock;