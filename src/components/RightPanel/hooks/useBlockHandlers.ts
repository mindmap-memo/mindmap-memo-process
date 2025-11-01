import { useCallback, useRef } from 'react';
import { MemoBlock, ContentBlock, ContentBlockType } from '../../../types';

export const useBlockHandlers = (
  selectedMemo: MemoBlock | undefined,
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void,
  saveToHistory: () => void,
  forceUpdate: () => void
) => {
  const selectedMemoRef = useRef(selectedMemo);
  selectedMemoRef.current = selectedMemo;

  // 새 블록 생성 헬퍼
  const createNewBlock = useCallback((type: ContentBlockType): ContentBlock => {
    const baseId = Date.now().toString();

    switch (type) {
      case 'text':
        return { id: baseId, type, content: '' };
      case 'image':
        return { id: baseId, type, url: '' };
      case 'file':
        return { id: baseId, type, url: '', name: '' };
      case 'bookmark':
        return { id: baseId, type, url: '' };
      default:
        return { id: baseId, type: 'text', content: '' } as any;
    }
  }, []);

  // 블록 업데이트
  const handleBlockUpdate = useCallback((updatedBlock: ContentBlock) => {
    const currentMemo = selectedMemoRef.current;

    if (!currentMemo || !currentMemo.blocks) {
      return;
    }

    const updatedBlocks = currentMemo.blocks.map(block => {
      if (block.id === updatedBlock.id) {
        return updatedBlock;
      }
      return block;
    });

    onMemoUpdate(currentMemo.id, { blocks: updatedBlocks });
    forceUpdate();
  }, [onMemoUpdate, forceUpdate]);

  // 블록 삭제
  const handleBlockDelete = useCallback((blockId: string) => {
    if (selectedMemo && selectedMemo.blocks && selectedMemo.blocks.length > 1) {
      saveToHistory();
      const updatedBlocks = selectedMemo.blocks.filter(block => block.id !== blockId);
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  }, [selectedMemo, onMemoUpdate, saveToHistory]);

  // 블록 복제
  const handleBlockDuplicate = useCallback((blockId: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      saveToHistory();
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        const originalBlock = selectedMemo.blocks[blockIndex];
        const duplicatedBlock: ContentBlock = {
          ...originalBlock,
          id: Date.now().toString()
        };

        const updatedBlocks = [...selectedMemo.blocks];
        updatedBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
        onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
      }
    }
  }, [selectedMemo, onMemoUpdate, saveToHistory]);

  // 블록 이동
  const handleBlockMove = useCallback((blockId: string, direction: 'up' | 'down') => {
    if (selectedMemo && selectedMemo.blocks) {
      const blocks = [...selectedMemo.blocks];
      const index = blocks.findIndex(block => block.id === blockId);

      if (direction === 'up' && index > 0) {
        [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
      } else if (direction === 'down' && index < blocks.length - 1) {
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }

      onMemoUpdate(selectedMemo.id, { blocks });
    }
  }, [selectedMemo, onMemoUpdate]);

  // 블록 타입 변환
  const handleConvertBlock = useCallback((blockId: string, newBlockType: ContentBlockType) => {
    if (selectedMemo && selectedMemo.blocks) {
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return;

      const newBlock = createNewBlock(newBlockType);
      const updatedBlocks = [...selectedMemo.blocks];
      updatedBlocks.splice(blockIndex + 1, 0, newBlock);

      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  }, [selectedMemo, onMemoUpdate, createNewBlock]);

  // 새 블록 생성 (Enter 키)
  const handleCreateNewBlock = useCallback((afterBlockId: string, content: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      saveToHistory();
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === afterBlockId);
      if (blockIndex === -1) return;

      const newBlock = createNewBlock('text') as any;
      newBlock.content = content;

      const updatedBlocks = [...selectedMemo.blocks];
      updatedBlocks.splice(blockIndex + 1, 0, newBlock);

      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });

      setTimeout(() => {
        const newTextarea = document.querySelector(`textarea[data-block-id="${newBlock.id}"]`) as HTMLTextAreaElement;
        if (newTextarea) {
          newTextarea.focus();
        }
      }, 50);
    }
  }, [selectedMemo, onMemoUpdate, saveToHistory, createNewBlock]);

  // 블록 삽입
  const handleInsertBlockAfter = useCallback((afterBlockId: string, newBlock: ContentBlock) => {
    if (selectedMemo && selectedMemo.blocks) {
      saveToHistory();
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === afterBlockId);
      if (blockIndex === -1) return;

      const updatedBlocks = [...selectedMemo.blocks];
      updatedBlocks.splice(blockIndex + 1, 0, newBlock);

      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  }, [selectedMemo, onMemoUpdate, saveToHistory]);

  // 블록 병합
  const handleMergeWithPrevious = useCallback((blockId: string, currentContent: string) => {
    if (!selectedMemo || !selectedMemo.blocks) return;

    const blockIndex = selectedMemo.blocks.findIndex(b => b.id === blockId);
    if (blockIndex <= 0) return;

    const currentBlock = selectedMemo.blocks[blockIndex];
    const previousBlock = selectedMemo.blocks[blockIndex - 1];

    // 텍스트 블록만 병합 가능
    if (currentBlock.type !== 'text' || previousBlock.type !== 'text') return;

    saveToHistory();

    const mergedContent = (previousBlock.content || '') + currentContent;
    const cursorPosition = (previousBlock.content || '').length;

    const updatedBlocks = selectedMemo.blocks.filter(b => b.id !== blockId);
    const updatedPreviousBlock = { ...previousBlock, content: mergedContent };
    updatedBlocks[blockIndex - 1] = updatedPreviousBlock;

    onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });

    setTimeout(() => {
      const textarea = document.querySelector(`textarea[data-block-id="${previousBlock.id}"]`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 50);
  }, [selectedMemo, onMemoUpdate, saveToHistory]);

  // 이전 블록으로 포커스
  const handleFocusPrevious = useCallback((blockId: string) => {
    if (!selectedMemo || !selectedMemo.blocks) return;
    const blockIndex = selectedMemo.blocks.findIndex(b => b.id === blockId);
    if (blockIndex > 0) {
      const previousBlock = selectedMemo.blocks[blockIndex - 1];
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-block-id="${previousBlock.id}"]`) as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }, 50);
    }
  }, [selectedMemo]);

  // 다음 블록으로 포커스
  const handleFocusNext = useCallback((blockId: string) => {
    if (!selectedMemo || !selectedMemo.blocks) return;
    const blockIndex = selectedMemo.blocks.findIndex(b => b.id === blockId);
    if (blockIndex < selectedMemo.blocks.length - 1) {
      const nextBlock = selectedMemo.blocks[blockIndex + 1];
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-block-id="${nextBlock.id}"]`) as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }, 50);
    }
  }, [selectedMemo]);

  return {
    createNewBlock,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockMove,
    handleConvertBlock,
    handleCreateNewBlock,
    handleInsertBlockAfter,
    handleMergeWithPrevious,
    handleFocusPrevious,
    handleFocusNext
  };
};
