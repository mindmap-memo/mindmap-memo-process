import React from 'react';

interface UseCategoryDropHandlersProps {
  categoryId: string;
  setIsDragOver: (value: boolean) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onMoveToCategory?: (itemId: string, categoryId: string | null) => void;
}

export const useCategoryDropHandlers = ({
  categoryId,
  setIsDragOver,
  onDragOver,
  onDrop,
  onMoveToCategory
}: UseCategoryDropHandlersProps) => {

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver?.(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 드래그가 자식 요소로 이동한 경우가 아닐 때만 상태 변경
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 드래그된 아이템의 ID 가져오기
    try {
      const dragDataStr = e.dataTransfer.getData('text/plain');
      const dragData = JSON.parse(dragDataStr);

      if (dragData.id && onMoveToCategory) {
        onMoveToCategory(dragData.id, categoryId);
      }
    } catch (error) {
      console.error('❌ Error parsing drag data:', error);
    }

    onDrop?.(e);
  };

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
