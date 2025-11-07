import React from 'react';
import { CategoryBlock } from '../../../types';

interface UseCategoryTitleHandlersProps {
  category: CategoryBlock;
  isEditing: boolean;
  editTitle: string;
  setIsEditing: (value: boolean) => void;
  setEditTitle: (value: string) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  onUpdate: (category: CategoryBlock) => void;
  onOpenEditor?: () => void;
  isSelected?: boolean;
}

export const useCategoryTitleHandlers = ({
  category,
  isEditing,
  editTitle,
  setIsEditing,
  setEditTitle,
  titleRef,
  onUpdate,
  onOpenEditor,
  isSelected
}: UseCategoryTitleHandlersProps) => {

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 편집 모드 진입은 더블클릭으로만 (handleTitleDoubleClick에서 처리)
    // 싱글 클릭은 카테고리 선택만 수행 (onDoubleClick이 발생하도록 하기 위해)
  };

  const handleTitleDoubleClick = React.useCallback((e: React.MouseEvent) => {
    console.log('[CategoryBlock] handleTitleDoubleClick 호출됨', { onOpenEditor: !!onOpenEditor });
    e.stopPropagation();

    // 모바일(onOpenEditor가 있을 때)에서는 에디터 열기
    if (onOpenEditor) {
      console.log('[CategoryBlock] onOpenEditor 호출');
      onOpenEditor();
      return;
    }

    // 데스크톱에서는 바로 편집 모드로 (isSelected 조건 제거)
    if (!isEditing) {
      setIsEditing(true);
      setEditTitle(category.title);
      setTimeout(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      }, 10);
    }
  }, [isEditing, setIsEditing, setEditTitle, category.title, titleRef, onOpenEditor]);

  const handleTitleSave = () => {
    setIsEditing(false);
    if (editTitle.trim() !== category.title) {
      onUpdate({
        ...category,
        title: editTitle.trim() || 'Untitled Category'
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(category.title);
    }
  };

  return {
    handleTitleClick,
    handleTitleDoubleClick,
    handleTitleSave,
    handleTitleKeyDown
  };
};
