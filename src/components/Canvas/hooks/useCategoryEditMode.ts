import { useState, useCallback } from 'react';
import { CategoryBlock } from '../../../types';

/**
 * useCategoryEditMode
 *
 * 카테고리 편집 모드 상태를 관리하는 훅
 */

export const useCategoryEditMode = () => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState<string>('');

  /**
   * 편집 모드 시작
   */
  const startEditing = useCallback((category: CategoryBlock) => {
    setEditingCategoryId(category.id);
    setEditingCategoryTitle(category.title);
  }, []);

  /**
   * 편집 모드 종료
   */
  const stopEditing = useCallback(() => {
    setEditingCategoryId(null);
    setEditingCategoryTitle('');
  }, []);

  /**
   * 편집 중인지 확인
   */
  const isEditing = useCallback((categoryId: string): boolean => {
    return editingCategoryId === categoryId;
  }, [editingCategoryId]);

  /**
   * 제목 변경
   */
  const updateTitle = useCallback((title: string) => {
    setEditingCategoryTitle(title);
  }, []);

  return {
    editingCategoryId,
    editingCategoryTitle,
    setEditingCategoryId,
    setEditingCategoryTitle,
    startEditing,
    stopEditing,
    isEditing,
    updateTitle
  };
};
