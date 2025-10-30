import React from 'react';
import { Page } from '../../../types';

interface UsePageHandlersProps {
  editingPageId: string | null;
  setEditingPageId: (id: string | null) => void;
  editingName: string;
  setEditingName: (name: string) => void;
  onPageNameChange: (pageId: string, newName: string) => void;
  onDeletePage: (pageId: string) => void;
}

export const usePageHandlers = ({
  editingPageId,
  setEditingPageId,
  editingName,
  setEditingName,
  onPageNameChange,
  onDeletePage
}: UsePageHandlersProps) => {

  const handleDoubleClick = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleEditClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const handleDeleteClick = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`"${page.name}" 페이지를 정말 삭제하시겠습니까?`)) {
      onDeletePage(page.id);
    }
  };

  const handleNameSubmit = () => {
    if (editingPageId && editingName.trim()) {
      onPageNameChange(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  return {
    handleDoubleClick,
    handleEditClick,
    handleDeleteClick,
    handleNameSubmit,
    handleKeyPress
  };
};
