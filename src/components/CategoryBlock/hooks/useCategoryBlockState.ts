import { useState, useRef } from 'react';
import { CategoryBlock } from '../../../types';

export const useCategoryBlockState = (category: CategoryBlock) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(category.title);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showQuickNavModal, setShowQuickNavModal] = useState(false);

  // 드래그 상태
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);

  // 롱프레스 상태
  const [isLongPressActive, setIsLongPressActive] = useState(false);

  // Refs
  const lastUpdateTime = useRef<number>(0);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  return {
    // 편집 상태
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,

    // UI 상태
    isHovered,
    setIsHovered,
    isDragOver,
    setIsDragOver,
    contextMenu,
    setContextMenu,
    showQuickNavModal,
    setShowQuickNavModal,

    // 드래그 상태
    isDraggingPosition,
    setIsDraggingPosition,
    isConnectionDragging,
    setIsConnectionDragging,
    dragStart,
    setDragStart,
    mouseDownPos,
    setMouseDownPos,
    dragMoved,
    setDragMoved,
    isLongPressActive,
    setIsLongPressActive,

    // Refs
    lastUpdateTime,
    pendingPosition,
    isDraggingRef,
    titleRef,
    categoryRef,
    longPressTimerRef
  };
};
