import React from 'react';
import { MemoBlock, ContentBlock, ContentBlockType, TextBlock, ImportanceLevel } from '../../../types';

interface UseContextMenuProps {
  selectedMemo: MemoBlock | null;
  selectedBlocks: string[];
  setSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  dragSelectedBlocks: string[];
  setDragSelectedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  showContextMenu: boolean;
  setShowContextMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showEmptySpaceMenu: boolean;
  setShowEmptySpaceMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setClickedPosition: React.Dispatch<React.SetStateAction<number | null>>;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  createNewBlock: (type: ContentBlockType) => ContentBlock;
  saveToHistory: () => void;
}

export const useContextMenu = ({
  selectedMemo,
  selectedBlocks,
  setSelectedBlocks,
  dragSelectedBlocks,
  setDragSelectedBlocks,
  showContextMenu,
  setShowContextMenu,
  showEmptySpaceMenu,
  setShowEmptySpaceMenu,
  setClickedPosition,
  onMemoUpdate,
  createNewBlock,
  saveToHistory
}: UseContextMenuProps) => {
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
  const [emptySpaceMenuPosition, setEmptySpaceMenuPosition] = React.useState({ x: 0, y: 0 });

  const handleEmptySpaceContextMenuInternal = React.useCallback((clientX: number, clientY: number, targetElement: HTMLElement) => {
    // 컨텍스트 메뉴 자체를 클릭한 경우 무시
    if (targetElement.closest('[data-context-menu]')) {
      return;
    }

    // 블록 위에서 클릭한 경우
    if (targetElement.closest('[data-block-id]')) {
      return;
    }

    // 블록 컨테이너 내부에서 클릭한 경우
    if (targetElement.closest('.blocks-container')) {
      return;
    }

    // 태그나 다른 입력 요소 위에서 클릭한 경우
    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'BUTTON') {
      return;
    }

    // 패널의 빈 공간이 아닌 경우
    if (!targetElement.closest('.right-panel-content')) {
      return;
    }

    // 맨 끝에 블록 추가
    const insertPosition = selectedMemo?.blocks?.length || 0;
    setClickedPosition(insertPosition);

    setEmptySpaceMenuPosition({ x: clientX, y: clientY });
    setShowEmptySpaceMenu(true);
  }, [selectedMemo, setClickedPosition, setShowEmptySpaceMenu]);

  const handleEmptySpaceContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX;
    const clientY = e.clientY;
    const target = e.target as HTMLElement;

    // 컨텍스트 메뉴가 이미 열려있으면 먼저 닫기
    if (showContextMenu || showEmptySpaceMenu) {
      setShowContextMenu(false);
      setShowEmptySpaceMenu(false);
      setTimeout(() => {
        handleEmptySpaceContextMenuInternal(clientX, clientY, target);
      }, 10);
      return;
    }

    handleEmptySpaceContextMenuInternal(clientX, clientY, target);
  }, [showContextMenu, showEmptySpaceMenu, setShowContextMenu, setShowEmptySpaceMenu, handleEmptySpaceContextMenuInternal]);

  const handleBlockContextMenuInternal = React.useCallback((clientX: number, clientY: number, targetElement: HTMLElement) => {
    // 컨텍스트 메뉴 자체를 클릭한 경우 무시
    if (targetElement.closest('[data-context-menu]')) {
      return;
    }

    const blockElement = targetElement.closest('[data-block-id]') as HTMLElement;

    let blocksToUse = selectedBlocks.length > 0 ? selectedBlocks : dragSelectedBlocks;

    // 우클릭한 위치에 블록이 있고, 그 블록이 선택되지 않은 경우 해당 블록을 선택
    if (blockElement) {
      const clickedBlockId = blockElement.getAttribute('data-block-id');
      if (clickedBlockId && !blocksToUse.includes(clickedBlockId)) {
        blocksToUse = [clickedBlockId];
        setSelectedBlocks([clickedBlockId]);
        setDragSelectedBlocks([]);
      }
    }

    if (blocksToUse.length === 0) return;

    // 메뉴 크기 추정
    const menuWidth = 150;
    const menuHeight = 120;
    const submenuWidth = 140;
    const submenuHeight = 260;

    // 화면 크기
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 초기 위치
    let x = clientX;
    let y = clientY;

    // 경계 체크
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    if (x < 10) {
      x = 10;
    }

    if (y + Math.max(menuHeight, submenuHeight) > viewportHeight) {
      y = viewportHeight - Math.max(menuHeight, submenuHeight) - 10;
    }

    if (y < 10) {
      y = 10;
    }

    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  }, [selectedBlocks, dragSelectedBlocks, setSelectedBlocks, setDragSelectedBlocks, setShowContextMenu]);

  const handleBlockContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX;
    const clientY = e.clientY;
    const target = e.target as HTMLElement;

    // 컨텍스트 메뉴가 이미 열려있으면 먼저 닫기
    if (showContextMenu || showEmptySpaceMenu) {
      setShowContextMenu(false);
      setShowEmptySpaceMenu(false);
      setTimeout(() => {
        handleBlockContextMenuInternal(clientX, clientY, target);
      }, 10);
      return;
    }

    handleBlockContextMenuInternal(clientX, clientY, target);
  }, [showContextMenu, showEmptySpaceMenu, setShowContextMenu, setShowEmptySpaceMenu, handleBlockContextMenuInternal]);

  const handleBlocksDelete = React.useCallback(() => {
    if (selectedMemo && selectedBlocks.length > 0) {
      saveToHistory();
      const updatedBlocks = selectedMemo.blocks?.filter(block =>
        !selectedBlocks.includes(block.id)
      ) || [];

      // 최소 하나의 블록은 유지
      if (updatedBlocks.length === 0) {
        const newBlock = createNewBlock('text');
        updatedBlocks.push(newBlock);
      }

      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
      setSelectedBlocks([]);
    }
  }, [selectedMemo, selectedBlocks, onMemoUpdate, setSelectedBlocks, createNewBlock, saveToHistory]);

  const handleDeleteSelectedBlocks = React.useCallback(() => {
    handleBlocksDelete();
    setShowContextMenu(false);
  }, [handleBlocksDelete, setShowContextMenu]);

  const handleApplyImportance = React.useCallback((level: ImportanceLevel) => {
    if (!selectedMemo) return;

    saveToHistory();
    const blocksToUpdate = selectedBlocks.length > 0 ? selectedBlocks : dragSelectedBlocks;
    const updatedBlocks = selectedMemo.blocks?.map(block => {
      if (blocksToUpdate.includes(block.id)) {
        // 텍스트 블록인 경우 전체 텍스트에 중요도 범위 적용
        if (block.type === 'text') {
          const textBlock = block as TextBlock;
          const content = textBlock.content || '';
          return {
            ...textBlock,
            importanceRanges: [{
              start: 0,
              end: content.length,
              level
            }]
          };
        }
      }
      return block;
    }) || [];

    onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    setShowContextMenu(false);
  }, [selectedMemo, selectedBlocks, dragSelectedBlocks, onMemoUpdate, setShowContextMenu, saveToHistory]);

  const handleBlocksMove = React.useCallback((direction: 'up' | 'down') => {
    if (selectedMemo && selectedBlocks.length > 0) {
      const blocks = [...(selectedMemo.blocks || [])];
      const selectedIndices = selectedBlocks
        .map(id => blocks.findIndex(b => b.id === id))
        .filter(index => index !== -1)
        .sort((a, b) => a - b);

      if (direction === 'up' && selectedIndices[0] > 0) {
        // 위로 이동
        selectedIndices.reverse().forEach(index => {
          [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
        });
      } else if (direction === 'down' && selectedIndices[selectedIndices.length - 1] < blocks.length - 1) {
        // 아래로 이동
        selectedIndices.forEach(index => {
          [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        });
      }

      onMemoUpdate(selectedMemo.id, { blocks });
    }
  }, [selectedMemo, selectedBlocks, onMemoUpdate]);

  const addNewBlock = React.useCallback((type: ContentBlockType) => {
    if (selectedMemo) {
      const newBlock: ContentBlock = createNewBlock(type);
      const updatedBlocks = [...(selectedMemo.blocks || []), newBlock];
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  }, [selectedMemo, onMemoUpdate, createNewBlock]);

  // 빈 공간 메뉴 닫기
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showEmptySpaceMenu) {
        setShowEmptySpaceMenu(false);
      }
    };

    if (showEmptySpaceMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showEmptySpaceMenu, setShowEmptySpaceMenu]);

  return {
    contextMenuPosition,
    emptySpaceMenuPosition,
    handleEmptySpaceContextMenu,
    handleBlockContextMenu,
    handleDeleteSelectedBlocks,
    handleApplyImportance,
    handleBlocksMove,
    handleBlocksDelete,
    addNewBlock
  };
};
