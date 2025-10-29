import React from 'react';
import { MemoBlock } from '../../../types';

export interface UseBlockDragProps {
  selectedMemo: MemoBlock | null;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  blocksContainerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseBlockDragReturn {
  isDraggingBlock: boolean;
  draggedBlockId: string | null;
  dropTargetIndex: number | null;
  dragStartY: number;
  currentDragY: number;
  dragPreviewPosition: { x: number; y: number };
  handleBlockDragStart: (e: React.MouseEvent, blockId: string) => void;
}

/**
 * 블록 드래그 앤 드롭 훅
 *
 * RightPanel에서 블록을 드래그하여 순서를 변경하는 기능을 제공합니다.
 *
 * **기능:**
 * - 블록 드래그 시작, 이동, 종료 처리
 * - 드래그 프리뷰 위치 계산
 * - 드롭 타겟 인덱스 계산 (마우스 커서와 가장 가까운 경계 찾기)
 * - 블록 순서 변경 및 저장
 */
export const useBlockDrag = ({
  selectedMemo,
  onMemoUpdate,
  blocksContainerRef
}: UseBlockDragProps): UseBlockDragReturn => {
  // 블록 드래그 앤 드롭 상태
  const [isDraggingBlock, setIsDraggingBlock] = React.useState(false);
  const [draggedBlockId, setDraggedBlockId] = React.useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = React.useState<number | null>(null);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [currentDragY, setCurrentDragY] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 }); // 드래그 시작 시 마우스와 블록의 상대 위치
  const [dragPreviewPosition, setDragPreviewPosition] = React.useState({ x: 0, y: 0 }); // 드래그 프리뷰 절대 위치

  const handleBlockDragStart = React.useCallback((e: React.MouseEvent, blockId: string) => {
    // 텍스트 선택 중이거나 입력 중일 때는 드래그 금지
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    e.preventDefault();

    // 드래그하는 블록 요소 찾기
    const blockElement = target.closest('[data-block-id]') as HTMLElement;
    if (!blockElement) return;

    const rect = blockElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setIsDraggingBlock(true);
    setDraggedBlockId(blockId);
    setDragStartY(e.clientY);
    setCurrentDragY(e.clientY);
    setDragOffset({ x: offsetX, y: offsetY });
    setDragPreviewPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  }, []);

  // 블록 드래그 중
  const handleBlockDragMove = React.useCallback((e: MouseEvent) => {
    if (!isDraggingBlock || !draggedBlockId || !selectedMemo?.blocks) return;

    setCurrentDragY(e.clientY);

    // 드래그 프리뷰 위치 업데이트
    const previewX = e.clientX - dragOffset.x;
    const previewY = e.clientY - dragOffset.y;
    setDragPreviewPosition({ x: previewX, y: previewY });

    // 드롭 타겟 인덱스 계산 - 마우스 커서와 가장 가까운 경계
    const container = blocksContainerRef.current;
    if (!container) return;

    const blockElements = Array.from(container.querySelectorAll('[data-block-id]'));
    const draggedIndex = selectedMemo.blocks.findIndex(b => b.id === draggedBlockId);

    // 마우스 커서 Y 좌표
    const mouseY = e.clientY;

    // 모든 블록 경계 위치 수집 (위쪽과 아래쪽)
    const boundaries: { index: number; y: number }[] = [];

    blockElements.forEach((element, i) => {
      const rect = element.getBoundingClientRect();
      // 블록 위쪽 경계
      boundaries.push({ index: i, y: rect.top });
      // 블록 아래쪽 경계 (다음 삽입 위치)
      boundaries.push({ index: i + 1, y: rect.bottom });
    });

    // 마우스 커서에서 가장 가까운 경계 찾기
    let targetIndex = 0;
    let minDistance = Infinity;

    boundaries.forEach(boundary => {
      const distance = Math.abs(mouseY - boundary.y);
      if (distance < minDistance) {
        minDistance = distance;
        targetIndex = boundary.index;
      }
    });

    // 자기 자신의 원래 위치로 돌아가는 경우만 null로 설정 (이동 없음을 의미)
    if (targetIndex === draggedIndex || targetIndex === draggedIndex + 1) {
      setDropTargetIndex(null);
    } else {
      setDropTargetIndex(targetIndex);
    }
  }, [isDraggingBlock, draggedBlockId, selectedMemo?.blocks, dragOffset, blocksContainerRef]);

  // 블록 드래그 종료
  const handleBlockDragEnd = React.useCallback(() => {
    if (!isDraggingBlock || !draggedBlockId || !selectedMemo?.blocks || dropTargetIndex === null) {
      setIsDraggingBlock(false);
      setDraggedBlockId(null);
      setDropTargetIndex(null);
      return;
    }

    const blocks = [...selectedMemo.blocks];
    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const draggedBlock = blocks[draggedIndex];

    // 블록 제거
    blocks.splice(draggedIndex, 1);

    // 새 위치에 삽입 (드래그한 블록이 제거되었으므로 인덱스 조정)
    let insertIndex = dropTargetIndex;
    if (dropTargetIndex > draggedIndex) {
      insertIndex = dropTargetIndex - 1;
    }

    blocks.splice(insertIndex, 0, draggedBlock);

    onMemoUpdate(selectedMemo.id, { blocks });

    // 상태 초기화
    setIsDraggingBlock(false);
    setDraggedBlockId(null);
    setDropTargetIndex(null);
  }, [isDraggingBlock, draggedBlockId, selectedMemo, dropTargetIndex, onMemoUpdate]);

  // 드래그 이벤트 리스너 등록
  React.useEffect(() => {
    if (isDraggingBlock) {
      window.addEventListener('mousemove', handleBlockDragMove);
      window.addEventListener('mouseup', handleBlockDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleBlockDragMove);
        window.removeEventListener('mouseup', handleBlockDragEnd);
      };
    }
  }, [isDraggingBlock, handleBlockDragMove, handleBlockDragEnd]);

  return {
    isDraggingBlock,
    draggedBlockId,
    dropTargetIndex,
    dragStartY,
    currentDragY,
    dragPreviewPosition,
    handleBlockDragStart
  };
};
