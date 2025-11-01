import React from 'react';
import ReactDOM from 'react-dom';
import { MemoBlock, ImportanceLevel, ImportanceRange, TextBlock } from '../../../types';

interface UseMultiBlockImportanceParams {
  selectedMemo: MemoBlock | null;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  saveToHistory: () => void;
}

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

export const useMultiBlockImportance = ({
  selectedMemo,
  onMemoUpdate,
  saveToHistory
}: UseMultiBlockImportanceParams) => {
  const [showImportanceMenu, setShowImportanceMenu] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [selectedBlocks, setSelectedBlocks] = React.useState<Array<{
    blockId: string;
    start: number;
    end: number;
  }>>([]);

  const menuRef = React.useRef<HTMLDivElement>(null);

  // 전역 텍스트 선택 감지
  const handleGlobalTextSelection = React.useCallback(() => {
    if (!selectedMemo) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setShowImportanceMenu(false);
      setSelectedBlocks([]);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    // 선택된 텍스트가 너무 짧으면 무시
    if (selectedText.trim().length === 0) {
      setShowImportanceMenu(false);
      setSelectedBlocks([]);
      return;
    }

    // 선택 범위에 포함된 모든 블록 찾기
    const blocksInSelection: Array<{
      blockId: string;
      start: number;
      end: number;
    }> = [];

    // 모든 TextBlock 요소 순회
    selectedMemo.blocks.forEach(block => {
      if (block.type !== 'text') return;

      const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
      if (!blockElement) return;

      const textarea = blockElement.querySelector('textarea');
      if (!textarea) return;

      // 이 블록이 선택 범위에 포함되는지 확인
      if (selection.containsNode(blockElement, true)) {
        // 블록 전체 텍스트
        const blockText = (block as TextBlock).content;

        // 선택된 텍스트에서 이 블록의 텍스트가 어디에 있는지 찾기
        let start = 0;
        let end = blockText.length;

        // 시작점과 끝점 계산
        if (range.startContainer.parentElement?.closest('[data-block-id]') === blockElement) {
          // 선택 시작이 이 블록 안에 있음
          const startOffset = getTextOffsetInTextarea(textarea, range.startContainer, range.startOffset);
          if (startOffset !== -1) {
            start = startOffset;
          }
        }

        if (range.endContainer.parentElement?.closest('[data-block-id]') === blockElement) {
          // 선택 끝이 이 블록 안에 있음
          const endOffset = getTextOffsetInTextarea(textarea, range.endContainer, range.endOffset);
          if (endOffset !== -1) {
            end = endOffset;
          }
        }

        if (start < end) {
          blocksInSelection.push({
            blockId: block.id,
            start,
            end
          });
        }
      }
    });

    if (blocksInSelection.length === 0) {
      setShowImportanceMenu(false);
      setSelectedBlocks([]);
      return;
    }

    // 선택 범위 저장
    setSelectedBlocks(blocksInSelection);

    // 메뉴 위치 계산
    const rect = range.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 280;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = rect.right + 10;
    let y = rect.top;

    // 오른쪽 경계 체크
    if (x + menuWidth > viewportWidth) {
      x = rect.left - menuWidth - 10;
    }

    // 왼쪽 경계 체크
    if (x < 10) {
      x = 10;
    }

    // 아래쪽 경계 체크
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    // 위쪽 경계 체크
    if (y < 10) {
      y = 10;
    }

    setMenuPosition({ x, y });
    setShowImportanceMenu(true);
  }, [selectedMemo]);

  // textarea 내에서 텍스트 오프셋 계산
  const getTextOffsetInTextarea = (
    textarea: HTMLTextAreaElement,
    container: Node,
    offset: number
  ): number => {
    // textarea인 경우 직접 selectionStart 사용
    if (container === textarea) {
      return textarea.selectionStart;
    }

    // textarea의 텍스트 노드인 경우
    if (container.nodeType === Node.TEXT_NODE && container.parentElement === textarea) {
      return offset;
    }

    return -1;
  };

  // 중요도 적용
  const applyImportance = React.useCallback((level: ImportanceLevel) => {
    if (!selectedMemo || selectedBlocks.length === 0) return;

    const updatedBlocks = selectedMemo.blocks.map(block => {
      if (block.type !== 'text') return block;

      const textBlock = block as TextBlock;
      const selectionInfo = selectedBlocks.find(s => s.blockId === block.id);

      if (!selectionInfo) return block;

      // 기존 중요도 범위
      const ranges = textBlock.importanceRanges || [];
      const newRange: ImportanceRange = {
        start: selectionInfo.start,
        end: selectionInfo.end,
        level: level
      };

      let updatedRanges: ImportanceRange[];

      if (level === 'none') {
        // 강조 해제
        updatedRanges = [];
        ranges.forEach(range => {
          if (range.end <= selectionInfo.start || range.start >= selectionInfo.end) {
            updatedRanges.push(range);
          } else {
            if (range.start < selectionInfo.start) {
              updatedRanges.push({
                start: range.start,
                end: selectionInfo.start,
                level: range.level
              });
            }
            if (range.end > selectionInfo.end) {
              updatedRanges.push({
                start: selectionInfo.end,
                end: range.end,
                level: range.level
              });
            }
          }
        });
      } else {
        // 강조 적용
        updatedRanges = [];
        ranges.forEach(range => {
          if (range.end <= selectionInfo.start || range.start >= selectionInfo.end) {
            updatedRanges.push(range);
          } else {
            if (range.start < selectionInfo.start) {
              updatedRanges.push({
                start: range.start,
                end: selectionInfo.start,
                level: range.level
              });
            }
            if (range.end > selectionInfo.end) {
              updatedRanges.push({
                start: selectionInfo.end,
                end: range.end,
                level: range.level
              });
            }
          }
        });
        updatedRanges.push(newRange);
      }

      return {
        ...textBlock,
        importanceRanges: updatedRanges
      };
    });

    // 메모 업데이트
    onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });

    // 히스토리 저장
    setTimeout(() => saveToHistory(), 50);

    // 메뉴 닫기
    setShowImportanceMenu(false);
    setSelectedBlocks([]);

    // 선택 해제
    window.getSelection()?.removeAllRanges();
  }, [selectedMemo, selectedBlocks, onMemoUpdate, saveToHistory]);

  // 메뉴 외부 클릭 감지
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowImportanceMenu(false);
        setSelectedBlocks([]);
      }
    };

    if (showImportanceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showImportanceMenu]);

  // mouseup 이벤트로 텍스트 선택 감지
  React.useEffect(() => {
    const handleMouseUp = () => {
      // 약간의 지연을 두고 선택 상태 확인 (브라우저가 선택을 완료할 시간을 줌)
      setTimeout(() => {
        handleGlobalTextSelection();
      }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleGlobalTextSelection]);

  // 중요도 메뉴 렌더링
  const renderImportanceMenu = () => {
    if (!showImportanceMenu) return null;

    const menu = (
      <div
        ref={menuRef}
        data-importance-menu
        style={{
          position: 'fixed',
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
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
      </div>
    );

    return ReactDOM.createPortal(menu, document.body);
  };

  return {
    renderImportanceMenu
  };
};
