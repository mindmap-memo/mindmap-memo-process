import React, { useState, useEffect } from 'react';
import { Page, MemoBlock, DataRegistry, MemoDisplaySize, ImportanceLevel, CategoryBlock, CanvasItem } from './types';
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
  const [dataRegistry, setDataRegistry] = useState<DataRegistry>({});

  // Initialize data registry
  useEffect(() => {
    globalDataRegistry.setRegistry(dataRegistry);
    const unsubscribe = globalDataRegistry.subscribe(() => {
      setDataRegistry({ ...globalDataRegistry.getRegistry() });
    });
    return unsubscribe;
  }, [dataRegistry]);

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

  // 새로운 메모 선택 핸들러 (멀티 선택 지원)
  const handleMemoSelect = (memoId: string, isShiftClick: boolean = false) => {
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

      console.log('Memos in selection:', memosInSelection.length);
      if (memosInSelection.length > 0) {
        console.log('Setting selected memo IDs:', memosInSelection.map(memo => memo.id));
        if (isDragSelectingWithShift) {
          // Shift + 드래그: 기존 선택 유지하면서 드래그 영역 메모들 토글
          const currentSelection = selectedMemoId ? [selectedMemoId, ...selectedMemoIds] : selectedMemoIds;
          let newSelection = [...currentSelection];
          
          memosInSelection.forEach(memo => {
            if (newSelection.includes(memo.id)) {
              // 이미 선택된 메모는 선택 해제
              newSelection = newSelection.filter(id => id !== memo.id);
            } else {
              // 선택되지 않은 메모는 선택에 추가
              newSelection.push(memo.id);
            }
          });
          
          setSelectedMemoIds(newSelection);
          setSelectedMemoId(null);
        } else {
          // 일반 드래그: 기존 선택 해제하고 드래그 영역 메모들만 선택
          setSelectedMemoIds(memosInSelection.map(memo => memo.id));
          setSelectedMemoId(null);
        }
      } else if (!isDragSelectingWithShift) {
        console.log('No memos in selection - clearing selection');
        // 일반 드래그로 아무것도 선택하지 않았으면 기존 선택 해제
        setSelectedMemoIds([]);
        setSelectedMemoId(null);
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

  const addMemoBlock = (position?: { x: number; y: number }) => {
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
      position: position || { x: 300, y: 200 },
      displaySize: 'medium'
    };
    
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: [...page.memos, newMemo] }
        : page
    ));
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
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        // Determine if item is memo or category
        const isMemo = page.memos.some(memo => memo.id === itemId);
        const isCategory = (page.categories || []).some(cat => cat.id === itemId);

        if (isMemo) {
          const updatedMemos = page.memos.map(memo =>
            memo.id === itemId ? { ...memo, parentId: categoryId || undefined } : memo
          );
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
          const updatedCategories = (page.categories || []).map(category => {
            if (category.id === itemId) {
              return { ...category, parentId: categoryId || undefined };
            }
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
          return { ...page, categories: updatedCategories };
        }
      }
      return page;
    }));
  };

  const updateCategoryPosition = (categoryId: string, position: { x: number; y: number }) => {
    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? {
            ...page,
            categories: (page.categories || []).map(category =>
              category.id === categoryId
                ? { ...category, position }
                : category
            )
          }
        : page
    ));
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

  const selectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
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
        onMemoSelect={handleMemoSelect}
        onCategorySelect={selectCategory}
        onAddMemo={addMemoBlock}
        onAddCategory={addCategory}
        onDeleteMemo={deleteMemoBlock}
        onDeleteCategory={deleteCategory}
        onDisconnectMemo={disconnectMemo}
        onMemoPositionChange={updateMemoPosition}
        onCategoryPositionChange={updateCategoryPosition}
        onMemoSizeChange={updateMemoSize}
        onCategorySizeChange={updateCategorySize}
        onMemoDisplaySizeChange={updateMemoDisplaySize}
        onCategoryUpdate={updateCategory}
        onCategoryToggleExpanded={toggleCategoryExpanded}
        onMoveToCategory={moveToCategory}
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
          currentPage={currentPage}
          onMemoUpdate={updateMemo}
          onMemoSelect={handleMemoSelect}
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