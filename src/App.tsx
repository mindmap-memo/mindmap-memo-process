import React, { useState, useEffect } from 'react';
import { Page, MemoBlock, DataRegistry, MemoDisplaySize, ImportanceLevel, CategoryBlock, CanvasItem, CanvasHistory, CanvasAction, CanvasActionType } from './types';
import { globalDataRegistry } from './utils/dataRegistry';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Canvas from './components/Canvas';

// localStorage 키 상수
const STORAGE_KEYS = {
  PAGES: 'mindmap-memo-pages',
  CURRENT_PAGE_ID: 'mindmap-memo-current-page-id',
  PANEL_SETTINGS: 'mindmap-memo-panel-settings'
};

// 기본 데이터
const DEFAULT_PAGES: Page[] = [
  { id: '1', name: '페이지 1', memos: [], categories: [] }
];

// localStorage에서 데이터 로드 및 마이그레이션
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 페이지 데이터인 경우 categories 필드 마이그레이션
      if (key === STORAGE_KEYS.PAGES && Array.isArray(parsed)) {
        return parsed.map((page: any) => ({
          ...page,
          categories: (page.categories || []).map((category: any) => ({
            ...category,
            connections: category.connections || [] // connections 필드도 마이그레이션
          }))
        })) as T;
      }

      return parsed;
    }
  } catch (error) {
    console.error(`localStorage 로드 오류 (${key}):`, error);
  }
  return defaultValue;
};

// localStorage에 데이터 저장
const saveToStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`localStorage 저장 오류 (${key}):`, error);
  }
};

