import React, { useState } from 'react';
import { MemoBlock as MemoBlockType, MemoDisplaySize, ImportanceLevel, ImportanceRange, Page } from '../types';
import { calculateCategoryArea } from '../utils/categoryAreaUtils';
import ContextMenu from './ContextMenu';
import QuickNavModal from './QuickNavModal';
import styles from '../scss/components/MemoBlock.module.scss';

// 중요도 레벨별 형광펜 스타일 정의 (TextBlock과 동일)
const getImportanceStyle = (level: ImportanceLevel) => {
  switch (level) {
    case 'critical':
      return { backgroundColor: '#ffcdd2', color: '#000' }; // 빨간 형광펜 - 매우중요
    case 'important':
      return { backgroundColor: '#ffcc80', color: '#000' }; // 주황 형광펜 - 중요
    case 'opinion':
      return { backgroundColor: '#e1bee7', color: '#000' }; // 보라 형광펜 - 의견
    case 'reference':
      return { backgroundColor: '#81d4fa', color: '#000' }; // 파란 형광펜 - 참고
    case 'question':
      return { backgroundColor: '#fff59d', color: '#000' }; // 노란 형광펜 - 질문
    case 'idea':
      return { backgroundColor: '#c8e6c9', color: '#000' }; // 초록 형광펜 - 아이디어
    case 'data':
      return { backgroundColor: '#bdbdbd', color: '#000' }; // 진한 회색 형광펜 - 데이터
    default:
      return {};
  }
};

// 읽기 모드에서 하이라이팅된 텍스트 렌더링 (필터링 적용)
const renderHighlightedText = (text: string, importanceRanges?: ImportanceRange[], activeFilters?: Set<ImportanceLevel>, showGeneral?: boolean) => {
  if (!importanceRanges || importanceRanges.length === 0) {
    // 하이라이팅이 없는 일반 텍스트는 일반 텍스트 필터에 따라 표시/숨김
    return showGeneral === false ? '' : text;
  }

  const ranges = [...importanceRanges].sort((a, b) => a.start - b.start);
  const parts: Array<{ text: string; level?: ImportanceLevel }> = [];
  let lastIndex = 0;

  ranges.forEach(range => {
    // 이전 부분 (스타일 없음)
    if (range.start > lastIndex) {
      parts.push({ text: text.substring(lastIndex, range.start) });
    }

    // 현재 범위 (스타일 적용)
    parts.push({
      text: text.substring(range.start, range.end),
      level: range.level
    });

    lastIndex = range.end;
  });

  // 마지막 부분 (스타일 없음)
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex) });
  }

  return parts.map((part, index) => {
    // 필터링 적용: 중요도가 있는 부분은 필터에 따라 표시/숨김
    if (part.level && activeFilters && !activeFilters.has(part.level)) {
      return null; // 필터에 포함되지 않은 중요도는 숨김
    }

    // 일반 텍스트 필터링 적용
    if (!part.level && showGeneral === false) {
      return null; // 일반 텍스트가 비활성화되면 숨김
    }

    return (
      <span
        key={index}
        style={part.level ? {
          backgroundColor: getImportanceStyle(part.level).backgroundColor,
          padding: '1px 0px',
          borderRadius: '2px',
          fontWeight: '500',
          margin: '0'
        } : {}}
      >
        {part.text}
      </span>
    );
  });
};

// 공백 크기를 계산하는 함수 (최대 1블록 높이로 제한)
const getSpacerHeight = (consecutiveHiddenBlocks: number): string => {
  if (consecutiveHiddenBlocks <= 1) return '0';
  return '0.8em'; // 적당한 공백 크기
};

// 블록이 필터링되어 보이는지 확인하는 함수
const isBlockVisible = (block: any, activeImportanceFilters?: Set<ImportanceLevel>, showGeneralContent?: boolean): boolean => {
  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
  const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
  const isDefaultFilterState = (!activeImportanceFilters ||
                               (activeImportanceFilters.size === allLevels.length &&
                                allLevels.every(level => activeImportanceFilters.has(level)))) &&
                              showGeneralContent !== false;

  if (isDefaultFilterState) return true;

  if (block.type === 'text') {
    const textBlock = block;
    if (!textBlock.content || textBlock.content.trim() === '') {
      return showGeneralContent !== false;
    }

    if (!textBlock.importanceRanges || textBlock.importanceRanges.length === 0) {
      return showGeneralContent !== false;
    }

    // 필터에 맞는 중요도 범위가 있는지 확인
    return textBlock.importanceRanges.some((range: ImportanceRange) =>
      activeImportanceFilters && activeImportanceFilters.has(range.level)
    ) || (showGeneralContent !== false && textBlock.importanceRanges.length < textBlock.content.length);
  }

  // 비텍스트 블록(image, file, bookmark, callout, quote, code, table, checklist 등)의 중요도 필터링
  const blockWithImportance = block as any;

  // 중요도가 있는 경우
  if (blockWithImportance.importance) {
    return activeImportanceFilters ? activeImportanceFilters.has(blockWithImportance.importance) : true;
  }

  // 중요도가 없는 경우 (일반 내용)
  return showGeneralContent !== false;
};

