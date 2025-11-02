import React from 'react';
import { MemoBlock } from '../../../types';

interface UseDragSelectionProps {
  selectedMemo: MemoBlock | null;
  selectedBlocks: string[];
  setSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  dragSelectedBlocks: string[];
  setDragSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  dragJustCompleted: boolean;
  setDragJustCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  blocksContainerRef: React.RefObject<HTMLDivElement | null>;
  rightPanelRef: React.RefObject<HTMLDivElement | null>;
}

export const useDragSelection = ({
  selectedMemo,
  selectedBlocks,
  setSelectedBlocks,
  dragSelectedBlocks,
  setDragSelectedBlocks,
  dragJustCompleted,
  setDragJustCompleted,
  blocksContainerRef,
  rightPanelRef
}: UseDragSelectionProps) => {
  const [isDragSelecting, setIsDragSelecting] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = React.useState({ x: 0, y: 0 });
  const [dragHoveredBlocks, setDragHoveredBlocks] = React.useState<string[]>([]);
  const [isDragMoved, setIsDragMoved] = React.useState(false);

  const handleBlockClick = React.useCallback((blockId: string, event: React.MouseEvent) => {
    // 드래그가 아닌 클릭으로 선택하는 경우 dragSelectedBlocks 초기화
    setDragSelectedBlocks([]);

    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // Shift/Ctrl/Cmd + 클릭: 다중 선택
      setSelectedBlocks(prev =>
        prev.includes(blockId)
          ? prev.filter(id => id !== blockId)
          : [...prev, blockId]
      );
    } else {
      // 일반 클릭: 단일 선택
      setSelectedBlocks([blockId]);
    }
  }, [setSelectedBlocks, setDragSelectedBlocks]);

  const handleMouseDown = React.useCallback((event: React.MouseEvent) => {
    // 버튼이나 인터랙티브 요소가 아닌 곳에서 드래그 시작
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.tagName === 'BUTTON' ||
                                target.tagName === 'INPUT' ||
                                target.tagName === 'TEXTAREA' ||
                                target.closest('button') !== null ||
                                target.closest('textarea') !== null ||
                                target.closest('.ProseMirror') !== null;

    // 오른쪽 패널 전체에서 드래그 허용 (블록 편집 모드일 때만)
    const isInRightPanel = rightPanelRef.current?.contains(target) ||
                           blocksContainerRef.current?.contains(target);
    const isNotInBlockContent = !target.closest('[data-block-id]') ||
                               target.style.cursor === 'crosshair' ||
                               target.classList.contains('drag-zone');

    // Ctrl 키를 누르고 있으면 블록 내부에서도 드래그 선택 허용
    const allowBlockSelection = event.ctrlKey || event.metaKey;

    if (!isInteractiveElement && isInRightPanel && (isNotInBlockContent || allowBlockSelection) &&
        selectedMemo && !event.shiftKey) {
      event.preventDefault();

      // 블록 컨테이너가 있으면 그것 기준으로, 없으면 오른쪽 패널 기준으로 좌표 계산
      const container = blocksContainerRef.current || rightPanelRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const startPos = {
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        };

        setIsDragSelecting(true);
        setIsDragMoved(false);
        setDragStart(startPos);
        setDragEnd(startPos);
        setDragHoveredBlocks([]);
      }
    }
  }, [selectedMemo, blocksContainerRef, rightPanelRef]);

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (isDragSelecting) {
      const container = blocksContainerRef.current || rightPanelRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const currentPos = {
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        };

        // 드래그 임계값 확인
        const dragDistance = Math.sqrt(
          Math.pow(currentPos.x - dragStart.x, 2) +
          Math.pow(currentPos.y - dragStart.y, 2)
        );

        if (dragDistance > 5) {
          setIsDragMoved(true);
        }

        setDragEnd(currentPos);

        // 선택 영역 계산
        const selectionRect = {
          left: Math.min(dragStart.x, currentPos.x),
          top: Math.min(dragStart.y, currentPos.y),
          right: Math.max(dragStart.x, currentPos.x),
          bottom: Math.max(dragStart.y, currentPos.y)
        };

        // 드래그 영역에 있는 블록들 실시간으로 하이라이트
        if (selectedMemo?.blocks && blocksContainerRef.current) {
          const blocksContainer = blocksContainerRef.current;
          const blockElements = blocksContainer.querySelectorAll('[data-block-id]');
          const blocksContainerRect = blocksContainer.getBoundingClientRect();
          const hoveredIds: string[] = [];
          const seenIds = new Set<string>();

          blockElements.forEach(element => {
            const blockRect = element.getBoundingClientRect();
            const relativeBlockRect = {
              left: blockRect.left - blocksContainerRect.left,
              top: blockRect.top - blocksContainerRect.top,
              right: blockRect.right - blocksContainerRect.left,
              bottom: blockRect.bottom - blocksContainerRect.top
            };

            // 드래그 영역이 다른 컨테이너에서 시작된 경우 좌표 변환
            const dragOffsetX = containerRect.left - blocksContainerRect.left;
            const dragOffsetY = containerRect.top - blocksContainerRect.top;
            const adjustedSelectionRect = {
              left: selectionRect.left + dragOffsetX,
              top: selectionRect.top + dragOffsetY,
              right: selectionRect.right + dragOffsetX,
              bottom: selectionRect.bottom + dragOffsetY
            };

            // 블록이 선택 영역과 겹치는지 확인
            if (relativeBlockRect.right >= adjustedSelectionRect.left &&
                relativeBlockRect.left <= adjustedSelectionRect.right &&
                relativeBlockRect.bottom >= adjustedSelectionRect.top &&
                relativeBlockRect.top <= adjustedSelectionRect.bottom) {
              const blockId = element.getAttribute('data-block-id');
              if (blockId && !seenIds.has(blockId)) {
                seenIds.add(blockId);
                hoveredIds.push(blockId);
              }
            }
          });

          setDragHoveredBlocks(hoveredIds);
        }
      }
    }
  }, [isDragSelecting, dragStart, selectedMemo?.blocks, blocksContainerRef, rightPanelRef]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragSelecting) {
      if (isDragMoved) {
        // 실제 드래그가 일어난 경우에만 선택 적용
        const selectedIds = [...dragHoveredBlocks];
        setSelectedBlocks(selectedIds);
        setDragSelectedBlocks(selectedIds);

        // 드래그 완료 직후 플래그 설정
        setDragJustCompleted(true);
        setTimeout(() => {
          setDragJustCompleted(false);
        }, 200);
      }

      // 드래그 상태 초기화
      setIsDragSelecting(false);
      setIsDragMoved(false);
      setDragHoveredBlocks([]);
    }
  }, [isDragSelecting, isDragMoved, dragHoveredBlocks, setSelectedBlocks, setDragSelectedBlocks, setDragJustCompleted]);

  const handleMemoAreaClick = React.useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // 버튼이나 중요한 인터랙티브 요소만 제외
    const isButton = target.tagName === 'BUTTON' || target.closest('button') !== null;
    const isImportanceMenu = target.closest('[data-importance-menu]') !== null;
    const isClickedTextarea = target.tagName === 'TEXTAREA';
    const isClickedInput = target.tagName === 'INPUT';

    // 드래그 완료 직후에는 클릭 이벤트 무시
    if (dragJustCompleted) {
      return;
    }

    if (!isButton && !isImportanceMenu && !isClickedInput && selectedMemo?.blocks) {
      // 선택된 블록 위를 클릭한 경우인지 확인
      const clickedBlockElement = target.closest('[data-block-id]');
      const clickedBlockId = clickedBlockElement?.getAttribute('data-block-id');

      if (selectedBlocks.length > 0) {
        // 선택된 블록 중 하나를 클릭한 경우 - 선택 유지
        if (clickedBlockId && selectedBlocks.includes(clickedBlockId)) {
          return;
        }

        // 다른 블록을 클릭하거나 빈 공간을 클릭한 경우 - 선택 해제
        setSelectedBlocks([]);
        setDragSelectedBlocks([]);

        // 다른 블록을 클릭한 경우에는 해당 블록 선택하지 않고 여기서 종료
        if (clickedBlockId) {
          return;
        }
      }

      // 클릭 위치에서 가장 가까운 블록 찾기
      const clickY = event.clientY;
      const clickX = event.clientX;
      const container = blocksContainerRef.current;

      if (container) {
        const blockElements = container.querySelectorAll('[data-block-id]');

        if (blockElements.length === 0) {
          return;
        }

        type ClosestBlockType = { element: HTMLElement; distance: number; blockId: string };
        let closestBlock: ClosestBlockType | null = null;

        blockElements.forEach(element => {
          const rect = element.getBoundingClientRect();

          // 블록의 중심점과 클릭 위치의 거리 계산
          const blockCenterX = rect.left + rect.width / 2;
          const blockCenterY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(clickX - blockCenterX, 2) +
            Math.pow(clickY - blockCenterY, 2)
          );

          if (!closestBlock || distance < closestBlock.distance) {
            const blockId = element.getAttribute('data-block-id');
            if (blockId) {
              const newClosestBlock: ClosestBlockType = {
                element: element as HTMLElement,
                distance,
                blockId
              };
              closestBlock = newClosestBlock;
            }
          }
        });

        // 가장 가까운 블록의 텍스트 영역에 포커스
        if (closestBlock) {
          const blockElement = (closestBlock as ClosestBlockType).element;
          const textarea = blockElement.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            setTimeout(() => {
              textarea.focus();
              const length = textarea.value.length;
              textarea.setSelectionRange(length, length);
            }, 50);
          }
        }
      }
    }
  }, [dragJustCompleted, selectedMemo?.blocks, selectedBlocks, blocksContainerRef, setSelectedBlocks, setDragSelectedBlocks]);

  // 마우스 이벤트 리스너 등록
  React.useEffect(() => {
    if (isDragSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragSelecting, handleMouseMove, handleMouseUp]);

  return {
    isDragSelecting,
    isDragMoved,
    dragStart,
    dragEnd,
    dragHoveredBlocks,
    handleBlockClick,
    handleMouseDown,
    handleMemoAreaClick
  };
};
