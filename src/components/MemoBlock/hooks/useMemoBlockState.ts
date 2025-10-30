import { useState, useRef } from 'react';
import { MemoBlock as MemoBlockType } from '../../../types';

export const useMemoBlockState = (memo: MemoBlockType) => {
  // 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);

  // 컨텍스트 메뉴 관련
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showQuickNavModal, setShowQuickNavModal] = useState(false);

  // 제목 편집 관련
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(memo.title);

  // 전체 편집 관련
  const [isEditingAllBlocks, setIsEditingAllBlocks] = useState(false);
  const [editedAllContent, setEditedAllContent] = useState('');

  // 스크롤 관련
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // 호버 및 커서 관련
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // 드래그 최적화 Ref
  const lastUpdateTime = useRef<number>(0);
  const pendingPosition = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // DOM Refs
  const memoRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const allContentTextareaRef = useRef<HTMLTextAreaElement>(null);

  return {
    // 드래그 상태
    isDragging,
    setIsDragging,
    isConnectionDragging,
    setIsConnectionDragging,
    dragStart,
    setDragStart,
    mouseDownPos,
    setMouseDownPos,
    dragMoved,
    setDragMoved,

    // 컨텍스트 메뉴
    contextMenu,
    setContextMenu,
    showQuickNavModal,
    setShowQuickNavModal,

    // 제목 편집
    isEditingTitle,
    setIsEditingTitle,
    editedTitle,
    setEditedTitle,

    // 전체 편집
    isEditingAllBlocks,
    setIsEditingAllBlocks,
    editedAllContent,
    setEditedAllContent,

    // 스크롤
    isScrolling,
    setIsScrolling,
    scrollTimeout,
    setScrollTimeout,

    // 호버/커서
    isHovering,
    setIsHovering,
    cursorPosition,
    setCursorPosition,

    // Refs
    lastUpdateTime,
    pendingPosition,
    isDraggingRef,
    memoRef,
    titleInputRef,
    allContentTextareaRef
  };
};