const App: React.FC = () => {
  // 한 번만 실행되는 localStorage 마이그레이션 (임시)
  useEffect(() => {
    const migrationDone = localStorage.getItem('categories-migration-done');
    if (!migrationDone) {
      console.log('🔄 카테고리 마이그레이션을 위해 localStorage 클리어 중...');
      localStorage.clear();
      localStorage.setItem('categories-migration-done', 'true');
      window.location.reload();
    }
  }, []);

  // localStorage에서 초기 데이터 로드
  const [pages, setPages] = useState<Page[]>(() =>
    loadFromStorage(STORAGE_KEYS.PAGES, DEFAULT_PAGES)
  );
  const [currentPageId, setCurrentPageId] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_PAGE_ID, '1')
  );
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // 패널 설정도 localStorage에서 로드
  const [panelSettings] = useState(() =>
    loadFromStorage(STORAGE_KEYS.PANEL_SETTINGS, {
      leftPanelOpen: true,
      rightPanelOpen: true,
      leftPanelWidth: 250,
      rightPanelWidth: 600
    })
  );
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(panelSettings.leftPanelOpen);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(panelSettings.rightPanelOpen);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(panelSettings.leftPanelWidth);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(panelSettings.rightPanelWidth);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnectMode, setIsDisconnectMode] = useState<boolean>(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Canvas history for undo/redo functionality
  const [canvasHistory, setCanvasHistory] = useState<CanvasHistory>(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    return {
      past: [],
      present: currentPage ? {
        type: 'memo_create',
        timestamp: Date.now(),
        pageSnapshot: {
          memos: [...currentPage.memos],
          categories: [...(currentPage.categories || [])]
        },
        description: 'Initial state'
      } : null,
      future: [],
      maxHistorySize: 50
    };
  });
  const [dragLineEnd, setDragLineEnd] = useState<{ x: number; y: number } | null>(null);

  // 중요도 필터 상태
  const [activeImportanceFilters, setActiveImportanceFilters] = useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [showGeneralContent, setShowGeneralContent] = useState<boolean>(true);
  const [isDragSelecting, setIsDragSelecting] = useState<boolean>(false);
  const [dragSelectStart, setDragSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSelectEnd, setDragSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragHoveredMemoIds, setDragHoveredMemoIds] = useState<string[]>([]);
  const [isDragSelectingWithShift, setIsDragSelectingWithShift] = useState<boolean>(false);
  const [isRightPanelFullscreen, setIsRightPanelFullscreen] = useState<boolean>(false);

  // 빠른 드래그 안정화를 위한 상태
  const lastDragTime = React.useRef<Map<string, number>>(new Map());
  const lastDragPosition = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const categoryExitTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 충돌 검사 디바운스를 위한 상태
  const collisionCheckTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCollisionCheck = React.useRef<Map<string, number>>(new Map());
  const collisionCheckCount = React.useRef<Map<string, number>>(new Map()); // 충돌 검사 횟수 추적
  const [dataRegistry, setDataRegistry] = useState<DataRegistry>({});
  const [isDraggingMemo, setIsDraggingMemo] = useState<boolean>(false);

  // Initialize data registry
  useEffect(() => {
    globalDataRegistry.setRegistry(dataRegistry);
    const unsubscribe = globalDataRegistry.subscribe(() => {
      setDataRegistry({ ...globalDataRegistry.getRegistry() });
    });
    return unsubscribe;
  }, [dataRegistry]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      // 모든 카테고리 종료 타이머 정리
      categoryExitTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryExitTimers.current.clear();

      // 카테고리 위치 업데이트 타이머 정리
      categoryPositionTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryPositionTimers.current.clear();

      // 충돌 검사 타이머 정리
      collisionCheckTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      collisionCheckTimers.current.clear();
    };
  }, []);

  // Canvas keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Canvas undo/redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoCanvasAction();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoCanvasAction();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canvasHistory]);

  // localStorage 자동 저장 - 페이지 데이터
  useEffect(() => {
    console.log('💾 페이지 데이터 저장 중...');
    saveToStorage(STORAGE_KEYS.PAGES, pages);
  }, [pages]);

  // localStorage 자동 저장 - 현재 페이지 ID
  useEffect(() => {
    console.log('💾 현재 페이지 ID 저장 중:', currentPageId);
    saveToStorage(STORAGE_KEYS.CURRENT_PAGE_ID, currentPageId);
  }, [currentPageId]);

  // localStorage 자동 저장 - 패널 설정
  useEffect(() => {
    const settings = {
      leftPanelOpen,
      rightPanelOpen,
      leftPanelWidth,
      rightPanelWidth
    };
    console.log('💾 패널 설정 저장 중:', settings);
    saveToStorage(STORAGE_KEYS.PANEL_SETTINGS, settings);
  }, [leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth]);

  // 현재 페이지 ID가 유효한지 확인하고 수정
  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
      console.log('⚠️ 현재 페이지 ID가 유효하지 않음. 첫 번째 페이지로 변경:', pages[0].id);
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  const currentPage = pages.find(page => page.id === currentPageId);
  const selectedMemo = currentPage?.memos.find(memo => memo.id === selectedMemoId) ||
                      (selectedMemoIds.length === 1 ? currentPage?.memos.find(memo => memo.id === selectedMemoIds[0]) : undefined);
  const selectedMemos = currentPage?.memos.filter(memo => selectedMemoIds.includes(memo.id)) || [];
  const selectedCategory = currentPage?.categories?.find(category => category.id === selectedCategoryId) ||
                          (selectedCategoryIds.length === 1 ? currentPage?.categories?.find(category => category.id === selectedCategoryIds[0]) : undefined);
  // 단일 선택과 다중 선택을 합쳐서 중복 제거
  const allSelectedCategoryIds = selectedCategoryId
    ? [selectedCategoryId, ...selectedCategoryIds.filter(id => id !== selectedCategoryId)]
    : selectedCategoryIds;
  const selectedCategories = currentPage?.categories?.filter(category => allSelectedCategoryIds.includes(category.id)) || [];

  const toggleRightPanelFullscreen = () => {
    setIsRightPanelFullscreen(!isRightPanelFullscreen);
  };

  const addPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      name: `페이지 ${pages.length + 1}`,
      memos: [],
      categories: []
    };
    setPages(prev => [...prev, newPage]);
  };

  const updatePageName = (pageId: string, newName: string) => {
    setPages(prev => prev.map(page => 
      page.id === pageId 
        ? { ...page, name: newName }
        : page
    ));
  };

  const deletePage = (pageId: string) => {
    if (pages.length <= 1) {
      alert('마지막 페이지는 삭제할 수 없습니다.');
      return;
    }
    
    setPages(prev => prev.filter(page => page.id !== pageId));
    
    // 삭제된 페이지가 현재 페이지인 경우 첫 번째 페이지로 이동
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(page => page.id !== pageId);
      if (remainingPages.length > 0) {
        setCurrentPageId(remainingPages[0].id);
      }
    }
    
    // 선택된 메모 초기화
    setSelectedMemoId(null);
    setSelectedMemoIds([]);
  };

  // 통합 메모 선택 핸들러 (멀티 선택 지원)
  const handleMemoSelect = (memoId: string, isShiftClick: boolean = false) => {
    // 카테고리 선택 해제
    setSelectedCategoryId(null);
    setSelectedCategoryIds([]);

    // 빈 문자열이거나 유효하지 않은 ID인 경우 모든 선택 해제
    if (!memoId || !currentPage?.memos.find(m => m.id === memoId)) {
      setSelectedMemoId(null);
      setSelectedMemoIds([]);
      return;
    }

    if (isShiftClick) {
      // Shift + 클릭: 멀티 선택
      setSelectedMemoIds(prev => {
        // 기존에 단일 선택된 메모가 있으면 다중 선택 목록에 추가
        const currentSelection = selectedMemoId ? [selectedMemoId, ...prev] : prev;

        if (currentSelection.includes(memoId)) {
          // 이미 선택된 경우 제거
          return currentSelection.filter(id => id !== memoId);
        } else {
          // 새로 추가
          return [...currentSelection, memoId];
        }
      });

      // 멀티 선택 시에는 단일 선택 해제
      setSelectedMemoId(null);
    } else {
      // 일반 클릭: 단일 선택
      setSelectedMemoId(memoId);
      setSelectedMemoIds([]);
    }
  };

  // 드래그 선택 관련 핸들러들
  const handleDragSelectStart = (position: { x: number; y: number }, isShiftPressed: boolean = false) => {
    setIsDragSelecting(true);
    setDragSelectStart(position);
    setDragSelectEnd(position);
    setIsDragSelectingWithShift(isShiftPressed);
  };

  const handleDragSelectMove = (position: { x: number; y: number }) => {
    if (isDragSelecting) {
      setDragSelectEnd(position);
      
      // 실시간으로 드래그 영역과 교집합된 메모들 계산
      if (dragSelectStart && currentPage) {
        const minX = Math.min(dragSelectStart.x, position.x);
        const maxX = Math.max(dragSelectStart.x, position.x);
        const minY = Math.min(dragSelectStart.y, position.y);
        const maxY = Math.max(dragSelectStart.y, position.y);

        const hoveredMemos = currentPage.memos.filter(memo => {
          const memoWidth = memo.size?.width || 200;
          const memoHeight = memo.size?.height || 95;
          const memoLeft = memo.position.x;
          const memoRight = memo.position.x + memoWidth;
          const memoTop = memo.position.y;
          const memoBottom = memo.position.y + memoHeight;
          
          return (memoLeft < maxX && memoRight > minX && memoTop < maxY && memoBottom > minY);
        });

        setDragHoveredMemoIds(hoveredMemos.map(memo => memo.id));
      }
    }
  };

  const handleDragSelectEnd = () => {
    if (isDragSelecting && dragSelectStart && dragSelectEnd && currentPage) {
      // 선택 영역 계산 (드래그 좌표는 이미 월드 좌표로 변환됨)
      const minX = Math.min(dragSelectStart.x, dragSelectEnd.x);
      const maxX = Math.max(dragSelectStart.x, dragSelectEnd.x);
      const minY = Math.min(dragSelectStart.y, dragSelectEnd.y);
      const maxY = Math.max(dragSelectStart.y, dragSelectEnd.y);

      console.log('Drag selection area:', { minX, maxX, minY, maxY });
      console.log('Available memos:');
      currentPage.memos.forEach(memo => {
        console.log(`Memo ${memo.id}:`, {
          position: memo.position,
          size: memo.size || { width: 200, height: 95 }
        });
      });

      const memosInSelection = currentPage.memos.filter(memo => {
        const memoWidth = memo.size?.width || 200;
        const memoHeight = memo.size?.height || 95;

        // 메모 블록의 경계 계산
        const memoLeft = memo.position.x;
        const memoRight = memo.position.x + memoWidth;
        const memoTop = memo.position.y;
        const memoBottom = memo.position.y + memoHeight;

        // 사각형 교집합 확인
        const intersects = (memoLeft < maxX && memoRight > minX && memoTop < maxY && memoBottom > minY);

        console.log(`Checking memo ${memo.id}:`, {
          memoBounds: { left: memoLeft, right: memoRight, top: memoTop, bottom: memoBottom },
          selectionBounds: { minX, maxX, minY, maxY },
          intersects: intersects
        });

        return intersects;
      });

      // 카테고리 선택 확인 (블록 또는 라벨)
      const categoriesInSelection = (currentPage.categories || []).filter(category => {
        const hasChildren = currentPage.memos.some(memo => memo.parentId === category.id) ||
                           currentPage.categories?.some(cat => cat.parentId === category.id);

        let intersects = false;

        if (hasChildren) {
          // 하위 아이템이 있는 경우: 일단 제외하고 하위 메모들만 선택하도록 함
          // (카테고리 라벨 선택은 복잡하므로 향후 개선)
          console.log(`Skipping category ${category.id} - has children, will be selected via child memos`);
          intersects = false;
        } else {
          // 하위 아이템이 없는 경우: 카테고리 블록과 교집합 확인
          const categoryWidth = category.size?.width || 200;
          const categoryHeight = category.size?.height || 95;

          const categoryLeft = category.position.x;
          const categoryRight = category.position.x + categoryWidth;
          const categoryTop = category.position.y;
          const categoryBottom = category.position.y + categoryHeight;

          intersects = (categoryLeft < maxX && categoryRight > minX && categoryTop < maxY && categoryBottom > minY);

          console.log(`Checking category block ${category.id}:`, {
            categoryBounds: { left: categoryLeft, right: categoryRight, top: categoryTop, bottom: categoryBottom },
            selectionBounds: { minX, maxX, minY, maxY },
            intersects: intersects,
            hasChildren: false,
            type: 'block'
          });
        }

        return intersects;
      });

      console.log('Memos in selection:', memosInSelection.length);
      console.log('Categories in selection:', categoriesInSelection.length);
      if (memosInSelection.length > 0 || categoriesInSelection.length > 0) {
        console.log('Setting selected memo IDs:', memosInSelection.map(memo => memo.id));
        console.log('Setting selected category IDs:', categoriesInSelection.map(category => category.id));
        if (isDragSelectingWithShift) {
          // Shift + 드래그: 기존 선택 유지하면서 드래그 영역 아이템들 토글
          const currentMemoSelection = selectedMemoId ? [selectedMemoId, ...selectedMemoIds] : selectedMemoIds;
          const currentCategorySelection = selectedCategoryId ? [selectedCategoryId, ...selectedCategoryIds] : selectedCategoryIds;
          let newMemoSelection = [...currentMemoSelection];
          let newCategorySelection = [...currentCategorySelection];

          memosInSelection.forEach(memo => {
            if (newMemoSelection.includes(memo.id)) {
              // 이미 선택된 메모는 선택 해제
              newMemoSelection = newMemoSelection.filter(id => id !== memo.id);
            } else {
              // 선택되지 않은 메모는 선택에 추가
              newMemoSelection.push(memo.id);
            }
          });

          categoriesInSelection.forEach(category => {
            if (newCategorySelection.includes(category.id)) {
              // 이미 선택된 카테고리는 선택 해제
              newCategorySelection = newCategorySelection.filter(id => id !== category.id);
            } else {
              // 선택되지 않은 카테고리는 선택에 추가
              newCategorySelection.push(category.id);
            }
          });

          setSelectedMemoIds(newMemoSelection);
          setSelectedMemoId(null);
          setSelectedCategoryIds(newCategorySelection);
          setSelectedCategoryId(null);
        } else {
          // 일반 드래그: 기존 선택 해제하고 드래그 영역 아이템들만 선택
          setSelectedMemoIds(memosInSelection.map(memo => memo.id));
          setSelectedMemoId(null);
          setSelectedCategoryIds(categoriesInSelection.map(category => category.id));
          setSelectedCategoryId(null);
        }
      } else if (!isDragSelectingWithShift) {
        console.log('No items in selection - clearing selection');
        // 일반 드래그로 아무것도 선택하지 않았으면 기존 선택 해제
        setSelectedMemoIds([]);
        setSelectedMemoId(null);
        setSelectedCategoryIds([]);
        setSelectedCategoryId(null);
      }
    }

    setIsDragSelecting(false);
    setDragSelectStart(null);
    setDragSelectEnd(null);
    setDragHoveredMemoIds([]);
    setIsDragSelectingWithShift(false);
  };

  // 중요도 필터 토글 함수
  const toggleImportanceFilter = (level: ImportanceLevel) => {
    setActiveImportanceFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  // 필터를 기본 상태로 리셋 (모든 중요도 필터 활성화 + 일반 내용 표시)
  const resetFiltersToDefault = () => {
    const allLevels: ImportanceLevel[] = ['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'];
    setActiveImportanceFilters(new Set(allLevels));
    setShowGeneralContent(true);
  };

  // 특정 메모로 화면 이동하는 함수
  const focusOnMemo = (memoId: string) => {
    const memo = currentPage?.memos.find(m => m.id === memoId);
    if (memo) {
      // 메모를 중앙으로 이동시키는 offset 계산
      const targetX = -(memo.position.x - window.innerWidth / 2 / 1 + (memo.size?.width || 200) / 2);
      const targetY = -(memo.position.y - window.innerHeight / 2 / 1 + (memo.size?.height || 95) / 2);
      
      // Canvas offset 업데이트는 Canvas 컴포넌트에서 처리하도록 함
      // 여기서는 단일 선택으로 변경
      setSelectedMemoId(memoId);
      setSelectedMemoIds([]);
    }
  };

  // 충돌하는 메모블록 밀어내기 함수
  const pushAwayConflictingMemos = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {
    console.log('📝 메모블록 밀어내기 시작:', categoryId);

    const conflictingMemos = page.memos.filter(memo => {
      // 현재 카테고리에 속한 메모는 제외
      if (memo.parentId === categoryId) return false;

      // 메모와 카테고리 영역의 충돌 검사
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      const memoBounds = {
        left: memo.position.x,
        top: memo.position.y,
        right: memo.position.x + memoWidth,
        bottom: memo.position.y + memoHeight
      };

      const areaBounds = {
        left: categoryArea.x,
        top: categoryArea.y,
        right: categoryArea.x + categoryArea.width,
        bottom: categoryArea.y + categoryArea.height
      };

      // 겹침 여부 확인 (더 넉넉한 여백으로 충돌 감지)
      const margin = 50; // 충돌 감지 여백 (넉넉하게)
      const isOverlapping = !(memoBounds.right + margin < areaBounds.left ||
                              memoBounds.left - margin > areaBounds.right ||
                              memoBounds.bottom + margin < areaBounds.top ||
                              memoBounds.top - margin > areaBounds.bottom);

      if (isOverlapping) {
        console.log('🚨 메모블록 충돌 감지:', memo.id, 'vs 카테고리', categoryId);
      }

      return isOverlapping;
    });

    // 충돌하는 메모들을 영역 밖으로 밀어내기
    conflictingMemos.forEach(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      const memoCenterX = memo.position.x + memoWidth / 2;
      const memoCenterY = memo.position.y + memoHeight / 2;
      const areaCenterX = categoryArea.x + categoryArea.width / 2;
      const areaCenterY = categoryArea.y + categoryArea.height / 2;

      // 메모 중심에서 영역 중심으로의 벡터 계산
      const deltaX = memoCenterX - areaCenterX;
      const deltaY = memoCenterY - areaCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let newX, newY;

      if (distance === 0) {
        // 중심이 같은 경우 오른쪽으로 밀어내기
        newX = categoryArea.x + categoryArea.width + 20;
        newY = memo.position.y;
      } else {
        // 강력한 벡터 방향 밀어내기 (충분한 거리 확보)
        const pushDistance = 100; // 밀어낼 거리를 크게 증가
        const safetyMargin = 20; // 추가 안전 여백
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;

        // 가장 가까운 영역 경계에서 충분히 멀리 밀어내기
        if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
          // 좌우로 밀어내기
          if (normalizedX > 0) {
            newX = categoryArea.x + categoryArea.width + pushDistance + safetyMargin;
          } else {
            newX = categoryArea.x - memoWidth - pushDistance - safetyMargin;
          }
          newY = memo.position.y;
        } else {
          // 상하로 밀어내기
          if (normalizedY > 0) {
            newY = categoryArea.y + categoryArea.height + pushDistance + safetyMargin;
          } else {
            newY = categoryArea.y - memoHeight - pushDistance - safetyMargin;
          }
          newX = memo.position.x;
        }
      }

      const newPosition = { x: newX, y: newY };
      console.log('🔄 메모블록 밀어내기:', memo.id, '새 위치:', newPosition);

      // 상태 업데이트를 지연시켜 무한 루프 방지
      setTimeout(() => {
        setPages(prevPages => prevPages.map(p =>
          p.id === currentPageId
            ? {
                ...p,
                memos: p.memos.map(m =>
                  m.id === memo.id
                    ? { ...m, position: newPosition }
                    : m
                )
              }
            : p
        ));
      }, 0);
    });
  }, [currentPageId]);

  // 충돌하는 카테고리 영역 밀어내기 함수
  const pushAwayConflictingCategories = React.useCallback((movingCategoryId: string, movingCategoryArea: { x: number; y: number; width: number; height: number }, page: Page) => {
    console.log('🏗️ 카테고리 영역 밀어내기 시작:', movingCategoryId);

    const conflictingCategories = page.categories?.filter(category => {
      if (category.id === movingCategoryId) return false;
      if (category.parentId === movingCategoryId || movingCategoryId === category.parentId) return false;

      const otherArea = calculateCategoryArea(category, page);
      if (!otherArea) return false;

      // 영역 간 충돌 검사
      const isOverlapping = !(movingCategoryArea.x + movingCategoryArea.width < otherArea.x ||
                              movingCategoryArea.x > otherArea.x + otherArea.width ||
                              movingCategoryArea.y + movingCategoryArea.height < otherArea.y ||
                              movingCategoryArea.y > otherArea.y + otherArea.height);

      if (isOverlapping) {
        console.log('🚨 카테고리 영역 충돌 감지:', movingCategoryId, 'vs', category.id);
      }

      return isOverlapping;
    }) || [];

    // 충돌하는 카테고리들과 그 하위 요소들을 밀어내기
    conflictingCategories.forEach(category => {
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;

      const movingCenterX = movingCategoryArea.x + movingCategoryArea.width / 2;
      const movingCenterY = movingCategoryArea.y + movingCategoryArea.height / 2;
      const categoryCenterX = category.position.x + categoryWidth / 2;
      const categoryCenterY = category.position.y + categoryHeight / 2;

      const deltaX = categoryCenterX - movingCenterX;
      const deltaY = categoryCenterY - movingCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let offsetX: number, offsetY: number;

      if (distance === 0) {
        // 중심이 같은 경우 오른쪽으로 밀어내기
        offsetX = movingCategoryArea.width + 50;
        offsetY = 0;
      } else {
        // 벡터 방향으로 밀어내기
        const pushDistance = 150; // 카테고리는 더 멀리 밀어내기
        const normalizedX = deltaX / distance;
        const normalizedY = deltaY / distance;

        offsetX = normalizedX * pushDistance;
        offsetY = normalizedY * pushDistance;
      }

      const newCategoryPosition = {
        x: category.position.x + offsetX,
        y: category.position.y + offsetY
      };

      console.log('🔄 카테고리 밀어내기:', category.id, '새 위치:', newCategoryPosition);

      // 카테고리와 하위 요소들을 함께 이동
      setTimeout(() => {
        setPages(prevPages => prevPages.map(page => {
          if (page.id !== currentPageId) return page;

          // 하위 메모들도 함께 이동
          const updatedMemos = page.memos.map(memo =>
            memo.parentId === category.id
              ? {
                  ...memo,
                  position: {
                    x: memo.position.x + offsetX,
                    y: memo.position.y + offsetY
                  }
                }
              : memo
          );

          // 하위 카테고리들도 함께 이동
          const updatedCategories = (page.categories || []).map(cat =>
            cat.id === category.id
              ? { ...cat, position: newCategoryPosition }
              : cat.parentId === category.id
              ? {
                  ...cat,
                  position: {
                    x: cat.position.x + offsetX,
                    y: cat.position.y + offsetY
                  }
                }
              : cat
          );

          return {
            ...page,
            memos: updatedMemos,
            categories: updatedCategories
          };
        }));
      }, 0);
    });
  }, [currentPageId]);

  // 통합 충돌 감지 및 밀어내기 함수 (10번 제한)
  const pushAwayConflictingBlocks = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {
    // 10번 제한 안전장치
    const currentCount = collisionCheckCount.current.get(categoryId) || 0;
    if (currentCount >= 10) {
      console.log('🛑 충돌 검사 10번 제한 도달:', categoryId);
      return;
    }
    collisionCheckCount.current.set(categoryId, currentCount + 1);

    // 무한 충돌 방지 - 최근 1초 내에 충돌 검사를 했으면 스킵
    const now = Date.now();
    const lastCheck = lastCollisionCheck.current.get(categoryId) || 0;
    if (now - lastCheck < 1000) {
      console.log('⏸️ 충돌 검사 스킵 (디바운스):', categoryId);
      return;
    }
    lastCollisionCheck.current.set(categoryId, now);

    // 10초 후 카운터 리셋
    setTimeout(() => {
      collisionCheckCount.current.set(categoryId, 0);
      console.log('🔄 충돌 검사 카운터 리셋:', categoryId);
    }, 10000);

    console.log(`🔍 통합 충돌 검사 시작 (${currentCount + 1}/5):`, {
      categoryId,
      categoryArea,
      totalMemos: page.memos.length
    });

    // 1. 먼저 다른 카테고리 영역과의 충돌 검사 및 해결
    pushAwayConflictingCategories(categoryId, categoryArea, page);

    // 2. 그 다음 메모블록과의 충돌 검사 및 해결
    pushAwayConflictingMemos(categoryArea, categoryId, page);

    console.log('✅ 모든 충돌 유형 처리 완료:', categoryId);
  }, [currentPageId, pushAwayConflictingCategories, pushAwayConflictingMemos, collisionCheckCount, lastCollisionCheck]);


  // 카테고리 영역 계산 헬퍼 함수
  const calculateCategoryArea = (category: CategoryBlock, page: Page, visited: Set<string> = new Set()) => {
    // 순환 참조 방지
    if (visited.has(category.id)) {
      return null;
    }
    visited.add(category.id);

    const childMemos = page.memos.filter(memo => memo.parentId === category.id);
    const childCategories = page.categories?.filter(cat => cat.parentId === category.id) || [];

    // 하위 아이템이 없으면 영역 계산 안함
    if (childMemos.length === 0 && childCategories.length === 0) {
      visited.delete(category.id);
      return null;
    }

    // 카테고리 블록 자체의 위치와 크기
    const categoryWidth = category.size?.width || 200;
    const categoryHeight = category.size?.height || 80;

    let minX = category.position.x;
    let minY = category.position.y;
    let maxX = category.position.x + categoryWidth;
    let maxY = category.position.y + categoryHeight;

    // 하위 메모들의 경계 포함
    childMemos.forEach(memo => {
      const memoWidth = memo.size?.width || 200;
      const memoHeight = memo.size?.height || 95;
      minX = Math.min(minX, memo.position.x);
      minY = Math.min(minY, memo.position.y);
      maxX = Math.max(maxX, memo.position.x + memoWidth);
      maxY = Math.max(maxY, memo.position.y + memoHeight);
    });

    // 하위 카테고리들의 경계도 포함 (재귀적으로, 방문 집합 전달)
    childCategories.forEach(childCategory => {
      const childArea = calculateCategoryArea(childCategory, page, visited);
      if (childArea) {
        minX = Math.min(minX, childArea.x);
        minY = Math.min(minY, childArea.y);
        maxX = Math.max(maxX, childArea.x + childArea.width);
        maxY = Math.max(maxY, childArea.y + childArea.height);
      }
    });

    // 방문 완료 후 제거 (다른 브랜치에서 재방문 가능하도록)
    visited.delete(category.id);

    // 여백 추가 (적절한 간격)
    const padding = 20;
    let proposedArea = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };

    // 다른 카테고리 영역과의 충돌 방지
    const otherCategories = page.categories?.filter(cat =>
      cat.id !== category.id &&
      cat.parentId !== category.id &&
      category.parentId !== cat.id
    ) || [];

    for (const otherCategory of otherCategories) {
      const newVisited = new Set(visited);
      newVisited.add(category.id);
      const otherArea = calculateCategoryArea(otherCategory, page, newVisited);
      if (otherArea) {
        // 겹침 확인
        const isOverlapping = !(proposedArea.x + proposedArea.width < otherArea.x ||
                                proposedArea.x > otherArea.x + otherArea.width ||
                                proposedArea.y + proposedArea.height < otherArea.y ||
                                proposedArea.y > otherArea.y + otherArea.height);

        if (isOverlapping) {
          console.log('🚫 카테고리 영역 충돌 감지:', category.id, 'vs', otherCategory.id);

          // 충돌 시 영역 크기 축소 (최소한의 공간만 사용)
          const minimalPadding = 10;
          proposedArea = {
            x: minX - minimalPadding,
            y: minY - minimalPadding,
            width: maxX - minX + minimalPadding * 2,
            height: maxY - minY + minimalPadding * 2
          };

          // 여전히 겹치면 위치 조정
          const stillOverlapping = !(proposedArea.x + proposedArea.width < otherArea.x ||
                                     proposedArea.x > otherArea.x + otherArea.width ||
                                     proposedArea.y + proposedArea.height < otherArea.y ||
                                     proposedArea.y > otherArea.y + otherArea.height);

          if (stillOverlapping) {
            // 다른 영역과 겹치지 않는 위치로 조정
            const gapDistance = 20;
            const currentCenterX = proposedArea.x + proposedArea.width / 2;
            const currentCenterY = proposedArea.y + proposedArea.height / 2;
            const otherCenterX = otherArea.x + otherArea.width / 2;
            const otherCenterY = otherArea.y + otherArea.height / 2;

            const deltaX = currentCenterX - otherCenterX;
            const deltaY = currentCenterY - otherCenterY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              // 좌우로 분리
              if (deltaX > 0) {
                proposedArea.x = otherArea.x + otherArea.width + gapDistance;
              } else {
                proposedArea.x = otherArea.x - proposedArea.width - gapDistance;
              }
            } else {
              // 상하로 분리
              if (deltaY > 0) {
                proposedArea.y = otherArea.y + otherArea.height + gapDistance;
              } else {
                proposedArea.y = otherArea.y - proposedArea.height - gapDistance;
              }
            }

            console.log('🔧 카테고리 영역 위치 조정:', category.id, '새 위치:', proposedArea);
          }
          break; // 첫 번째 충돌 해결 후 종료
        }
      }
    }

    return proposedArea;
  };

  const addMemoBlock = (position?: { x: number; y: number }) => {
    const newPosition = position || { x: 300, y: 200 };

    // 위치에 따라 적절한 카테고리 찾기
    let parentCategoryId: string | null = null;
    if (position) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage?.categories) {
        for (const category of currentPage.categories) {
          if (category.isExpanded) {
            const area = calculateCategoryArea(category, currentPage);
            if (area &&
                position.x >= area.x &&
                position.x <= area.x + area.width &&
                position.y >= area.y &&
                position.y <= area.y + area.height) {
              parentCategoryId = category.id;
              break;
            }
          }
        }
      }
    }

    const newMemo: MemoBlock = {
      id: Date.now().toString(),
      title: '',
      content: '',
      blocks: [
        {
          id: Date.now().toString() + '_text',
          type: 'text',
          content: ''
        }
      ],
      tags: [],
      connections: [],
      position: newPosition,
      displaySize: 'medium',
      parentId: parentCategoryId
    };

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: [...page.memos, newMemo] }
        : page
    ));

    // Save canvas state for undo/redo
    setTimeout(() => saveCanvasState('memo_create', `메모 생성: ${newMemo.id}`), 0);
  };

  // Category management functions
  const addCategory = (position?: { x: number; y: number }) => {
    const newCategory: CategoryBlock = {
      id: Date.now().toString(),
      title: 'New Category',
      tags: [],
      connections: [],
      position: position || { x: 300, y: 200 },
      isExpanded: true,
      children: []
    };

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, categories: [...(page.categories || []), newCategory] }
        : page
    ));

    // Save canvas state for undo/redo
    setTimeout(() => saveCanvasState('category_create', `카테고리 생성: ${newCategory.title}`), 0);
  };

  const updateCategory = (category: CategoryBlock) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(cat =>
              cat.id === category.id
                ? category
                : cat
            )
          }
        : page
    ));
  };

  const deleteCategory = (categoryId: string) => {
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        const categoryToDelete = (page.categories || []).find(c => c.id === categoryId);
        if (categoryToDelete) {
          // Move children to top level
          const updatedMemos = page.memos.map(memo => ({
            ...memo,
            parentId: memo.parentId === categoryId ? undefined : memo.parentId,
            connections: memo.connections.filter(connId => connId !== categoryId) // 삭제된 카테고리로의 연결 제거
          }));
          const updatedCategories = (page.categories || [])
            .filter(c => c.id !== categoryId)
            .map(c => ({
              ...c,
              parentId: c.parentId === categoryId ? undefined : c.parentId,
              connections: c.connections.filter(connId => connId !== categoryId), // 삭제된 카테고리로의 연결 제거
              children: c.children.filter(childId => childId !== categoryId) // 자식 목록에서도 제거
            }));

          return { ...page, memos: updatedMemos, categories: updatedCategories };
        }
      }
      return page;
    }));
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(category =>
              category.id === categoryId
                ? { ...category, isExpanded: !category.isExpanded }
                : category
            )
          }
        : page
    ));
  };

  const moveToCategory = (itemId: string, categoryId: string | null) => {
    console.log('moveToCategory 호출됨:', { itemId, categoryId });

    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        // Determine if item is memo or category
        const isMemo = page.memos.some(memo => memo.id === itemId);
        const isCategory = (page.categories || []).some(cat => cat.id === itemId);

        console.log('아이템 타입 확인:', { isMemo, isCategory });

        if (isMemo) {
          const targetCategory = categoryId ? (page.categories || []).find(cat => cat.id === categoryId) : null;

          const updatedMemos = page.memos.map(memo => {
            if (memo.id === itemId) {
              let newPosition = memo.position;

              // 카테고리에 종속시킬 때 위치를 카테고리 내부로 조정
              if (categoryId && targetCategory) {
                const categoryWidth = targetCategory.size?.width || 200;
                const categoryHeight = targetCategory.size?.height || 80;

                newPosition = {
                  x: targetCategory.position.x + 30, // 카테고리 내부로 30px 들여쓰기
                  y: targetCategory.position.y + categoryHeight + 20 // 카테고리 블록 바로 아래 20px
                };

                console.log('📍 종속 메모 위치 조정:', {
                  카테고리위치: targetCategory.position,
                  카테고리크기: { width: categoryWidth, height: categoryHeight },
                  새위치: newPosition
                });
              }

              return { ...memo, parentId: categoryId || undefined, position: newPosition };
            }
            return memo;
          });
          const updatedCategories = (page.categories || []).map(category => {
            if (categoryId && category.id === categoryId) {
              return {
                ...category,
                children: category.children.includes(itemId)
                  ? category.children
                  : [...category.children, itemId]
              };
            }
            // Remove from other categories
            return {
              ...category,
              children: category.children.filter(childId => childId !== itemId)
            };
          });
          return { ...page, memos: updatedMemos, categories: updatedCategories };
        } else if (isCategory) {
          console.log('카테고리를 이동 중:', itemId, '->', categoryId);
          const updatedCategories = (page.categories || []).map(category => {
            if (category.id === itemId) {
              console.log('카테고리의 parentId 업데이트:', category.id, '->', categoryId);
              return { ...category, parentId: categoryId || undefined };
            }
            if (categoryId && category.id === categoryId) {
              const newChildren = category.children.includes(itemId)
                ? category.children
                : [...category.children, itemId];
              console.log('부모 카테고리의 children 업데이트:', category.id, newChildren);
              return {
                ...category,
                children: newChildren
              };
            }
            // Remove from other categories
            const filteredChildren = category.children.filter(childId => childId !== itemId);
            if (filteredChildren.length !== category.children.length) {
              console.log('다른 카테고리에서 제거:', category.id, filteredChildren);
            }
            return {
              ...category,
              children: filteredChildren
            };
          });
          console.log('업데이트된 카테고리들:', updatedCategories);
          return { ...page, categories: updatedCategories };
        }
      }
      return page;
    }));

    // 카테고리에 메모를 추가한 경우 충돌 검사 수행 (5번 제한)
    if (categoryId) {
      console.log('🎯 moveToCategory에서 충돌 검사 예약:', categoryId);
      setTimeout(() => {
        console.log('⏰ 충돌 검사 타이머 실행:', categoryId);
        // 최신 상태를 가져오기 위해 setPages 콜백 사용
        setPages(prevPages => {
          const currentPage = prevPages.find(p => p.id === currentPageId);
          const targetCategory = currentPage?.categories?.find(cat => cat.id === categoryId);

          console.log('🔍 충돌 검사 대상:', {
            currentPageId,
            categoryId,
            hasCurrentPage: !!currentPage,
            hasTargetCategory: !!targetCategory
          });

          if (currentPage && targetCategory) {
            const categoryArea = calculateCategoryArea(targetCategory, currentPage);
            console.log('📐 계산된 카테고리 영역:', categoryArea);
            if (categoryArea) {
              console.log('🔧 카테고리 영역 충돌 검사 수행:', categoryId);
              pushAwayConflictingBlocks(categoryArea, categoryId, currentPage);
            } else {
              console.log('❌ 카테고리 영역 계산 실패');
            }
          } else {
            console.log('❌ 필요한 데이터 없음');
          }
          return prevPages; // 상태는 변경하지 않고 최신 값만 확인
        });
      }, 100); // 짧은 지연으로 더 빠른 반응
    } else {
      console.log('❌ categoryId가 없어서 충돌 검사 스킵');
    }

    // Save canvas state for undo/redo
    const targetName = categoryId ? `카테고리 ${categoryId}` : '최상위';
    setTimeout(() => saveCanvasState('move_to_category', `종속 변경: ${itemId} → ${targetName}`), 0);
  };

  // 드래그 완료 시 카테고리 블록 겹침 감지
  const detectCategoryOnDrop = (memoId: string, position: { x: number; y: number }) => {
    console.log('🔍 블록 겹침 감지 시작:', memoId, position);

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      console.log('❌ 현재 페이지 또는 카테고리 없음');
      return;
    }

    const draggedMemo = currentPage.memos.find(m => m.id === memoId);
    if (!draggedMemo) {
      console.log('❌ 드래그된 메모 없음');
      return;
    }

    // 드래그 속도 계산을 위한 시간과 위치 추적
    const now = Date.now();
    const lastTime = lastDragTime.current.get(memoId) || now;
    const lastPos = lastDragPosition.current.get(memoId) || position;
    const timeDelta = now - lastTime;
    const distance = Math.sqrt(
      Math.pow(position.x - lastPos.x, 2) + Math.pow(position.y - lastPos.y, 2)
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // 현재 위치와 시간 업데이트
    lastDragTime.current.set(memoId, now);
    lastDragPosition.current.set(memoId, position);

    console.log('🚀 드래그 속도:', velocity.toFixed(2), 'px/ms');


    // 드래그된 메모의 경계 박스 계산
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };

    console.log('📦 드래그된 메모 경계:', memoBounds);

    // 겹침 감지 함수 (여백 포함)
    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    const targetCategory = currentPage.categories.find(category => {
      // 카테고리의 경계 박스 계산
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      console.log(`🔸 카테고리 ${category.id} (${category.title}) 경계:`, categoryBounds);

      const overlapping = isOverlapping(memoBounds, categoryBounds);
      console.log(`🔸 겹침 여부: ${overlapping}`);

      return overlapping;
    });

    if (targetCategory) {
      // 같은 카테고리로 이동하려는 경우 - 실제 겹침이므로 정상적인 카테고리 내 이동
      if (draggedMemo.parentId === targetCategory.id) {
        console.log('📍 같은 카테고리 내에서 이동:', memoId, '카테고리:', targetCategory.id);
        return;
      }

      // 다른 카테고리로 이동하는 경우 - 허용하되 로그 출력
      if (draggedMemo.parentId && draggedMemo.parentId !== targetCategory.id) {
        console.log('🔄 다른 카테고리로 이동:', memoId, '이전 카테고리:', draggedMemo.parentId, '→ 새 카테고리:', targetCategory.id);
      }

      // 연결된 메모인지 확인
      const hasConnections = draggedMemo.connections && draggedMemo.connections.length > 0;
      if (hasConnections) {
        console.log('🔗 연결된 메모블록 카테고리 종속:', memoId, '->', targetCategory.id, '(연결선 유지)');
      } else {
        console.log('🎯 블록 겹침으로 카테고리 감지:', memoId, '->', targetCategory.id);
      }
      moveToCategory(memoId, targetCategory.id);
    } else {
      // 카테고리 블록과 겹치지 않았을 때
      if (draggedMemo.parentId) {
        // 현재 소속된 카테고리의 영역에서도 벗어났는지 확인
        const currentCategory = currentPage.categories.find(cat => cat.id === draggedMemo.parentId);

        if (currentCategory) {
          // 현재 카테고리의 실제 영역 계산 (하위 메모들 포함)
          const childMemos = currentPage.memos.filter(memo => memo.parentId === currentCategory.id);

          const categoryWidth = currentCategory.size?.width || 200;
          const categoryHeight = currentCategory.size?.height || 80;

          let minX = currentCategory.position.x;
          let minY = currentCategory.position.y;
          let maxX = currentCategory.position.x + categoryWidth;
          let maxY = currentCategory.position.y + categoryHeight;

          // 하위 메모들의 경계 포함
          childMemos.forEach(memo => {
            const memoWidth = memo.size?.width || 200;
            const memoHeight = memo.size?.height || 95;
            minX = Math.min(minX, memo.position.x);
            minY = Math.min(minY, memo.position.y);
            maxX = Math.max(maxX, memo.position.x + memoWidth);
            maxY = Math.max(maxY, memo.position.y + memoHeight);
          });

          // 적절한 패딩 적용 (빠른 드래그 시 영역 이탈 방지하되 너무 크지 않게)
          const padding = 70;
          const categoryAreaBounds = {
            left: minX - padding,
            top: minY - padding,
            right: maxX + padding,
            bottom: maxY + padding
          };

          // 현재 카테고리 영역과 겹치는지 확인
          const stillInArea = isOverlapping(memoBounds, categoryAreaBounds, 0);

          if (!stillInArea) {
            // 빠른 드래그 시 안정화: 속도가 높으면 지연 처리
            const velocityThreshold = 1.0; // px/ms
            const exitDelay = velocity > velocityThreshold ? 300 : 100; // ms

            console.log('🚀 빠른 드래그 감지 (속도:', velocity.toFixed(2), 'px/ms), 지연 시간:', exitDelay, 'ms');

            // 기존 타이머가 있으면 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            // 지연 후 카테고리에서 빼내기
            const timer = setTimeout(() => {
              // 지연 시간 후 다시 위치 확인
              const currentMemo = pages.find(p => p.id === currentPageId)?.memos.find(m => m.id === memoId);
              if (!currentMemo || !currentMemo.parentId) {
                categoryExitTimers.current.delete(memoId);
                return;
              }

              // 최종 위치에서 다시 영역 체크
              const currentMemoWidth = currentMemo.size?.width || 200;
              const currentMemoHeight = currentMemo.size?.height || 95;
              const currentMemoBounds = {
                left: currentMemo.position.x,
                top: currentMemo.position.y,
                right: currentMemo.position.x + currentMemoWidth,
                bottom: currentMemo.position.y + currentMemoHeight
              };

              const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
                return !(bounds1.right + margin < bounds2.left ||
                         bounds1.left - margin > bounds2.right ||
                         bounds1.bottom + margin < bounds2.top ||
                         bounds1.top - margin > bounds2.bottom);
              };

              const finalStillInArea = isOverlapping(currentMemoBounds, categoryAreaBounds, 0);

              if (!finalStillInArea) {
                console.log('⏰ 지연 후 최종 확인: 카테고리 영역 밖으로 이동 - 자동 빼내기:', memoId);
                moveToCategory(memoId, null);
              } else {
                console.log('⏰ 지연 후 최종 확인: 카테고리 영역 내에 있음 - 유지:', memoId);
              }

              categoryExitTimers.current.delete(memoId);
            }, exitDelay);

            categoryExitTimers.current.set(memoId, timer);
          } else {
            // 영역 내에 있으면 기존 타이머 취소
            const existingTimer = categoryExitTimers.current.get(memoId);
            if (existingTimer) {
              clearTimeout(existingTimer);
              categoryExitTimers.current.delete(memoId);
            }
            console.log('📍 카테고리 영역 내에서 이동:', memoId, '카테고리:', draggedMemo.parentId);
          }
        }
      } else {
        console.log('❌ 겹치는 카테고리 없음 (이미 최상위)');
      }
    }
  };

  // 카테고리 위치 업데이트 히스토리 타이머 관리
  const categoryPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateCategoryPosition = (categoryId: string, position: { x: number; y: number }) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const targetCategory = (page.categories || []).find(cat => cat.id === categoryId);
      if (!targetCategory) return page;

      // 카테고리가 얼마나 이동했는지 계산
      const deltaX = position.x - targetCategory.position.x;
      const deltaY = position.y - targetCategory.position.y;

      // 하위 메모들도 함께 이동 (상대적 위치 유지)
      const updatedMemos = page.memos.map(memo =>
        memo.parentId === categoryId
          ? {
              ...memo,
              position: {
                x: memo.position.x + deltaX,
                y: memo.position.y + deltaY
              }
            }
          : memo
      );

      // 하위 카테고리들도 함께 이동
      const updatedCategories = (page.categories || []).map(category =>
        category.id === categoryId
          ? { ...category, position }
          : category.parentId === categoryId
          ? {
              ...category,
              position: {
                x: category.position.x + deltaX,
                y: category.position.y + deltaY
              }
            }
          : category
      );

      return {
        ...page,
        memos: updatedMemos,
        categories: updatedCategories
      };
    }));

    // 카테고리 이동 후 충돌 검사 비활성화 (무한 루프 방지)
    // 충돌 검사는 오직 수동으로 메모를 카테고리에 추가할 때만 수행

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = categoryPositionTimers.current.get(categoryId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('category_move', `카테고리 이동: ${categoryId}`);
      categoryPositionTimers.current.delete(categoryId);
    }, 200);

    categoryPositionTimers.current.set(categoryId, newTimer);
  };

  const updateCategorySize = (categoryId: string, size: { width: number; height: number }) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(category =>
              category.id === categoryId
                ? { ...category, size }
                : category
            )
          }
        : page
    ));
  };

  // Canvas History Management Functions
  const saveCanvasState = (actionType: CanvasActionType, description: string) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return;

    const newAction: CanvasAction = {
      type: actionType,
      timestamp: Date.now(),
      pageSnapshot: {
        memos: [...currentPage.memos],
        categories: [...(currentPage.categories || [])]
      },
      description
    };

    setCanvasHistory(prev => {
      const newPast = prev.present ? [...prev.past, prev.present] : prev.past;

      // Limit history size
      const trimmedPast = newPast.length >= prev.maxHistorySize
        ? newPast.slice(-prev.maxHistorySize + 1)
        : newPast;

      return {
        ...prev,
        past: trimmedPast,
        present: newAction,
        future: [] // Clear future when new action is performed
      };
    });
  };

  const canUndo = canvasHistory.past.length > 0;
  const canRedo = canvasHistory.future.length > 0;

  const undoCanvasAction = () => {
    if (!canUndo || !canvasHistory.present) return;

    const previousAction = canvasHistory.past[canvasHistory.past.length - 1];

    // Restore the page state from the previous action
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: [...previousAction.pageSnapshot.memos],
            categories: [...previousAction.pageSnapshot.categories]
          }
        : page
    ));

    // Update history
    setCanvasHistory(prev => ({
      ...prev,
      past: prev.past.slice(0, -1),
      present: previousAction,
      future: prev.present ? [prev.present, ...prev.future] : prev.future
    }));

    console.log(`🔄 Undo: ${previousAction.description}`);
  };

  const redoCanvasAction = () => {
    if (!canRedo) return;

    const nextAction = canvasHistory.future[0];

    // Restore the page state from the next action
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: [...nextAction.pageSnapshot.memos],
            categories: [...nextAction.pageSnapshot.categories]
          }
        : page
    ));

    // Update history
    setCanvasHistory(prev => ({
      ...prev,
      past: prev.present ? [...prev.past, prev.present] : prev.past,
      present: nextAction,
      future: prev.future.slice(1)
    }));

    console.log(`🔄 Redo: ${nextAction.description}`);
  };

  const selectCategory = (categoryId: string, isShiftClick: boolean = false) => {
    // 메모 선택 해제
    setSelectedMemoId(null);
    setSelectedMemoIds([]);

    // 빈 문자열이거나 유효하지 않은 ID인 경우 모든 선택 해제
    if (!categoryId || !currentPage?.categories?.find(c => c.id === categoryId)) {
      setSelectedCategoryId(null);
      setSelectedCategoryIds([]);
      return;
    }

    if (isShiftClick) {
      // Shift + 클릭: 멀티 선택
      setSelectedCategoryIds(prev => {
        // 기존에 단일 선택된 카테고리가 있으면 다중 선택 목록에 추가
        const currentSelection = selectedCategoryId ? [selectedCategoryId, ...prev] : prev;

        if (currentSelection.includes(categoryId)) {
          // 이미 선택된 경우 제거
          return currentSelection.filter(id => id !== categoryId);
        } else {
          // 새로 추가
          return [...currentSelection, categoryId];
        }
      });

      // 멀티 선택 시에는 단일 선택 해제
      setSelectedCategoryId(null);
    } else {
      // 일반 클릭: 단일 선택
      setSelectedCategoryId(categoryId);
      setSelectedCategoryIds([]);
    }
  };

  const deleteMemoBlock = () => {
    if (!selectedMemoId) return;

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos
              .filter(memo => memo.id !== selectedMemoId) // 해당 메모 삭제
              .map(memo => ({
                ...memo,
                connections: memo.connections.filter(connId => connId !== selectedMemoId) // 다른 메모들에서 삭제된 메모로의 연결 제거
              })),
            categories: (page.categories || []).map(category => ({
              ...category,
              connections: category.connections.filter(connId => connId !== selectedMemoId), // 카테고리에서도 삭제된 메모로의 연결 제거
              children: category.children.filter(childId => childId !== selectedMemoId) // 자식 목록에서도 제거
            }))
          }
        : page
    ));
    setSelectedMemoId(null);
  };

  // 통합 삭제 함수 - 현재 선택된 아이템(메모 또는 카테고리) 삭제
  const deleteSelectedItem = () => {
    if (selectedMemoId) {
      deleteMemoBlock();
    } else if (selectedCategoryId) {
      deleteCategory(selectedCategoryId);
      setSelectedCategoryId(null);
    }
  };

  const disconnectMemo = () => {
    setIsDisconnectMode(!isDisconnectMode);
  };

  const connectMemos = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    // 현재 페이지에서 아이템 타입 확인
    const currentPageData = pages.find(p => p.id === currentPageId);
    if (!currentPageData) return;

    const fromMemo = currentPageData.memos.find(m => m.id === fromId);
    const toMemo = currentPageData.memos.find(m => m.id === toId);
    const fromCategory = (currentPageData.categories || []).find(c => c.id === fromId);
    const toCategory = (currentPageData.categories || []).find(c => c.id === toId);

    // 연결 규칙: 메모끼리만, 카테고리끼리만 연결 가능
    const isValidConnection =
      (fromMemo && toMemo) || // 메모-메모 연결
      (fromCategory && toCategory); // 카테고리-카테고리 연결

    if (!isValidConnection) {
      console.log('❌ 연결 불가: 같은 타입끼리만 연결 가능합니다');
      setIsConnecting(false);
      setConnectingFromId(null);
      return;
    }

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo => {
              if (memo.id === fromId && fromMemo && toMemo) {
                return {
                  ...memo,
                  connections: memo.connections.includes(toId)
                    ? memo.connections
                    : [...memo.connections, toId]
                };
              }
              if (memo.id === toId && fromMemo && toMemo) {
                return {
                  ...memo,
                  connections: memo.connections.includes(fromId)
                    ? memo.connections
                    : [...memo.connections, fromId]
                };
              }
              return memo;
            }),
            categories: (page.categories || []).map(category => {
              if (category.id === fromId && fromCategory && toCategory) {
                return {
                  ...category,
                  connections: category.connections.includes(toId)
                    ? category.connections
                    : [...category.connections, toId]
                };
              }
              if (category.id === toId && fromCategory && toCategory) {
                return {
                  ...category,
                  connections: category.connections.includes(fromId)
                    ? category.connections
                    : [...category.connections, fromId]
                };
              }
              return category;
            })
          }
        : page
    ));

    setIsConnecting(false);
    setConnectingFromId(null);

    // Save canvas state for undo/redo
    setTimeout(() => saveCanvasState('connection_add', `연결 추가: ${fromId} ↔ ${toId}`), 0);
  };

  const removeConnection = (fromId: string, toId: string) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo => ({
              ...memo,
              connections: memo.connections.filter(id =>
                !(memo.id === fromId && id === toId) &&
                !(memo.id === toId && id === fromId)
              )
            })),
            categories: (page.categories || []).map(category => ({
              ...category,
              connections: category.connections.filter(id =>
                !(category.id === fromId && id === toId) &&
                !(category.id === toId && id === fromId)
              )
            }))
          }
        : page
    ));

    // Save canvas state for undo/redo
    setTimeout(() => saveCanvasState('connection_remove', `연결 제거: ${fromId} ↔ ${toId}`), 0);
  };

  const startConnection = (memoId: string) => {
    setIsConnecting(true);
    setConnectingFromId(memoId);
  };

  const updateDragLine = (mousePos: { x: number; y: number }) => {
    setDragLineEnd(mousePos);
  };

  const cancelConnection = () => {
    setIsConnecting(false);
    setConnectingFromId(null);
    setDragLineEnd(null);
  };

  const updateMemo = (memoId: string, updates: Partial<MemoBlock>) => {
    setPages(prev => prev.map(page => 
      page.id === currentPageId 
        ? {
            ...page,
            memos: page.memos.map(memo => 
              memo.id === memoId 
                ? { ...memo, ...updates }
                : memo
            )
          }
        : page
    ));
  };

  // 메모 위치 업데이트 히스토리 타이머 관리
  const memoPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const updateMemoPosition = (memoId: string, position: { x: number; y: number }) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            memos: page.memos.map(memo =>
              memo.id === memoId
                ? { ...memo, position }
                : memo
            )
          }
        : page
    ));

    // 실시간 충돌 검사 비활성화 (무한 루프 방지)
    // 충돌 검사는 오직 수동으로 메모를 카테고리에 추가할 때만 수행

    // 이동 완료 후 200ms 후에 히스토리 저장 (연속 이동을 하나로 묶기 위해)
    const existingTimer = memoPositionTimers.current.get(memoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      saveCanvasState('memo_move', `메모 이동: ${memoId}`);
      memoPositionTimers.current.delete(memoId);
    }, 200);

    memoPositionTimers.current.set(memoId, newTimer);
  };

  const updateMemoSize = (memoId: string, size: { width: number; height: number }) => {
    setPages(prev => prev.map(page => 
      page.id === currentPageId 
        ? {
            ...page,
            memos: page.memos.map(memo => 
              memo.id === memoId 
                ? { ...memo, size }
                : memo
            )
          }
        : page
    ));
  };

  const updateMemoDisplaySize = (memoId: string, displaySize: MemoDisplaySize) => {
    setPages(prev => prev.map(page => 
      page.id === currentPageId 
        ? {
            ...page,
            memos: page.memos.map(memo => 
              memo.id === memoId 
                ? { ...memo, displaySize }
                : memo
            )
          }
        : page
    ));
  };

  const handleLeftPanelResize = (deltaX: number) => {
    setLeftPanelWidth(prev => Math.max(200, Math.min(500, prev + deltaX)));
  };

  const handleRightPanelResize = (deltaX: number) => {
    setRightPanelWidth(prev => Math.max(250, Math.min(1200, prev + deltaX)));
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 왼쪽 패널 */}
      {leftPanelOpen && (
        <LeftPanel
          pages={pages}
          currentPageId={currentPageId}
          onPageSelect={setCurrentPageId}
          onAddPage={addPage}
          onPageNameChange={updatePageName}
          onDeletePage={deletePage}
          width={leftPanelWidth}
          onResize={handleLeftPanelResize}
          onSearch={(query, category, results) => {
            console.log('🔍 Search:', query, category, results.length, 'results');
            // 검색 결과 처리 로직은 필요에 따라 추가
          }}
        />
      )}

      {/* 접기/펼치기 버튼 (왼쪽) */}
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        style={{
          position: 'absolute',
          left: leftPanelOpen ? `${leftPanelWidth}px` : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          padding: '8px 6px',
          cursor: 'pointer',
          borderRadius: '0 6px 6px 0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
      >
        {leftPanelOpen ? '◀' : '▶'}
      </button>

      {/* 중앙 캔버스 */}
      <Canvas
        currentPage={currentPage}
        selectedMemoId={selectedMemoId}
        selectedMemoIds={selectedMemoIds}
        selectedCategoryId={selectedCategoryId}
        selectedCategoryIds={selectedCategoryIds}
        onMemoSelect={handleMemoSelect}
        onCategorySelect={selectCategory}
        onAddMemo={addMemoBlock}
        onAddCategory={addCategory}
        onDeleteMemo={deleteMemoBlock}
        onDeleteCategory={deleteCategory}
        onDeleteSelected={deleteSelectedItem}
        onDisconnectMemo={disconnectMemo}
        onMemoPositionChange={updateMemoPosition}
        onCategoryPositionChange={updateCategoryPosition}
        onMemoSizeChange={updateMemoSize}
        onCategorySizeChange={updateCategorySize}
        onMemoDisplaySizeChange={updateMemoDisplaySize}
        onCategoryUpdate={updateCategory}
        onCategoryToggleExpanded={toggleCategoryExpanded}
        onMoveToCategory={moveToCategory}
        onDetectCategoryOnDrop={detectCategoryOnDrop}
        isConnecting={isConnecting}
        isDisconnectMode={isDisconnectMode}
        connectingFromId={connectingFromId}
        dragLineEnd={dragLineEnd}
        onStartConnection={startConnection}
        onConnectMemos={connectMemos}
        onCancelConnection={cancelConnection}
        onRemoveConnection={removeConnection}
        onUpdateDragLine={updateDragLine}
        isDragSelecting={isDragSelecting}
        dragSelectStart={dragSelectStart}
        dragSelectEnd={dragSelectEnd}
        dragHoveredMemoIds={dragHoveredMemoIds}
        onDragSelectStart={handleDragSelectStart}
        onDragSelectMove={handleDragSelectMove}
        onDragSelectEnd={handleDragSelectEnd}
        activeImportanceFilters={activeImportanceFilters}
        onToggleImportanceFilter={toggleImportanceFilter}
        showGeneralContent={showGeneralContent}
        onToggleGeneralContent={() => setShowGeneralContent(!showGeneralContent)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undoCanvasAction}
        onRedo={redoCanvasAction}
        isDraggingMemo={isDraggingMemo}
        onMemoDragStart={() => setIsDraggingMemo(true)}
        onMemoDragEnd={() => setIsDraggingMemo(false)}
      />

      {/* 접기/펼치기 버튼 (오른쪽) */}
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        style={{
          position: 'absolute',
          right: rightPanelOpen ? `${rightPanelWidth}px` : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          padding: '8px 6px',
          cursor: 'pointer',
          borderRadius: '6px 0 0 6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
      >
        {rightPanelOpen ? '▶' : '◀'}
      </button>

      {/* 오른쪽 패널 */}
      {rightPanelOpen && (
        <RightPanel
          selectedMemo={selectedMemo}
          selectedMemos={selectedMemos}
          selectedCategory={selectedCategory}
          selectedCategories={selectedCategories}
          currentPage={currentPage}
          onMemoUpdate={updateMemo}
          onCategoryUpdate={updateCategory}
          onMemoSelect={handleMemoSelect}
          onCategorySelect={selectCategory}
          onFocusMemo={focusOnMemo}
          width={rightPanelWidth}
          onResize={handleRightPanelResize}
          isFullscreen={isRightPanelFullscreen}
          onToggleFullscreen={toggleRightPanelFullscreen}
          activeImportanceFilters={activeImportanceFilters}
          showGeneralContent={showGeneralContent}
          onResetFilters={resetFiltersToDefault}
        />
      )}
    </div>
  );
};

export default App;