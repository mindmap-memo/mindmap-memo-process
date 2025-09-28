import React from 'react';
import { MemoBlock, Page, ContentBlock, ContentBlockType, TextBlock, ImportanceLevel, CategoryBlock } from '../types';
import Resizer from './Resizer';
import ContentBlockComponent from './ContentBlock';
import GoogleAuth from './GoogleAuth';

interface RightPanelProps {
  selectedMemo: MemoBlock | undefined;
  selectedMemos: MemoBlock[];
  selectedCategory: CategoryBlock | undefined;
  selectedCategories: CategoryBlock[];
  currentPage: Page | undefined;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onCategorySelect: (categoryId: string, isShiftClick?: boolean) => void;
  onFocusMemo: (memoId: string) => void;
  width: number;
  onResize: (deltaX: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  selectedMemo,
  selectedMemos,
  selectedCategory,
  selectedCategories,
  currentPage,
  onMemoUpdate,
  onCategoryUpdate,
  onMemoSelect,
  onCategorySelect,
  onFocusMemo,
  width,
  onResize,
  isFullscreen = false,
  onToggleFullscreen,
  activeImportanceFilters,
  showGeneralContent = true,
  onResetFilters
}) => {
  // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
  const isDefaultFilterState = () => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];

    return (!activeImportanceFilters ||
            (activeImportanceFilters.size === allLevels.length &&
             allLevels.every(level => activeImportanceFilters.has(level)))) &&
           showGeneralContent !== false;
  };
  const [tagInput, setTagInput] = React.useState('');
  const [selectedBlocks, setSelectedBlocks] = React.useState<string[]>([]);
  const [dragSelectedBlocks, setDragSelectedBlocks] = React.useState<string[]>([]); // 드래그로 선택된 블록들
  const [isDragSelecting, setIsDragSelecting] = React.useState(false);
  const [dragJustCompleted, setDragJustCompleted] = React.useState(false); // 드래그 완료 직후 상태
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = React.useState({ x: 0, y: 0 });
  const [dragHoveredBlocks, setDragHoveredBlocks] = React.useState<string[]>([]);
  const [isDragMoved, setIsDragMoved] = React.useState(false); // 실제 드래그 움직임 감지

  // Undo/Redo 히스토리 관리
  const [undoHistory, setUndoHistory] = React.useState<any[]>([]);
  const [redoHistory, setRedoHistory] = React.useState<any[]>([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = React.useState(false); // Undo/Redo 중인지 확인
  const blocksContainerRef = React.useRef<HTMLDivElement>(null);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [isGoogleSignedIn, setIsGoogleSignedIn] = React.useState(false);
  const [showConnectedMemos, setShowConnectedMemos] = React.useState(false);

  // 공백 크기를 계산하는 함수 (최대 1블록 높이로 제한)
  const getSpacerHeight = (consecutiveHiddenBlocks: number): string => {
    if (consecutiveHiddenBlocks <= 1) return '0';
    return '0.8em'; // 적당한 공백 크기
  };

  // 블록이 필터링되어 보이는지 확인하는 함수
  const isBlockVisible = (block: ContentBlock): boolean => {
    // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
    const isDefaultFilterState = (!activeImportanceFilters ||
                                 (activeImportanceFilters.size === allLevels.length &&
                                  allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                showGeneralContent !== false;

    if (isDefaultFilterState) return true;

    if (block.type === 'text') {
      const textBlock = block as TextBlock;
      if (!textBlock.content || textBlock.content.trim() === '') {
        return showGeneralContent !== false;
      }

      if (!textBlock.importanceRanges || textBlock.importanceRanges.length === 0) {
        return showGeneralContent !== false;
      }

      // 필터에 맞는 중요도 범위가 있는지 확인
      return textBlock.importanceRanges.some(range =>
        activeImportanceFilters && activeImportanceFilters.has(range.level)
      ) || (showGeneralContent !== false && textBlock.importanceRanges.length < textBlock.content.length);
    }

    // 다른 블록 타입들은 기본적으로 표시
    return true;
  };

  // 선택된 블록 중 첫 번째 블록의 위치 계산
  const getTopSelectedBlockPosition = () => {
    if (selectedBlocks.length === 0 || !selectedMemo?.blocks) return null;
    
    const firstSelectedIndex = selectedMemo.blocks.findIndex(block => 
      selectedBlocks.includes(block.id)
    );
    
    if (firstSelectedIndex === -1) return null;
    
    return firstSelectedIndex;
  };

  // 전역 테이블 생성 신호 감지
  React.useEffect(() => {
    const checkForTableCreation = () => {
      const signal = (window as any).createTableAfterBlock;
      if (signal && selectedMemo) {
        const { afterBlockId, tableBlock } = signal;
        
        // 현재 메모에서 해당 블록 찾기
        const blockIndex = selectedMemo.blocks?.findIndex(block => block.id === afterBlockId);
        
        if (blockIndex !== undefined && blockIndex >= 0 && selectedMemo.blocks) {
          const updatedBlocks = [...selectedMemo.blocks];
          updatedBlocks.splice(blockIndex + 1, 0, tableBlock);
          
          onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
          
          // 신호 제거
          delete (window as any).createTableAfterBlock;
        }
      }
    };
    
    const interval = setInterval(checkForTableCreation, 100);
    return () => clearInterval(interval);
  }, [selectedMemo, onMemoUpdate]);

  // 기존 키보드 이벤트 리스너 제거 (중복)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, { title: e.target.value });
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && selectedMemo) {
      const newTag = tagInput.trim();
      if (!selectedMemo.tags.includes(newTag)) {
        onMemoUpdate(selectedMemo.id, { tags: [...selectedMemo.tags, newTag] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (selectedMemo) {
      onMemoUpdate(selectedMemo.id, { 
        tags: selectedMemo.tags.filter(tag => tag !== tagToRemove) 
      });
    }
  };

  // 블록 관련 핸들러들
  const handleBlockUpdate = (updatedBlock: ContentBlock) => {
    console.log('🔄 RightPanel handleBlockUpdate called with:', updatedBlock);
    if (selectedMemo) {
      console.log('📝 Selected memo before update:', selectedMemo);
      const updatedBlocks = selectedMemo.blocks?.map(block => {
        if (block.id === updatedBlock.id) {
          console.log('🎯 Updating block:', block.id, 'type:', block.type);
          // TextBlock의 경우 importanceRanges를 확실히 보존
          if (block.type === 'text' && updatedBlock.type === 'text') {
            const textBlock = block as TextBlock;
            const updatedTextBlock = updatedBlock as TextBlock;
            console.log('💾 Original importanceRanges:', textBlock.importanceRanges);
            console.log('📨 Updated importanceRanges:', updatedTextBlock.importanceRanges);

            // 업데이트된 블록에 importanceRanges가 있으면 사용, 없으면 원본 보존
            const finalImportanceRanges = updatedTextBlock.importanceRanges !== undefined
              ? updatedTextBlock.importanceRanges
              : (textBlock.importanceRanges || []);

            console.log('✅ Final importanceRanges:', finalImportanceRanges);

            return {
              ...updatedTextBlock,
              importanceRanges: finalImportanceRanges
            };
          }
          return updatedBlock;
        }
        return block;
      }) || [];
      console.log('📤 Updated blocks array:', updatedBlocks);
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    } else {
      console.log('❌ No selected memo found');
    }
  };

  const handleBlockDelete = (blockId: string) => {
    if (selectedMemo && selectedMemo.blocks && selectedMemo.blocks.length > 1) {
      saveToHistory(); // 삭제 전 히스토리 저장
      const updatedBlocks = selectedMemo.blocks.filter(block => block.id !== blockId);
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  };

  const handleBlockDuplicate = (blockId: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      saveToHistory(); // 복제 전 히스토리 저장
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        const originalBlock = selectedMemo.blocks[blockIndex];
        // 새로운 ID로 블록 복제
        const duplicatedBlock: ContentBlock = {
          ...originalBlock,
          id: Date.now().toString()
        };
        
        const updatedBlocks = [...selectedMemo.blocks];
        updatedBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
        onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
      }
    }
  };

  const handleBlockSelect = (blockId: string) => {
    // 드래그 핸들 버튼 클릭 시 해당 블록만 선택
    setSelectedBlocks([blockId]);
  };

  const handleBlockMove = (blockId: string, direction: 'up' | 'down') => {
    if (selectedMemo && selectedMemo.blocks) {
      const blocks = [...selectedMemo.blocks];
      const index = blocks.findIndex(block => block.id === blockId);
      
      if (direction === 'up' && index > 0) {
        [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
      } else if (direction === 'down' && index < blocks.length - 1) {
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      
      onMemoUpdate(selectedMemo.id, { blocks });
    }
  };

  const addNewBlock = (type: ContentBlockType) => {
    if (selectedMemo) {
      const newBlock: ContentBlock = createNewBlock(type);
      const updatedBlocks = [...(selectedMemo.blocks || []), newBlock];
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  };

  const createNewBlock = (type: ContentBlockType): ContentBlock => {
    const baseId = Date.now().toString();
    
    switch (type) {
      case 'text':
        return { id: baseId, type, content: '' };
      case 'callout':
        return { id: baseId, type, content: '', emoji: '💡', color: 'blue' };
      case 'checklist':
        return { id: baseId, type, items: [] };
      case 'image':
        return { id: baseId, type, url: '' };
      case 'file':
        return { id: baseId, type, url: '', name: '' };
      case 'bookmark':
        return { id: baseId, type, url: '' };
      case 'quote':
        return { id: baseId, type, content: '' };
      case 'code':
        return { id: baseId, type, content: '', language: 'javascript' };
      case 'table':
        return { 
          id: baseId, 
          type, 
          headers: ['컬럼 1', '컬럼 2'], 
          rows: [['', ''], ['', '']] 
        };
      case 'sheets':
        return {
          id: baseId,
          type,
          url: '',
          width: 800,
          height: 400,
          zoom: 100
        };
      default:
        return { id: baseId, type: 'text', content: '' } as any;
    }
  };

  const handleConvertBlock = (blockId: string, newBlockType: ContentBlockType) => {
    if (selectedMemo && selectedMemo.blocks) {
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return;

      const newBlock = createNewBlock(newBlockType);
      const updatedBlocks = [...selectedMemo.blocks];
      
      // 현재 블록 다음에 새 블록 타입 추가
      updatedBlocks.splice(blockIndex + 1, 0, newBlock);
      
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
    }
  };

  const handleCreateNewBlock = (afterBlockId: string, content: string) => {
    console.log('handleCreateNewBlock called:', afterBlockId, content);
    if (selectedMemo && selectedMemo.blocks) {
      saveToHistory(); // Enter 키로 새 블록 생성 시 히스토리 저장
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === afterBlockId);
      if (blockIndex === -1) return;

      const newBlock = createNewBlock('text') as any;
      newBlock.content = content;
      
      const updatedBlocks = [...selectedMemo.blocks];
      updatedBlocks.splice(blockIndex + 1, 0, newBlock);
      
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
      
      // 새 블록으로 포커스 이동 (약간의 지연 후)
      setTimeout(() => {
        const newTextarea = document.querySelector(`textarea[data-block-id="${newBlock.id}"]`) as HTMLTextAreaElement;
        if (newTextarea) {
          newTextarea.focus();
        }
      }, 50);
    }
  };

  const handleMergeWithPrevious = (blockId: string, currentContent: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);

      if (blockIndex > 0) {
        const currentBlock = selectedMemo.blocks[blockIndex];
        const previousBlock = selectedMemo.blocks[blockIndex - 1];

        // 이전 블록이 텍스트 블록인 경우에만 합치기
        if (previousBlock.type === 'text' && currentBlock.type === 'text') {
          saveToHistory(); // 블록 병합 시 히스토리 저장
          const previousContent = (previousBlock as any).content || '';
          const mergedContent = previousContent + currentContent;
          
          const updatedBlocks = [...selectedMemo.blocks];
          // 이전 블록의 내용을 합친 내용으로 업데이트
          updatedBlocks[blockIndex - 1] = { 
            ...previousBlock, 
            content: mergedContent 
          } as any;
          // 현재 블록 제거
          updatedBlocks.splice(blockIndex, 1);
          
          // 상태 업데이트를 즉시 실행
          onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
          
          // 포커스 이동을 더 긴 지연시간으로 설정
          setTimeout(() => {
            const previousTextarea = document.querySelector(`textarea[data-block-id="${previousBlock.id}"]`) as HTMLTextAreaElement;
            if (previousTextarea) {
              previousTextarea.focus();
              // 커서를 원래 이전 블록 내용의 끝으로 이동
              const cursorPosition = previousContent.length;
              previousTextarea.setSelectionRange(cursorPosition, cursorPosition);
              // 강제로 값을 다시 설정하여 확실하게 업데이트
              previousTextarea.value = mergedContent;
              previousTextarea.setSelectionRange(cursorPosition, cursorPosition);
            }
          }, 100);
        }
      }
    }
  };

  const handleFocusPrevious = (blockId: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex > 0) {
        // Focus the previous block - this would need to be implemented with refs
        // For now, we'll just handle the deletion part
      }
    }
  };

  const handleFocusNext = (blockId: string) => {
    if (selectedMemo && selectedMemo.blocks) {
      const blockIndex = selectedMemo.blocks.findIndex(block => block.id === blockId);
      if (blockIndex < selectedMemo.blocks.length - 1) {
        // Focus the next block - this would need to be implemented with refs
        // For now, we'll just handle basic navigation
      }
    }
  };

  // 블록 선택 관련 핸들러들
  const handleBlockClick = (blockId: string, event: React.MouseEvent) => {
    // 드래그가 아닌 클릭으로 선택하는 경우 dragSelectedBlocks 초기화
    setDragSelectedBlocks([]);
    
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // Shift/Ctrl/Cmd + 클릭: 다중 선택
      setSelectedBlocks(prev => 
        prev.includes(blockId) 
          ? prev.filter(id => id !== blockId)
          : [...prev, blockId]
      );
    } else {
      // 일반 클릭: 단일 선택
      setSelectedBlocks([blockId]);
    }
  };

  // 드래그 선택 핸들러들
  const handleMouseDown = (event: React.MouseEvent) => {
    // 버튼이나 인터랙티브 요소가 아닌 곳에서 드래그 시작
    const target = event.target as HTMLElement;
    const isInteractiveElement = target.tagName === 'BUTTON' || 
                                target.tagName === 'INPUT' || 
                                target.tagName === 'TEXTAREA' ||
                                target.closest('button') !== null;
    
    // 오른쪽 패널 전체에서 드래그 허용 (블록 편집 모드일 때만)
    const isInRightPanel = rightPanelRef.current?.contains(target) ||
                           blocksContainerRef.current?.contains(target);
    const isNotInBlockContent = !target.closest('[data-block-id]') ||
                               target.style.cursor === 'crosshair' ||
                               target.classList.contains('drag-zone');

    // Ctrl 키를 누르고 있으면 블록 내부에서도 드래그 선택 허용
    const allowBlockSelection = event.ctrlKey || event.metaKey;

    if (!isInteractiveElement && isInRightPanel && (isNotInBlockContent || allowBlockSelection) &&
        selectedMemo && !event.shiftKey) {
      event.preventDefault();
      
      // 블록 컨테이너가 있으면 그것 기준으로, 없으면 오른쪽 패널 기준으로 좌표 계산
      const container = blocksContainerRef.current || rightPanelRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const startPos = {
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        };
        
        setIsDragSelecting(true);
        setIsDragMoved(false); // 드래그 움직임 초기화
        setDragStart(startPos);
        setDragEnd(startPos);
        setDragHoveredBlocks([]);
        // 드래그 시작할 때 기존 선택 해제하지 않음 - 드래그 완료 후 새 선택으로 덮어씀
      }
    }
  };

  const handleMouseMove = React.useCallback((event: MouseEvent) => {
    if (isDragSelecting) {
      // 블록 컨테이너가 있으면 그것 기준으로, 없으면 오른쪽 패널 기준으로 좌표 계산
      const container = blocksContainerRef.current || rightPanelRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const currentPos = {
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top
        };
        
        // 드래그 임계값 확인 (5픽셀 이상 움직여야 드래그로 인식)
        const dragDistance = Math.sqrt(
          Math.pow(currentPos.x - dragStart.x, 2) + 
          Math.pow(currentPos.y - dragStart.y, 2)
        );
        
        if (dragDistance > 5) {
          setIsDragMoved(true);
        }
        
        setDragEnd(currentPos);
        
        // 선택 영역 계산
        const selectionRect = {
          left: Math.min(dragStart.x, currentPos.x),
          top: Math.min(dragStart.y, currentPos.y),
          right: Math.max(dragStart.x, currentPos.x),
          bottom: Math.max(dragStart.y, currentPos.y)
        };
        
        // 드래그 영역에 있는 블록들 실시간으로 하이라이트 (블록 컨테이너에서만)
        if (selectedMemo?.blocks && blocksContainerRef.current) {
          const blocksContainer = blocksContainerRef.current;
          const blockElements = blocksContainer.querySelectorAll('[data-block-id]');
          const blocksContainerRect = blocksContainer.getBoundingClientRect();
          const hoveredIds: string[] = [];
          const seenIds = new Set<string>();
          
          blockElements.forEach(element => {
            const blockRect = element.getBoundingClientRect();
            // 선택 영역은 드래그 컨테이너 기준이고, 블록 위치는 블록 컨테이너 기준
            const relativeBlockRect = {
              left: blockRect.left - blocksContainerRect.left,
              top: blockRect.top - blocksContainerRect.top,
              right: blockRect.right - blocksContainerRect.left,
              bottom: blockRect.bottom - blocksContainerRect.top
            };
            
            // 드래그 영역이 다른 컨테이너에서 시작된 경우 좌표 변환
            const dragOffsetX = containerRect.left - blocksContainerRect.left;
            const dragOffsetY = containerRect.top - blocksContainerRect.top;
            const adjustedSelectionRect = {
              left: selectionRect.left + dragOffsetX,
              top: selectionRect.top + dragOffsetY,
              right: selectionRect.right + dragOffsetX,
              bottom: selectionRect.bottom + dragOffsetY
            };
            
            // 블록이 선택 영역과 겹치는지 확인 (좌표 변환된 선택 영역 사용)
            if (relativeBlockRect.right >= adjustedSelectionRect.left &&
                relativeBlockRect.left <= adjustedSelectionRect.right &&
                relativeBlockRect.bottom >= adjustedSelectionRect.top &&
                relativeBlockRect.top <= adjustedSelectionRect.bottom) {
              const blockId = element.getAttribute('data-block-id');
              if (blockId && !seenIds.has(blockId)) {
                seenIds.add(blockId);
                hoveredIds.push(blockId);
              }
            }
          });
          
          setDragHoveredBlocks(hoveredIds);
        }
      }
    }
  }, [isDragSelecting, dragStart, selectedMemo?.blocks]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragSelecting) {
      console.log('🖱️ Mouse up - drag selecting:', {
        isDragMoved,
        dragHoveredBlocks,
        dragHoveredCount: dragHoveredBlocks.length
      });

      if (isDragMoved) {
        // 실제 드래그가 일어난 경우에만 선택 적용
        console.log('✅ Setting selected blocks:', dragHoveredBlocks);
        const selectedIds = [...dragHoveredBlocks]; // 복사본 생성
        setSelectedBlocks(selectedIds);
        setDragSelectedBlocks(selectedIds); // 드래그로 선택된 블록들 저장

        // 드래그 완료 직후 플래그 설정
        setDragJustCompleted(true);
        setTimeout(() => {
          setDragJustCompleted(false);
        }, 200); // 200ms 후 해제
      } else {
        console.log('❌ No drag movement detected');
      }

      // 드래그 상태 초기화는 선택 설정 후에
      setIsDragSelecting(false);
      setIsDragMoved(false);
      setDragHoveredBlocks([]);
    }
  }, [isDragSelecting, isDragMoved, dragHoveredBlocks]);

  // 마우스 이벤트 리스너 등록
  React.useEffect(() => {
    if (isDragSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragSelecting, handleMouseMove, handleMouseUp]);

  // selectedBlocks 변경 감지
  React.useEffect(() => {
    console.log('🎯 Selected blocks changed:', selectedBlocks);
  }, [selectedBlocks]);

  // 히스토리에 현재 상태 저장 (즉시 실행)
  const saveToHistory = React.useCallback(() => {
    if (!selectedMemo || isUndoRedoAction) {
      console.log('🚫 Not saving to history:', { selectedMemo: !!selectedMemo, isUndoRedoAction });
      return;
    }

    console.log('💾 saveToHistory called');
    const currentState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };

    console.log('📝 Current blocks being saved:', currentState.blocks.map((b: any) => ({ id: b.id, type: b.type, content: b.content?.substring(0, 50) })));

    // 마지막 상태와 동일하면 저장하지 않음
    setUndoHistory(prev => {
      const lastState = prev[prev.length - 1];
      if (lastState && JSON.stringify(lastState.blocks) === JSON.stringify(currentState.blocks)) {
        console.log('⏭️ Skipping duplicate history state');
        return prev;
      }

      console.log('✅ Saving new history state, total blocks:', currentState.blocks.length);
      const newHistory = [...prev, currentState];
      // 히스토리 크기 제한 (최대 50개)
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });

    // 새로운 액션이 발생하면 redo 히스토리 클리어
    setRedoHistory([]);
  }, [selectedMemo, isUndoRedoAction]);

  // 자동 히스토리 저장 제거 - 명시적인 액션에만 저장하도록 변경

  // Undo 기능
  const handleUndo = React.useCallback(() => {
    if (undoHistory.length === 0 || !selectedMemo) return;

    console.log('↩️ Performing undo');
    console.log('📊 Current undo history length:', undoHistory.length);
    console.log('📊 Undo history items (newest to oldest):', undoHistory.slice().reverse().map((h, i) => ({
      index: undoHistory.length - 1 - i,
      timestamp: new Date(h.timestamp).toLocaleTimeString(),
      blocks: h.blocks.map((b: any) => ({ id: b.id, type: b.type, content: b.content?.substring(0, 30) }))
    })));

    setIsUndoRedoAction(true);

    // 현재 상태를 redo 히스토리에 저장
    const currentState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };
    setRedoHistory(prev => [...prev, currentState]);

    // undo 히스토리에서 이전 상태 복원
    const previousState = undoHistory[undoHistory.length - 1];
    console.log('🔄 Restoring to state:', {
      timestamp: new Date(previousState.timestamp).toLocaleTimeString(),
      blocks: previousState.blocks.map((b: any) => ({ id: b.id, type: b.type, content: b.content?.substring(0, 30) }))
    });
    setUndoHistory(prev => prev.slice(0, -1));

    onMemoUpdate(selectedMemo.id, { blocks: previousState.blocks });

    setTimeout(() => {
      setIsUndoRedoAction(false);
    }, 100);
  }, [undoHistory, selectedMemo, onMemoUpdate]);

  // Redo 기능
  const handleRedo = React.useCallback(() => {
    if (redoHistory.length === 0 || !selectedMemo) return;

    console.log('↪️ Performing redo');
    setIsUndoRedoAction(true);

    // 현재 상태를 undo 히스토리에 저장
    const currentState = {
      blocks: selectedMemo.blocks ? JSON.parse(JSON.stringify(selectedMemo.blocks)) : [],
      timestamp: Date.now()
    };
    setUndoHistory(prev => [...prev, currentState]);

    // redo 히스토리에서 다음 상태 복원
    const nextState = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));

    onMemoUpdate(selectedMemo.id, { blocks: nextState.blocks });

    setTimeout(() => {
      setIsUndoRedoAction(false);
    }, 100);
  }, [redoHistory, selectedMemo, onMemoUpdate]);

  // 키보드 이벤트 처리 (Delete 키로 블록 삭제)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      // 입력 필드에 포커스가 있을 때 처리
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      if (isInputFocused) {

        // Enter 키는 항상 허용 (블록 생성을 위해)
        if (event.key === 'Enter') {
          return;
        }

        // Undo/Redo는 입력 필드에서도 허용 (z 또는 Z)
        if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
          // Undo/Redo 로직으로 넘어감
        }
        // 선택된 블록이 있고 Delete/Backspace를 눌렀을 때만 예외 처리
        else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlocks.length > 0) {
          // 텍스트가 선택되어 있거나 커서가 중간에 있으면 일반 편집 동작
          const textarea = activeElement as HTMLTextAreaElement;
          console.log('📝 Textarea info:', {
            selectionStart: textarea.selectionStart,
            selectionEnd: textarea.selectionEnd,
            valueLength: textarea.value.length,
            value: textarea.value
          });

          if (textarea.selectionStart !== textarea.selectionEnd ||
              (textarea.selectionStart > 0 && textarea.selectionStart < textarea.value.length)) {
            console.log('🔤 Text editing in progress - allowing normal behavior');
            return;
          }

          // 빈 입력 필드이거나 커서가 맨 앞/뒤에 있으면 블록 삭제 허용
          console.log('🎯 Input field focused but allowing block deletion');
        } else {
          return;
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksDelete();
        } else {
        }
      } else if (event.key === 'Escape') {
        if (selectedBlocks.length > 0) {
          setSelectedBlocks([]);
          setDragSelectedBlocks([]);
        }
      } else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('up');
        }
      } else if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
        if (selectedBlocks.length > 0) {
          event.preventDefault();
          handleBlocksMove('down');
        }
      } else if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
        if (event.shiftKey) {
          // Ctrl+Shift+Z: Redo
          event.preventDefault();
          handleRedo();
        } else {
          // Ctrl+Z: Undo
          event.preventDefault();
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBlocks, selectedMemo, onMemoUpdate, handleUndo, handleRedo]);

  const handleBlocksDelete = () => {
    console.log('🗑️ handleBlocksDelete called', {
      selectedMemo: selectedMemo?.id,
      selectedBlocks,
      blocksLength: selectedMemo?.blocks?.length
    });

    if (selectedMemo && selectedBlocks.length > 0) {
      // 삭제 전에 현재 상태를 히스토리에 저장
      saveToHistory();
      const updatedBlocks = selectedMemo.blocks?.filter(block =>
        !selectedBlocks.includes(block.id)
      ) || [];

      console.log('🔄 Filtered blocks:', {
        originalLength: selectedMemo.blocks?.length,
        filteredLength: updatedBlocks.length,
        deletedBlocks: selectedBlocks
      });

      // 최소 하나의 블록은 유지
      if (updatedBlocks.length === 0) {
        const newBlock = createNewBlock('text');
        updatedBlocks.push(newBlock);
        console.log('➕ Added new empty text block');
      }

      console.log('💾 Calling onMemoUpdate with updatedBlocks');
      onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });
      setSelectedBlocks([]);
      console.log('✅ Blocks deleted successfully');
    } else {
      console.log('❌ Cannot delete: no memo or no selected blocks');
    }
  };

  const handleBlocksMove = (direction: 'up' | 'down') => {
    if (selectedMemo && selectedBlocks.length > 0) {
      const blocks = [...(selectedMemo.blocks || [])];
      const selectedIndices = selectedBlocks
        .map(id => blocks.findIndex(b => b.id === id))
        .filter(index => index !== -1)
        .sort((a, b) => a - b);

      if (direction === 'up' && selectedIndices[0] > 0) {
        // 위로 이동
        selectedIndices.reverse().forEach(index => {
          [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
        });
      } else if (direction === 'down' && selectedIndices[selectedIndices.length - 1] < blocks.length - 1) {
        // 아래로 이동
        selectedIndices.forEach(index => {
          [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        });
      }

      onMemoUpdate(selectedMemo.id, { blocks });
    }
  };

  // 기존 메모에 blocks가 없으면 초기화
  const ensureBlocks = (memo: MemoBlock): MemoBlock => {
    if (!memo.blocks || memo.blocks.length === 0) {
      return {
        ...memo,
        blocks: memo.content ? 
          [{ id: memo.id + '_text', type: 'text', content: memo.content }] :
          [{ id: memo.id + '_text', type: 'text', content: '' }]
      };
    }
    return memo;
  };

  // 스마트 클릭 핸들러: 빈 공간 클릭 시 가장 가까운 블록에 포커스하거나 선택 해제
  const handleMemoAreaClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    console.log('🖱️ Memo area clicked:', {
      tagName: target.tagName,
      className: target.className,
      selectedBlocks: selectedBlocks.length,
      dragSelectedBlocks: dragSelectedBlocks.length
    });

    // 버튼이나 중요한 인터랙티브 요소만 제외
    const isButton = target.tagName === 'BUTTON' || target.closest('button') !== null;
    const isImportanceMenu = target.closest('[data-importance-menu]') !== null;

    // 텍스트 입력 중인 textarea는 제외 (클릭된 것이 textarea인 경우만)
    const isClickedTextarea = target.tagName === 'TEXTAREA';

    console.log('🔍 Memo area click analysis:', {
      isButton,
      isImportanceMenu,
      isClickedTextarea,
      dragJustCompleted
    });

    // 드래그 완료 직후에는 클릭 이벤트 무시
    if (dragJustCompleted) {
      console.log('⏱️ Ignoring click - drag just completed');
      return;
    }

    if (!isButton && !isImportanceMenu && selectedMemo?.blocks) {
      // 선택된 블록 위를 클릭한 경우인지 확인
      const clickedBlockElement = target.closest('[data-block-id]');
      const clickedBlockId = clickedBlockElement?.getAttribute('data-block-id');

      if (selectedBlocks.length > 0) {
        // 선택된 블록 중 하나를 클릭한 경우 - 선택 유지
        if (clickedBlockId && selectedBlocks.includes(clickedBlockId)) {
          console.log('💡 Clicked on selected block - maintaining selection');
          return;
        }

        // 다른 블록을 클릭하거나 빈 공간을 클릭한 경우 - 선택 해제
        console.log('🔄 Clearing selection - clicked elsewhere');
        setSelectedBlocks([]);
        setDragSelectedBlocks([]);

        // 다른 블록을 클릭한 경우에는 해당 블록 선택하지 않고 여기서 종료
        if (clickedBlockId) {
          return;
        }
      }
      
      // 클릭 위치에서 가장 가까운 블록 찾기 (거리 제한 없음)
      const clickY = event.clientY;
      const clickX = event.clientX;
      const container = blocksContainerRef.current;
      
      if (container) {
        const blockElements = container.querySelectorAll('[data-block-id]');
        
        if (blockElements.length === 0) {
          return;
        }
        
        type ClosestBlockType = { element: HTMLElement; distance: number; blockId: string };
        let closestBlock: ClosestBlockType | null = null;
        
        blockElements.forEach(element => {
          const rect = element.getBoundingClientRect();
          
          // 블록의 중심점과 클릭 위치의 거리 계산 (유클리드 거리)
          const blockCenterX = rect.left + rect.width / 2;
          const blockCenterY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(clickX - blockCenterX, 2) + 
            Math.pow(clickY - blockCenterY, 2)
          );
          
          if (!closestBlock || distance < closestBlock.distance) {
            const blockId = element.getAttribute('data-block-id');
            if (blockId) {
              const newClosestBlock: ClosestBlockType = { 
                element: element as HTMLElement, 
                distance, 
                blockId 
              };
              closestBlock = newClosestBlock;
            }
          }
        });
        
        // 가장 가까운 블록의 텍스트 영역에 포커스 (거리에 관계없이)
        if (closestBlock) {
          const blockElement = (closestBlock as ClosestBlockType).element;
          const textarea = blockElement.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            // 블록 선택 방지 - 단일 포커스만
            setTimeout(() => {
              textarea.focus();
              // 커서를 텍스트 끝으로 이동
              const length = textarea.value.length;
              textarea.setSelectionRange(length, length);
            }, 50);
          }
        }
      }
    }
  };


  const blockTypes = [
    { type: 'text' as ContentBlockType, label: '텍스트', icon: '📝' },
    { type: 'callout' as ContentBlockType, label: '콜아웃', icon: '💡' },
    { type: 'checklist' as ContentBlockType, label: '체크리스트', icon: '✓' },
    { type: 'quote' as ContentBlockType, label: '인용구', icon: '💬' },
    { type: 'code' as ContentBlockType, label: '코드', icon: '💻' },
    { type: 'image' as ContentBlockType, label: '이미지', icon: '🖼️' },
    { type: 'file' as ContentBlockType, label: '파일', icon: '📎' },
    { type: 'bookmark' as ContentBlockType, label: '북마크', icon: '🔖' },
    { type: 'table' as ContentBlockType, label: '테이블', icon: '📊' }
  ];

  return (
    <div 
      ref={rightPanelRef}
      onClick={handleMemoAreaClick}
      style={{
        display: 'flex',
        height: '100vh',
        flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #e1e5e9',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      width: isFullscreen ? '100vw' : `${width}px`,
      minWidth: '250px',
      zIndex: isFullscreen ? 9999 : 'auto'
    }}>
      {!isFullscreen && (
        <Resizer
          direction="right"
          onResize={onResize}
        />
      )}
      
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e1e5e9',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{
            margin: '0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            메모 편집
          </h2>

          {/* 필터링 해제 버튼 - 기본 상태가 아닐 때만 표시 */}
          {!isDefaultFilterState() && (
            <button
              onClick={() => onResetFilters && onResetFilters()}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              📝 필터링 해제 후 편집
            </button>
          )}
        </div>

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            style={{
              padding: '8px',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
          >
{isFullscreen ? '◧' : '⛶'}
          </button>
        )}
      </div>

      <div 
        ref={rightPanelRef}
        style={{ flex: 1, overflow: 'auto', padding: '16px' }}
        onMouseDown={handleMouseDown}
      >
        {(selectedMemos.length > 1 || selectedCategories.length > 1 || (selectedMemos.length > 0 && selectedCategories.length > 0)) ? (
          // 멀티 선택 모드
          <div>
            <h3 style={{
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              선택된 아이템 (메모 {selectedMemos.length}개, 카테고리 {selectedCategories.length}개)
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {/* 선택된 카테고리들 */}
              {selectedCategories.map(category => (
                <div
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: '#fff3e0',
                    border: '1px solid #ffb74d',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffe0b2';
                    e.currentTarget.style.borderColor = '#ff9800';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff3e0';
                    e.currentTarget.style.borderColor = '#ffb74d';
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {category.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '4px'
                  }}>
                    하위 아이템: {category.children.length}개
                  </div>
                </div>
              ))}

              {/* 선택된 메모들 */}
              {selectedMemos.map(memo => (
                <div
                  key={memo.id}
                  onClick={() => onFocusMemo(memo.id)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {memo.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {memo.content || '내용 없음'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedCategory ? (
          // 단일 카테고리 편집 모드
          <div>
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              <input
                type="text"
                value={selectedCategory.title}
                onChange={(e) => onCategoryUpdate({ ...selectedCategory, title: e.target.value })}
                placeholder="카테고리 제목을 입력하세요..."
                style={{
                  width: '100%',
                  padding: '2px 0',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  borderRadius: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  color: '#ff9800',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#ff9800';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              />
            </div>

            {/* 태그 관리 */}
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {selectedCategory.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {selectedCategory.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#ffe0b2',
                        color: '#e65100',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      #{tag}
                      <button
                        onClick={() => {
                          const newTags = selectedCategory.tags.filter((_, i) => i !== index);
                          onCategoryUpdate({ ...selectedCategory, tags: newTags });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#e65100',
                          fontSize: '14px',
                          padding: '0',
                          marginLeft: '2px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="태그를 입력하고 Enter를 누르세요..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const newTag = e.currentTarget.value.trim();
                    if (!selectedCategory.tags.includes(newTag)) {
                      onCategoryUpdate({
                        ...selectedCategory,
                        tags: [...selectedCategory.tags, newTag]
                      });
                    }
                    e.currentTarget.value = '';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff9800';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                }}
              />
            </div>

            {/* 연결된 아이템들 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                paddingLeft: '20px'
              }}>
                연결된 카테고리
              </h4>

              <div style={{ paddingLeft: '20px' }}>
                {selectedCategory.connections && selectedCategory.connections.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {selectedCategory.connections.map(connectionId => {
                      const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
                      const connectedCategory = currentPage?.categories?.find(c => c.id === connectionId);
                      const connectedItem = connectedMemo || connectedCategory;

                      if (!connectedItem) return null;

                      return (
                        <div
                          key={connectionId}
                          onClick={() => {
                            if (connectedMemo) {
                              onFocusMemo(connectionId);
                            } else if (connectedCategory) {
                              onCategorySelect(connectionId);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: connectedMemo ? '#f0f9ff' : '#fff3e0',
                            border: `1px solid ${connectedMemo ? '#bae6fd' : '#ffcc02'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>
                            {connectedMemo ? '📝 ' : ''}{connectedItem.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                    border: '1px dashed #d1d5db',
                    borderRadius: '6px'
                  }}>
                    연결된 아이템이 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 하위 카테고리 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '12px',
                paddingLeft: '20px'
              }}>
                하위 카테고리
              </h4>

              <div style={{ paddingLeft: '20px' }}>
                {selectedCategory.children && selectedCategory.children.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {selectedCategory.children.map(childId => {
                      const childCategory = currentPage?.categories?.find(c => c.id === childId);
                      const childMemo = currentPage?.memos.find(m => m.id === childId);
                      const childItem = childCategory || childMemo;

                      if (!childItem) return null;

                      return (
                        <div
                          key={childId}
                          onClick={() => {
                            if (childMemo) {
                              onFocusMemo(childId);
                            } else if (childCategory) {
                              onCategorySelect(childId);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: childMemo ? '#f0f9ff' : '#fff3e0',
                            border: `1px solid ${childMemo ? '#bae6fd' : '#ffcc02'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>
                            {childMemo ? '📝 ' : ''}{childItem.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                    border: '1px dashed #d1d5db',
                    borderRadius: '6px'
                  }}>
                    하위 아이템이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : selectedMemo ? (
          // 단일 메모 편집 모드
          <div>
            {/* 제목 입력 */}
            <div style={{ marginBottom: '20px', paddingLeft: '20px' }}>
              <input
                type="text"
                placeholder="제목을 입력해주세요"
                value={selectedMemo.title}
                onChange={handleTitleChange}
                style={{
                  width: '100%',
                  padding: '2px 0',
                  border: 'none',
                  borderBottom: '2px solid transparent',
                  borderRadius: '0',
                  fontSize: '24px',
                  fontWeight: '700',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  color: '#1f2937',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              />
            </div>

            {/* Google 인증 - 임시 숨김 */}
            {false && (
              <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                <GoogleAuth onAuthSuccess={setIsGoogleSignedIn} />
              </div>
            )}

            {/* 태그 관리 */}
            <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {selectedMemo.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginBottom: '8px' 
                }}>
                  {selectedMemo.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <input
                type="text"
                placeholder="태그를 입력하세요 (Enter로 추가)"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyPress={handleTagInputKeyPress}
                style={{
                  width: '100%',
                  padding: '2px 0',
                  border: 'none',
                  borderBottom: '1px solid #e5e7eb',
                  borderRadius: '0',
                  fontSize: '14px',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  color: '#6b7280',
                  transition: 'border-bottom-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                  e.target.style.color = '#1f2937';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = '#e5e7eb';
                  e.target.style.color = '#6b7280';
                }}
              />
            </div>

            {/* 연결된 메모들 */}
            {selectedMemo.connections.length > 0 && (
              <div style={{ marginBottom: '16px', paddingLeft: '20px' }}>
                <div
                  onClick={() => setShowConnectedMemos(!showConnectedMemos)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0,
                    marginRight: '8px'
                  }}>
                    연결된 메모 ({selectedMemo.connections.length})
                  </h4>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    style={{
                      transform: showConnectedMemos ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="#6b7280"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {showConnectedMemos && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    alignItems: 'start'
                  }}>
                    {selectedMemo.connections.map(connectionId => {
                      const connectedMemo = currentPage?.memos.find(m => m.id === connectionId);
                      return connectedMemo ? (
                        <div
                          key={connectionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusMemo(connectionId);
                          }}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6b7280',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <div style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            width: '100%'
                          }}>
                            {connectedMemo.title || '제목 없음'}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: 'fixed',
                    top: `${menuPosition.y}px`,
                    left: `${menuPosition.x}px`,
                    backgroundColor: 'white',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    minWidth: '150px',
                    zIndex: 1001
                  }}
                >
                  <div
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      color: '#666',
                      borderBottom: '1px solid #f0f0f0',
                      marginBottom: '4px'
                    }}
                  >
                    {selectedBlocks.length}개 블록 선택됨
                  </div>
                  <button
                    onClick={() => {
                      handleBlocksMove('up');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ↑ 위로 이동
                  </button>
                  <button
                    onClick={() => {
                      handleBlocksMove('down');
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ↓ 아래로 이동
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' }} />
                  <button
                    onClick={() => {
                      handleBlocksDelete();
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      color: '#ff4444'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBlocks([]);
                      setShowMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    선택 해제
                  </button>
                </div>
              </>
            )}

            {/* 블록들 렌더링 */}
            <div 
              ref={blocksContainerRef}
              style={{ 
                marginBottom: '16px',
                position: 'relative',
                userSelect: 'none',
                minHeight: '200px',
                padding: '20px'
              }}
            >
              {/* 드래그 선택 박스 오버레이 */}
              {isDragSelecting && isDragMoved && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(dragStart.x, dragEnd.x)}px`,
                    top: `${Math.min(dragStart.y, dragEnd.y)}px`,
                    width: `${Math.abs(dragEnd.x - dragStart.x)}px`,
                    height: `${Math.abs(dragEnd.y - dragStart.y)}px`,
                    backgroundColor: 'rgba(33, 150, 243, 0.15)', // 약간 더 진한 배경
                    border: '2px solid #2196f3',
                    borderRadius: '2px', // 살짝 둥근 모서리
                    pointerEvents: 'none',
                    zIndex: 999,
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)' // 그림자 추가로 더 잘 보이게
                  }}
                />
              )}
{(() => {
                const blocks = ensureBlocks(selectedMemo).blocks || [];
                const renderedElements: React.ReactElement[] = [];
                let consecutiveHiddenBlocks = 0;

                // 모든 중요도 필터가 활성화되어 있고 일반 내용도 표시하는 기본 상태인지 확인
                const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
                const isDefaultFilterState = (!activeImportanceFilters ||
                                             (activeImportanceFilters.size === allLevels.length &&
                                              allLevels.every(level => activeImportanceFilters.has(level)))) &&
                                            showGeneralContent !== false;

                blocks.forEach((block, index) => {
                  const isSelected = selectedBlocks.includes(block.id);
                  const topSelectedIndex = getTopSelectedBlockPosition();
                  const isFirstSelected = topSelectedIndex === index;
                  const blockVisible = isBlockVisible(block);

                  if (blockVisible) {
                    // 공백 처리: 숨겨진 블록이 2개 이상 연속으로 있었고, 기본 상태가 아닐 때
                    if (!isDefaultFilterState && consecutiveHiddenBlocks >= 2) {
                      // 마지막 블록인지 확인 (뒤에 보이는 블록이 있는지 체크)
                      const hasVisibleBlocksAfter = blocks.slice(index + 1).some(laterBlock => isBlockVisible(laterBlock));

                      if (hasVisibleBlocksAfter) {
                        const spacerHeight = getSpacerHeight(consecutiveHiddenBlocks);
                        renderedElements.push(
                          <div key={`spacer-${block.id}`} style={{
                            height: spacerHeight,
                            opacity: 0.4,
                            fontSize: '12px',
                            color: '#9ca3af',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '4px 0'
                          }}>
                            ⋯
                          </div>
                        );
                      }
                    }

                    renderedElements.push(
                      <React.Fragment key={block.id}>
                        <div data-block-id={block.id} style={{ position: 'relative', marginBottom: '0px' }}>
                          <ContentBlockComponent
                            block={block}
                            isEditing={true}
                            isSelected={isSelected}
                            isDragSelected={dragSelectedBlocks.includes(block.id)}
                            isDragHovered={dragHoveredBlocks.includes(block.id)}
                            pageId={currentPage?.id}
                            memoId={selectedMemo?.id}
                            onUpdate={handleBlockUpdate}
                            onDelete={handleBlockDelete}
                            onDuplicate={handleBlockDuplicate}
                            onMoveUp={(blockId) => handleBlockMove(blockId, 'up')}
                            onMoveDown={(blockId) => handleBlockMove(blockId, 'down')}
                            onConvertToBlock={handleConvertBlock}
                            onCreateNewBlock={handleCreateNewBlock}
                            onFocusPrevious={handleFocusPrevious}
                            onFocusNext={handleFocusNext}
                            onBlockClick={handleBlockClick}
                            onMergeWithPrevious={handleMergeWithPrevious}
                            onBlockSelect={handleBlockSelect}
                            onSaveToHistory={saveToHistory}
                            activeImportanceFilters={activeImportanceFilters}
                            showGeneralContent={showGeneralContent}
                            onResetFilters={onResetFilters}
                          />
                        </div>
                      </React.Fragment>
                    );

                    consecutiveHiddenBlocks = 0; // 리셋
                  } else {
                    // 블록이 숨겨짐
                    if (!isDefaultFilterState) {
                      consecutiveHiddenBlocks++;
                    }
                  }
                });

                return renderedElements;
              })()}
            </div>

          </div>
        ) : (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            메모나 카테고리를 선택하여 편집하세요
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;