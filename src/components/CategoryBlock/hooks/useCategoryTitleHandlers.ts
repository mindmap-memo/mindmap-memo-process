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
}

export const useCategoryTitleHandlers = ({
  category,
  isEditing,
  editTitle,
  setIsEditing,
  setEditTitle,
  titleRef,
  onUpdate
}: UseCategoryTitleHandlersProps) => {

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(category.title);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

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
    handleTitleSave,
    handleTitleKeyDown
  };
};