// 메모 블록의 가장 높은 중요도를 찾는 함수
const getHighestImportanceLevel = (memo: MemoBlockType): ImportanceLevel | null => {
  if (!memo.blocks || memo.blocks.length === 0) return null;

  // 중요도 우선순위 정의 (높은 순서부터)
  const importancePriority: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

  let highestLevel: ImportanceLevel | null = null;

  memo.blocks.forEach(block => {
    if (block.type === 'text') {
      const textBlock = block as any; // TextBlock으로 캐스팅
      if (textBlock.importanceRanges && textBlock.importanceRanges.length > 0) {
        textBlock.importanceRanges.forEach((range: ImportanceRange) => {
          if (!highestLevel || importancePriority.indexOf(range.level) < importancePriority.indexOf(highestLevel)) {
            highestLevel = range.level;
          }
        });
      }
    } else {
      // 비텍스트 블록의 중요도 확인 (image, file, callout, bookmark, quote, code, table, sheets 등)
      const blockWithImportance = block as any;
      if (blockWithImportance.importance) {
        if (!highestLevel || importancePriority.indexOf(blockWithImportance.importance) < importancePriority.indexOf(highestLevel)) {
          highestLevel = blockWithImportance.importance;
        }
      }
    }
  });

  return highestLevel;
};

interface MemoBlockProps {
  memo: MemoBlockType;
  isSelected: boolean;
  isDragHovered?: boolean;
  onClick: (isShiftClick?: boolean) => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onDisplaySizeChange?: (id: string, size: MemoDisplaySize) => void;
  onDetectCategoryOnDrop?: (memoId: string, position: { x: number; y: number }) => void;
  isConnecting?: boolean;
  connectingFromId?: string | null;
  onStartConnection?: (memoId: string) => void;
  onConnectMemos?: (fromId: string, toId: string) => void;
  canvasScale?: number;
  canvasOffset?: { x: number; y: number };
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onDragStart?: (memoId: string) => void;
  onDragEnd?: () => void;
  enableImportanceBackground?: boolean;
  currentPage?: Page;
  isDraggingAnyMemo?: boolean;
  isShiftPressed?: boolean;
  onDelete?: (id: string) => void;
  onAddQuickNav?: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists?: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onTitleUpdate?: (id: string, title: string) => void;
  onBlockUpdate?: (memoId: string, blockId: string, content: string) => void;
}

