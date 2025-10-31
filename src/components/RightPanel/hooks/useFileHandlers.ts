import React from 'react';
import { MemoBlock, ContentBlock, ContentBlockType } from '../../../types';

interface UseFileHandlersProps {
  selectedMemo: MemoBlock | null;
  clickedPosition: number | null;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  saveToHistory: () => void;
  setShowEmptySpaceMenu: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const useFileHandlers = ({
  selectedMemo,
  clickedPosition,
  onMemoUpdate,
  saveToHistory,
  setShowEmptySpaceMenu,
  fileInputRef
}: UseFileHandlersProps) => {
  const handleFileAttach = React.useCallback(() => {
    setShowEmptySpaceMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [setShowEmptySpaceMenu, fileInputRef]);

  const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMemo || clickedPosition === null) return;

    // 파일을 Data URL로 변환
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileUrl = event.target?.result as string;
      const newBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'file',
        url: fileUrl,
        name: file.name
      };

      const blocks = [...(selectedMemo.blocks || [])];
      blocks.splice(clickedPosition, 0, newBlock);
      onMemoUpdate(selectedMemo.id, { blocks });
    };
    reader.readAsDataURL(file);

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedMemo, clickedPosition, onMemoUpdate, fileInputRef]);

  const handleAddTextBlock = React.useCallback(() => {
    setShowEmptySpaceMenu(false);

    if (!selectedMemo || clickedPosition === null) return;

    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type: 'text',
      content: ''
    };

    const blocks = [...(selectedMemo.blocks || [])];
    blocks.splice(clickedPosition, 0, newBlock);
    onMemoUpdate(selectedMemo.id, { blocks });
  }, [selectedMemo, clickedPosition, onMemoUpdate, setShowEmptySpaceMenu]);

  const handleFileDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedMemo) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    saveToHistory();

    const newBlocks: ContentBlock[] = [];

    for (const file of files) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let newBlock: ContentBlock;

      if (file.type.startsWith('image/')) {
        // 이미지 파일
        newBlock = {
          id: Date.now().toString() + '_' + Math.random(),
          type: 'image',
          url: dataUrl,
          caption: file.name
        };
      } else {
        // 일반 파일
        newBlock = {
          id: Date.now().toString() + '_' + Math.random(),
          type: 'file',
          url: dataUrl,
          name: file.name,
          size: file.size
        };
      }

      newBlocks.push(newBlock);
    }

    const updatedBlocks = [...(selectedMemo.blocks || []), ...newBlocks];
    onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
  }, [selectedMemo, onMemoUpdate, saveToHistory]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    handleFileAttach,
    handleFileSelect,
    handleAddTextBlock,
    handleFileDrop,
    handleDragOver
  };
};
