import React from 'react';
import { MemoBlock as MemoBlockType } from '../../../types';

interface UseMemoBlockHandlersParams {
  memo: MemoBlockType;
  isSelected: boolean;
  isEditingTitle: boolean;
  setIsEditingTitle: (value: boolean) => void;
  editedTitle: string;
  setEditedTitle: (value: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  isEditingAllBlocks: boolean;
  setIsEditingAllBlocks: (value: boolean) => void;
  editedAllContent: string;
  setEditedAllContent: (value: string) => void;
  allBlocksInputRef: React.RefObject<HTMLTextAreaElement | null>;
  setContextMenu: (value: { x: number; y: number } | null) => void;
  setShowQuickNavModal: (value: boolean) => void;
  setIsScrolling: (value: boolean) => void;
  scrollTimeout: NodeJS.Timeout | null;
  setScrollTimeout: (value: NodeJS.Timeout | null) => void;
  onTitleUpdate?: (id: string, title: string) => void;
  onBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
}

export const useMemoBlockHandlers = (params: UseMemoBlockHandlersParams) => {
  const {
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
  } = params;

  // 우클릭 메뉴 핸들러
  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });

    if (e.nativeEvent) {
      e.nativeEvent.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
    }

    return false;
  }, [setContextMenu]);

  // 단축 이동 추가 확인
  const handleQuickNavConfirm = React.useCallback((name: string) => {
    if (name.trim() && onAddQuickNav) {
      onAddQuickNav(name.trim(), memo.id, 'memo');
      setShowQuickNavModal(false);
    }
  }, [memo.id, onAddQuickNav, setShowQuickNavModal]);

  // 제목 더블클릭 핸들러
  const handleTitleDoubleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected && !isEditingTitle) {
      setIsEditingTitle(true);
      setEditedTitle(memo.title);
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 10);
    }
  }, [isSelected, isEditingTitle, setIsEditingTitle, setEditedTitle, memo.title, titleInputRef]);

  // 제목 편집 완료
  const handleTitleBlur = React.useCallback(() => {
    if (isEditingTitle) {
      setIsEditingTitle(false);
      if (editedTitle !== memo.title && onTitleUpdate) {
        onTitleUpdate(memo.id, editedTitle);
      }
    }
  }, [isEditingTitle, setIsEditingTitle, editedTitle, memo.title, memo.id, onTitleUpdate]);

  // 제목 편집 중 엔터/ESC 처리
  const handleTitleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedTitle(memo.title);
      setIsEditingTitle(false);
    }
  }, [handleTitleBlur, setEditedTitle, setIsEditingTitle, memo.title]);

  // 통합 편집 핸들러 - 모든 텍스트 블록을 하나로 합쳐서 편집
  const handleAllBlocksDoubleClick = React.useCallback(() => {
    if (isSelected && !isEditingAllBlocks) {
      const textBlocks = (memo.blocks || []).filter(b => b.type === 'text');
      const combined = textBlocks.map(b => (b as any).content || '').join('\n\n');

      setIsEditingAllBlocks(true);
      setEditedAllContent(combined);
      setTimeout(() => {
        if (allBlocksInputRef.current) {
          allBlocksInputRef.current.focus();
          allBlocksInputRef.current.style.height = 'auto';
          allBlocksInputRef.current.style.height = allBlocksInputRef.current.scrollHeight + 'px';
        }
      }, 10);
    }
  }, [isSelected, isEditingAllBlocks, memo.blocks, setIsEditingAllBlocks, setEditedAllContent, allBlocksInputRef]);

  // 통합 편집 완료 - \n\n 기준으로 블록 분리
  const handleAllBlocksBlur = React.useCallback(() => {
    if (isEditingAllBlocks && onBlockUpdate) {
      const newContents = editedAllContent.split('\n\n').filter(c => c.trim() !== '');
      const textBlocks = (memo.blocks || []).filter(b => b.type === 'text') as any[];

      newContents.forEach((content, index) => {
        if (textBlocks[index]) {
          onBlockUpdate(memo.id, textBlocks[index].id, content);
        }
      });

      setIsEditingAllBlocks(false);
      setEditedAllContent('');
    }
  }, [isEditingAllBlocks, onBlockUpdate, editedAllContent, memo.blocks, memo.id, setIsEditingAllBlocks, setEditedAllContent]);

  // 통합 편집 중 키 처리
  const handleAllBlocksKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = e.currentTarget.selectionStart;
      const before = editedAllContent.substring(0, cursorPos);
      const after = editedAllContent.substring(cursorPos);
      setEditedAllContent(before + '\n\n' + after);
      setTimeout(() => {
        if (allBlocksInputRef.current) {
          allBlocksInputRef.current.selectionStart = cursorPos + 2;
          allBlocksInputRef.current.selectionEnd = cursorPos + 2;
        }
      }, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingAllBlocks(false);
      setEditedAllContent('');
    }
  }, [editedAllContent, setEditedAllContent, allBlocksInputRef, setIsEditingAllBlocks]);

  // 스크롤 이벤트 핸들러
  const handleScroll = React.useCallback(() => {
    setIsScrolling(true);

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    const newTimeout = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);

    setScrollTimeout(newTimeout);
  }, [setIsScrolling, scrollTimeout, setScrollTimeout]);

  return {
    handleContextMenu,
    handleQuickNavConfirm,
    handleTitleDoubleClick,
    handleTitleBlur,
    handleTitleKeyDown,
    handleAllBlocksDoubleClick,
    handleAllBlocksBlur,
    handleAllBlocksKeyDown,
    handleScroll
  };
};