const MemoBlock: React.FC<MemoBlockProps> = ({
  memo,
  isSelected,
  isDragHovered = false,
  onClick,
  onPositionChange,
  onSizeChange,
  onDisplaySizeChange,
  onDetectCategoryOnDrop,
  isConnecting,
  connectingFromId,
  onStartConnection,
  onConnectMemos,
  canvasScale = 1,
  canvasOffset = { x: 0, y: 0 },
  activeImportanceFilters,
  showGeneralContent,
  enableImportanceBackground = false,
  onDragStart,
  onDragEnd,
  currentPage,
  isDraggingAnyMemo = false,
  isShiftPressed = false,
  onDelete,
  onAddQuickNav,
  isQuickNavExists,
  onTitleUpdate,
  onBlockUpdate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showQuickNavModal, setShowQuickNavModal] = useState(false);
  const [isConnectionDragging, setIsConnectionDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(memo.title);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [isEditingAllBlocks, setIsEditingAllBlocks] = useState(false);
  const [editedAllContent, setEditedAllContent] = useState('');
  const allBlocksInputRef = React.useRef<HTMLTextAreaElement>(null);

  // 드래그 임계값 (픽셀 단위)
  const DRAG_THRESHOLD = 5;
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // 빠른 드래그 최적화를 위한 상태
  const lastUpdateTime = React.useRef<number>(0);
  const pendingPosition = React.useRef<{ x: number; y: number } | null>(null);
  const memoRef = React.useRef<HTMLDivElement>(null);

  // 크기별 스타일 정의
  const getSizeConfig = (size: MemoDisplaySize) => {
    switch (size) {
      case 'small':
        return {
          width: 180,
          maxHeight: 3000,
          showContent: false,
          showTags: true,
          contentLength: 0
        };
      case 'medium':
        return {
          width: 300,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 500
        };
      case 'large':
        return {
          width: 400,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 1000
        };
      default:
        return {
          width: 200,
          maxHeight: 3000,
          showContent: true,
          showTags: true,
          contentLength: 50
        };
    }
  };

  const sizeConfig = getSizeConfig(memo.displaySize || 'small');

  // 우클릭 메뉴 핸들러
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // 크롬 기본 우클릭 메뉴 막기
    e.stopPropagation(); // 이벤트 전파 중단

    // 컨텍스트 메뉴 표시
    setContextMenu({ x: e.clientX, y: e.clientY });

    // 추가 보험: 네이티브 이벤트에도 preventDefault 적용
    if (e.nativeEvent) {
      e.nativeEvent.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
    }

    return false; // 추가 보험
  };

  // 컨텍스트 메뉴 닫기
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // 단축 이동 추가 확인
  const handleQuickNavConfirm = (name: string) => {
    if (name.trim() && onAddQuickNav) {
      onAddQuickNav(name.trim(), memo.id, 'memo');
      setShowQuickNavModal(false);
    }
  };

  // 제목 더블클릭 핸들러
  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected && !isEditingTitle) {
      setIsEditingTitle(true);
      setEditedTitle(memo.title);
      // 약간 지연 후 포커스 (렌더링 완료 후)
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 10);
    }
  };

  // 제목 편집 완료
  const handleTitleBlur = () => {
    if (isEditingTitle) {
      setIsEditingTitle(false);
      if (editedTitle !== memo.title && onTitleUpdate) {
        onTitleUpdate(memo.id, editedTitle);
      }
    }
  };

  // 제목 편집 중 엔터/ESC 처리
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedTitle(memo.title);
      setIsEditingTitle(false);
    }
  };

  // 통합 편집 핸들러 - 모든 텍스트 블록을 하나로 합쳐서 편집
  const handleAllBlocksDoubleClick = () => {
    if (isSelected && !isEditingAllBlocks) {
      // 모든 텍스트 블록의 내용을 \n\n으로 구분해서 합치기
      const textBlocks = (memo.blocks || []).filter(b => b.type === 'text');
      const combined = textBlocks.map(b => (b as any).content || '').join('\n\n');

      setIsEditingAllBlocks(true);
      setEditedAllContent(combined);
      setTimeout(() => {
        if (allBlocksInputRef.current) {
          allBlocksInputRef.current.focus();
          // 초기 높이 설정
          allBlocksInputRef.current.style.height = 'auto';
          allBlocksInputRef.current.style.height = allBlocksInputRef.current.scrollHeight + 'px';
        }
      }, 10);
    }
  };

  // 통합 편집 완료 - \n\n 기준으로 블록 분리
  const handleAllBlocksBlur = () => {
    if (isEditingAllBlocks && onBlockUpdate) {
      // \n\n 기준으로 블록 분리
      const newContents = editedAllContent.split('\n\n').filter(c => c.trim() !== '');
      const textBlocks = (memo.blocks || []).filter(b => b.type === 'text') as any[];

      // 각 블록에 새 내용 업데이트
      newContents.forEach((content, index) => {
        if (textBlocks[index]) {
          onBlockUpdate(memo.id, textBlocks[index].id, content);
        }
      });

      setIsEditingAllBlocks(false);
      setEditedAllContent('');
    }
  };

  // 통합 편집 중 키 처리
  const handleAllBlocksKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter = 블록 구분자 삽입 (\n\n)
      e.preventDefault();
      const cursorPos = e.currentTarget.selectionStart;
      const before = editedAllContent.substring(0, cursorPos);
      const after = editedAllContent.substring(cursorPos);
      setEditedAllContent(before + '\n\n' + after);
      // 커서 위치 조정
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
    // Shift+Enter는 일반 \n으로 자동 처리됨
  };

  // 배경색은 항상 흰색 또는 선택 시 회색 (#f3f4f6)
  const backgroundColor = React.useMemo(() => {
    return isSelected ? '#f3f4f6' : 'white';
  }, [isSelected]);

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    setIsScrolling(true);
    
    // 기존 타이머가 있다면 클리어
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // 1초 후 스크롤 상태를 false로 변경
    const newTimeout = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
    
    setScrollTimeout(newTimeout);
  };

  // 커스텀 스크롤바 스타일 추가
  React.useEffect(() => {
    const shouldShowScrollbar = isScrolling || isHovering;
    const style = document.createElement('style');
    style.textContent = `
      .memo-block-container {
        scrollbar-width: thin;
        scrollbar-color: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3) transparent' : 'transparent transparent'};
        transition: scrollbar-color 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar {
        width: 6px;
      }
      
      .memo-block-container::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb {
        background: ${shouldShowScrollbar ? 'rgba(0, 0, 0, 0.3)' : 'transparent'};
        border-radius: 3px;
        transition: background 0.2s ease;
      }
      
      .memo-block-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.4);
      }
    `;
    
    const existingStyle = document.querySelector('#memo-block-scrollbar-styles');
    if (existingStyle) {
      existingStyle.textContent = style.textContent;
    } else {
      style.id = 'memo-block-scrollbar-styles';
      document.head.appendChild(style);
    }
  }, [isScrolling, isHovering]);

  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []); // 의존성 배열을 빈 배열로 변경

  const handleMouseDown = (e: React.MouseEvent) => {
    // 우클릭은 컨텍스트 메뉴용으로 무시
    if (e.button === 2) {
      return;
    }

    // 다른 메모가 이미 드래그 중이면 무시 (단, 현재 메모가 드래그 중이면 허용)
    if (isDraggingAnyMemo && !isDragging) {
      e.stopPropagation();
      return;
    }

    // 연결 모드가 아닐 때만 드래그 준비 (왼쪽 클릭만)
    if (e.button === 0 && !isConnecting) {
      // 마우스 다운 위치 저장 (임계값 판단용)
      setMouseDownPos({ x: e.clientX, y: e.clientY });
      setDragMoved(false);
      setDragStart({
        x: e.clientX - (memo.position.x * canvasScale + canvasOffset.x),
        y: e.clientY - (memo.position.y * canvasScale + canvasOffset.y)
      });
      e.preventDefault(); // HTML5 드래그 방지, 마우스 드래그 우선
    }
  };

  const handleConnectionPointMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isConnecting) {
      setIsConnectionDragging(true);
      onStartConnection?.(memo.id);
    }
  };

  const handleConnectionPointMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
      onConnectMemos?.(connectingFromId, memo.id);
    }
    setIsConnectionDragging(false);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    // 마우스 다운 후 드래그 임계값 확인
    if (mouseDownPos && !isDragging) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      // 임계값을 넘으면 드래그 시작
      if (distance >= DRAG_THRESHOLD) {
        setIsDragging(true);
        onDragStart?.(memo.id);
      }
    }

    if (isDragging) {
      // 커서 위치 저장 (힌트 UI용)
      setCursorPosition({ x: e.clientX, y: e.clientY });

      if (!dragMoved) {
        setDragMoved(true);
      }

      // 마우스 현재 위치에서 드래그 시작 오프셋을 빼고 캔버스 좌표계로 변환
      let newPosition = {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // 루트 메모이고 Shift 드래그가 아닐 때, 영역과 충돌하면 방향별 이동 차단
      if (!memo.parentId && !isShiftPressed && currentPage) {
        console.log('[BLOCKING] 차단 조건 진입', {
          memoId: memo.id,
          parentId: memo.parentId,
          isShiftPressed,
          hasCurrentPage: !!currentPage
        });

        const deltaX = newPosition.x - memo.position.x;
        const deltaY = newPosition.y - memo.position.y;

        console.log('[BLOCKING] 이동 방향', {
          deltaX,
          deltaY,
          from: memo.position,
          to: newPosition
        });

        const categories = currentPage.categories || [];
        const memoWidth = memo.size?.width || 200;
        const memoHeight = memo.size?.height || 95;

        console.log('[BLOCKING] 카테고리 검사 시작', {
          totalCategories: categories.length,
          memoSize: { width: memoWidth, height: memoHeight }
        });

        // 카테고리 parentId 상태 확인 (하나씩 로그)
        categories.forEach(c => {
          console.log(`[BLOCKING] 카테고리 ${c.id}: parentId=${c.parentId}, isExpanded=${c.isExpanded}`);
        });

        for (const category of categories) {
          // 루트 레벨 카테고리만 확인 (parentId가 null 또는 undefined)
          if (category.parentId != null) {
            console.log('[BLOCKING] 카테고리 스킵 (하위 카테고리)', category.id);
            continue;
          }
          if (!category.isExpanded) {
            console.log('[BLOCKING] 카테고리 스킵 (접힘 상태)', category.id);
            continue;
          }

          const categoryArea = calculateCategoryArea(category, currentPage);
          if (!categoryArea) {
            console.log('[BLOCKING] 카테고리 영역 계산 실패', category.id);
            continue;
          }

          console.log('[BLOCKING] 카테고리 영역 확인', {
            categoryId: category.id,
            area: categoryArea
          });

          // 새 위치에서 메모의 경계
          const newMemoBounds = {
            left: newPosition.x,
            top: newPosition.y,
            right: newPosition.x + memoWidth,
            bottom: newPosition.y + memoHeight
          };

          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };

          console.log('[BLOCKING] 경계 계산', {
            memoBounds: newMemoBounds,
            areaBounds
          });

          // 겹침 계산
          const overlapLeft = Math.max(newMemoBounds.left, areaBounds.left);
          const overlapTop = Math.max(newMemoBounds.top, areaBounds.top);
          const overlapRight = Math.min(newMemoBounds.right, areaBounds.right);
          const overlapBottom = Math.min(newMemoBounds.bottom, areaBounds.bottom);

          const hasOverlap = overlapLeft < overlapRight && overlapTop < overlapBottom;
          console.log('[BLOCKING] 겹침 검사', {
            overlapLeft,
            overlapTop,
            overlapRight,
            overlapBottom,
            hasOverlap
          });

          // 겹침이 발생하면 해당 방향으로 이동 차단
          if (hasOverlap) {
            console.log('[BLOCKING] ⚠️ 충돌 감지! 이동 차단');

            // 어느 방향에서 충돌했는지 판단하고, 해당 방향으로의 이동만 차단 (현재 위치 유지)
            if (deltaX < 0) {
              // 왼쪽으로 이동 중 → x 좌표는 현재 메모 위치 유지
              newPosition.x = memo.position.x;
              console.log('[BLOCKING] 왼쪽 이동 차단 (현재 위치 유지)');
            } else if (deltaX > 0) {
              // 오른쪽으로 이동 중 → x 좌표는 현재 메모 위치 유지
              newPosition.x = memo.position.x;
              console.log('[BLOCKING] 오른쪽 이동 차단 (현재 위치 유지)');
            }

            if (deltaY < 0) {
              // 위로 이동 중 → y 좌표는 현재 메모 위치 유지
              newPosition.y = memo.position.y;
              console.log('[BLOCKING] 위쪽 이동 차단 (현재 위치 유지)');
            } else if (deltaY > 0) {
              // 아래로 이동 중 → y 좌표는 현재 메모 위치 유지
              newPosition.y = memo.position.y;
              console.log('[BLOCKING] 아래쪽 이동 차단 (현재 위치 유지)');
            }
          }
        }
      } else {
        if (memo.parentId) {
          console.log('[BLOCKING] 차단 조건 불만족: parentId 존재', memo.parentId);
        }
        if (isShiftPressed) {
          console.log('[BLOCKING] 차단 조건 불만족: Shift 키 눌림');
        }
        if (!currentPage) {
          console.log('[BLOCKING] 차단 조건 불만족: currentPage 없음');
        }
      }

      // 빠른 드래그 시 업데이트 빈도 조절 (50ms마다만 업데이트)
      const now = Date.now();
      pendingPosition.current = newPosition;

      if (now - lastUpdateTime.current >= 50) {
        onPositionChange(memo.id, newPosition);
        lastUpdateTime.current = now;
      }
    }
  }, [isDragging, dragMoved, dragStart, canvasOffset, canvasScale, onPositionChange, memo.id, memo.position, memo.parentId, memo.size, currentPage, isShiftPressed, mouseDownPos, DRAG_THRESHOLD, onDragStart]);

  const handleMouseUp = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      // 드래그가 끝날 때 최종 위치 업데이트 (대기 중인 위치가 있으면 사용)
      const finalPosition = pendingPosition.current || {
        x: (e.clientX - dragStart.x - canvasOffset.x) / canvasScale,
        y: (e.clientY - dragStart.y - canvasOffset.y) / canvasScale
      };

      // Shift 모드가 아닐 때만 최종 위치 업데이트 (Shift 모드는 handleShiftDrop에서 위치 복원)
      if (!isShiftPressed) {
        onPositionChange(memo.id, finalPosition);
      }

      // 카테고리 감지
      if (dragMoved && onDetectCategoryOnDrop) {
        onDetectCategoryOnDrop(memo.id, finalPosition);
      }

      // 상태 초기화
      pendingPosition.current = null;
      lastUpdateTime.current = 0;
      setCursorPosition(null); // 커서 위치 리셋
    }

    // 모든 경우에 상태 초기화 (드래그 임계값 미달로 드래그가 시작되지 않은 경우 포함)
    setIsDragging(false);
    setMouseDownPos(null);
    onDragEnd?.();
  }, [isDragging, dragMoved, dragStart, canvasOffset, canvasScale, onDetectCategoryOnDrop, onPositionChange, memo.id, onDragEnd, isShiftPressed]);

  React.useEffect(() => {
    // 마우스 다운 상태이거나 드래그 중일 때 이벤트 리스너 등록
    if (mouseDownPos || isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [mouseDownPos, isDragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    if (memoRef.current && onSizeChange) {
      let timeoutId: NodeJS.Timeout;

      const updateSize = () => {
        // 드래그 중일 때는 크기 업데이트 방지
        if (isDragging) {
          return;
        }

        if (memoRef.current) {
          const rect = memoRef.current.getBoundingClientRect();
          // 0이거나 매우 작은 크기는 무시 (컴포넌트가 사라지는 중일 수 있음)
          if (rect.width < 10 || rect.height < 10) {
            return;
          }

          // scale을 나누어서 실제 논리적 크기 계산
          const newSize = {
            width: Math.round(rect.width / canvasScale),
            height: Math.round(rect.height / canvasScale)
          };

          // 크기 변화가 충분히 클 때만 업데이트 (5px 이상 차이)
          if (!memo.size ||
              Math.abs(memo.size.width - newSize.width) > 5 ||
              Math.abs(memo.size.height - newSize.height) > 5) {
            // 디바운싱: 100ms 후에 업데이트
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              onSizeChange(memo.id, newSize);
            }, 100);
          }
        }
      };

      // 초기 크기 설정을 위한 지연 실행
      timeoutId = setTimeout(updateSize, 50);

      const resizeObserver = new ResizeObserver(() => {
        // ResizeObserver 콜백도 디바운싱
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateSize, 100);
      });

      if (memoRef.current) {
        resizeObserver.observe(memoRef.current);
      }

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    }
  }, [memo.title, memo.content, memo.tags, memo.blocks, memo.id, onSizeChange, canvasScale, isDragging]);

  return (
    <div
      className={styles.memoBlockWrapper}
      style={{
        transform: `translate3d(${memo.position.x}px, ${memo.position.y}px, 0)`,
        width: `${sizeConfig.width}px`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
    >
      {/* 메모 블록 콘텐츠 */}
      <div
        ref={memoRef}
        className={`${styles.memoBlockContainer} ${
          isDragging && isShiftPressed ? styles.shiftDragging :
          isDragHovered ? styles.dragHovered :
          isSelected ? styles.selected :
          styles.notSelected
        } ${isDragging ? styles.dragging : styles.notDragging}`}
        data-memo-block="true"
        onClick={(e) => {
          // 드래그로 이동했다면 클릭 이벤트를 무시
          if (!dragMoved) {
            onClick(e.shiftKey);
          }
        }}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={(e) => {
          // 연결 모드일 때 메모 블록 전체에서 연결 처리
          if (isConnecting && connectingFromId && connectingFromId !== memo.id) {
            e.stopPropagation();
            onConnectMemos?.(connectingFromId, memo.id);
          }
        }}
        onScroll={handleScroll}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        draggable={false}
        style={{
          backgroundColor,
          width: `${sizeConfig.width}px`,
          maxHeight: `${sizeConfig.maxHeight}px`
        }}
      >
        <div className={styles.titleContainer}>
          <div
            onDoubleClick={handleTitleDoubleClick}
            className={`${styles.title} ${memo.title ? styles.withTitle : styles.withoutTitle} ${isSelected ? styles.editable : styles.notEditable}`}
          >
            {isDragging && isShiftPressed && (
              <span className={styles.shiftDragIcon}>+</span>
            )}
            {!isEditingTitle ? (
              <>📝 {memo.title || '제목을 입력해주세요'}</>
            ) : (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                className={styles.titleInput}
              />
            )}
          </div>
          {isSelected && (
            <div className={styles.sizeButtons}>
              {(['small', 'medium', 'large'] as MemoDisplaySize[]).map((size) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisplaySizeChange?.(memo.id, size);
                  }}
                  className={`${styles.sizeButton} ${memo.displaySize === size ? styles.active : styles.inactive}`}
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          )}
        </div>
        {sizeConfig.showTags && memo.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {memo.tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {sizeConfig.showContent && (
          <div
            onDoubleClick={handleAllBlocksDoubleClick}
            className={`${styles.contentContainer} ${isSelected ? styles.editable : styles.notEditable}`}
          >
            {isEditingAllBlocks ? (
              <textarea
                ref={allBlocksInputRef}
                value={editedAllContent}
                onChange={(e) => {
                  setEditedAllContent(e.target.value);
                  // 높이 자동 조절
                  if (allBlocksInputRef.current) {
                    allBlocksInputRef.current.style.height = 'auto';
                    allBlocksInputRef.current.style.height = allBlocksInputRef.current.scrollHeight + 'px';
                  }
                }}
                onBlur={handleAllBlocksBlur}
                onKeyDown={handleAllBlocksKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                className={styles.allBlocksTextarea}
              />
            ) : (
              <>
                {(() => {
                  if (!memo.blocks || memo.blocks.length === 0) {
                    return memo.content || '텍스트를 입력하세요...';
                  }

              // 기본 상태(모든 필터 활성화) 확인
              const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
              const isDefaultFilterState = (!activeImportanceFilters ||
                                          (activeImportanceFilters.size === allLevels.length &&
                                           allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                         showGeneralContent !== false;

              let totalContentLength = 0;
              const renderedBlocks: React.ReactNode[] = [];
              let consecutiveHiddenBlocks = 0; // 연속으로 숨겨진 블록 개수

              for (let index = 0; index < memo.blocks.length; index++) {
                const block = memo.blocks[index];

                if (totalContentLength >= sizeConfig.contentLength) {
                  renderedBlocks.push(<span key="more">...</span>);
                  break;
                }

                const blockVisible = isBlockVisible(block, activeImportanceFilters, showGeneralContent);

                if (blockVisible) {
                  // 연속으로 숨겨진 블록이 2개 이상일 때만 공백 표시
                  if (consecutiveHiddenBlocks >= 2) {
                    // 뒤에 더 표시될 블록이 있는지 확인
                    const hasVisibleBlocksAfter = memo.blocks.slice(index + 1).some(laterBlock => isBlockVisible(laterBlock, activeImportanceFilters, showGeneralContent));

                    if (hasVisibleBlocksAfter) {
                      const spacerHeight = getSpacerHeight(consecutiveHiddenBlocks);
                      renderedBlocks.push(
                        <div key={`spacer-${block.id}`} style={{
                          height: spacerHeight,
                          opacity: 0.3,
                          fontSize: '12px',
                          color: '#9ca3af',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ⋯
                        </div>
                      );
                    }
                  }

                  if (block.type === 'text') {
                    const content = block.content || '';
                    if (content.trim() === '') {
                      // 빈 텍스트 블록은 줄바꿈으로 표시
                      renderedBlocks.push(<br key={block.id} />);
                    } else {
                      const remainingLength = sizeConfig.contentLength - totalContentLength;
                      const displayContent = content.length > remainingLength
                        ? content.substring(0, remainingLength) + '...'
                        : content;

                      // importanceRanges 적용을 위해 TextBlock 타입으로 캐스팅
                      const textBlock = block as any;

                      // 기본 상태에서는 필터링 없이 원본 표시, 그 외에는 필터링 적용
                      const filteredResult = isDefaultFilterState
                        ? displayContent
                        : renderHighlightedText(displayContent, textBlock.importanceRanges, activeImportanceFilters, showGeneralContent);

                      // 실제 내용 렌더링
                      renderedBlocks.push(
                        <div
                          key={block.id}
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {isDefaultFilterState ? (
                            // 기본 상태에서는 하이라이팅 적용된 원본 표시
                            renderHighlightedText(displayContent, textBlock.importanceRanges, undefined, true)
                          ) : (
                            filteredResult
                          )}
                        </div>
                      );
                      totalContentLength += content.length;
                    }
                  } else if (block.type === 'image') {
                    const imageBlock = block as any;
                    if (imageBlock.url) {
                      const imageImportanceStyle = imageBlock.importance ? getImportanceStyle(imageBlock.importance) : {};
                      renderedBlocks.push(
                        <div key={block.id} style={{
                          margin: '4px 0',
                          padding: imageImportanceStyle.backgroundColor ? '8px' : '0',
                          backgroundColor: imageImportanceStyle.backgroundColor,
                          borderRadius: '4px',
                          border: (imageImportanceStyle as any).borderLeft
                        }}>
                          <img
                            src={imageBlock.url}
                            alt={imageBlock.alt || '이미지'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '60px',
                              borderRadius: '4px',
                              objectFit: 'cover'
                            }}
                          />
                          {imageBlock.caption && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                              {imageBlock.caption}
                            </div>
                          )}
                        </div>
                      );
                      totalContentLength += 50; // 이미지는 대략 50글자로 계산
                    }
                  } else if (block.type === 'callout') {
                    const calloutBlock = block as any;
                    renderedBlocks.push(
                      <div key={block.id} style={{
                        backgroundColor: '#f3f4f6',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        margin: '2px 0',
                        fontSize: '12px'
                      }}>
                        {calloutBlock.emoji && <span>{calloutBlock.emoji} </span>}
                        {calloutBlock.content}
                      </div>
                    );
                    totalContentLength += calloutBlock.content?.length || 0;
                  } else if (block.type === 'file') {
                    const fileBlock = block as any;
                    const fileImportanceStyle = fileBlock.importance ? getImportanceStyle(fileBlock.importance) : {};
                    renderedBlocks.push(
                      <div key={block.id} style={{
                        margin: '4px 0',
                        padding: '6px 8px',
                        backgroundColor: fileImportanceStyle.backgroundColor || '#f8f9fa',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        border: (fileImportanceStyle as any).borderLeft || 'none'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fileBlock.name || '파일'}
                        </div>
                      </div>
                    );
                    totalContentLength += 30; // 파일은 대략 30글자로 계산
                  } else if (block.type === 'bookmark') {
                    const bookmarkBlock = block as any;
                    const bookmarkImportanceStyle = bookmarkBlock.importance ? getImportanceStyle(bookmarkBlock.importance) : {};
                    try {
                      const urlObj = new URL(bookmarkBlock.url);
                      renderedBlocks.push(
                        <div key={block.id} style={{
                          margin: '4px 0',
                          padding: '8px',
                          backgroundColor: bookmarkImportanceStyle.backgroundColor || '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: (bookmarkImportanceStyle as any).borderLeft || '1px solid #e0e0e0'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            🔗 {bookmarkBlock.title || urlObj.hostname}
                          </div>
                          {bookmarkBlock.description && (
                            <div style={{ fontSize: '11px', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bookmarkBlock.description}
                            </div>
                          )}
                        </div>
                      );
                      totalContentLength += 40; // 북마크는 대략 40글자로 계산
                    } catch {
                      // URL 파싱 실패 시 기본 렌더링
                      renderedBlocks.push(
                        <div key={block.id} style={{
                          margin: '4px 0',
                          padding: '8px',
                          backgroundColor: bookmarkImportanceStyle.backgroundColor || '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '12px',
                          border: (bookmarkImportanceStyle as any).borderLeft || '1px solid #e0e0e0'
                        }}>
                          🔗 {bookmarkBlock.title || 'URL'}
                        </div>
                      );
                      totalContentLength += 20;
                    }
                  }

                  consecutiveHiddenBlocks = 0; // 보이는 블록 발견시 리셋
                } else {
                  consecutiveHiddenBlocks++; // 숨겨진 블록 카운트 증가
                }
              }

              return renderedBlocks.length > 0 ? renderedBlocks : '텍스트를 입력하세요...';
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* 연결점들 - 메모 블록 외부에 배치 */}
      <div
        className={`${styles.connectionPoint} ${styles.top}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.bottom}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.left}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>
      <div
        className={`${styles.connectionPoint} ${styles.right}`}
        onMouseDown={handleConnectionPointMouseDown}
        onMouseUp={handleConnectionPointMouseUp}
      >
        <div className={`${styles.connectionDot} ${isConnecting && connectingFromId === memo.id ? styles.connecting : styles.default}`} />
      </div>

      {/* 드래그 중 힌트 UI - 메모 오른쪽에 고정 */}
      {isDragging && !isShiftPressed && (
        <div
          className={styles.dragHint}
          style={{
            left: sizeConfig.width + 10
          }}
        >
          SHIFT + 드래그로 메모나 카테고리를 다른 카테고리 영역에 종속, 제거하세요
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onDelete={() => {
          if (onDelete) {
            onDelete(memo.id);
          }
        }}
        onSetQuickNav={() => {
          // 중복 체크
          if (isQuickNavExists && isQuickNavExists(memo.id, 'memo')) {
            alert('이미 단축 이동이 설정되어 있습니다.');
            return;
          }
          setShowQuickNavModal(true);
        }}
      />

      {/* 단축 이동 이름 입력 모달 */}
      <QuickNavModal
        isOpen={showQuickNavModal}
        onClose={() => {
          setShowQuickNavModal(false);
        }}
        onConfirm={handleQuickNavConfirm}
        initialName={memo.title || ''}
      />
    </div>
  );
};

export default MemoBlock;