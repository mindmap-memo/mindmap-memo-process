import React, { useState, useEffect } from 'react';
import { Page, MemoBlock, DataRegistry, MemoDisplaySize, ImportanceLevel, CategoryBlock, CanvasHistory, CanvasAction, CanvasActionType, QuickNavItem } from './types';
import { globalDataRegistry } from './utils/dataRegistry';

import { calculateCategoryArea, CategoryArea, clearCollisionDirections, centerCanvasOnPosition } from './utils/categoryAreaUtils';
import { resolveUnifiedCollisions } from './utils/collisionUtils';
import {
  canAddCategoryAsChild,
  addCategoryToParent,
  addMemoToCategory,
  isParentChild,
  getDirectChildMemos,
  getDirectChildCategories,
  isAncestor
} from './utils/categoryHierarchyUtils';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Canvas from './components/Canvas';

// localStorage 키 상수
const STORAGE_KEYS = {
  PAGES: 'mindmap-memo-pages',
  CURRENT_PAGE_ID: 'mindmap-memo-current-page-id',
  PANEL_SETTINGS: 'mindmap-memo-panel-settings',
  QUICK_NAV_ITEMS: 'mindmap-memo-quick-nav-items'
};

// 기본 데이터
const DEFAULT_PAGES: Page[] = (() => {
  const pageId = '1';

  // 튜토리얼 메모들
  const tutorialMemos: MemoBlock[] = [
    // 1. 단축키 설명
    {
      id: `${pageId}-memo-shortcuts`,
      title: '⌨️ 단축키',
      content: '',
      blocks: [
        {
          id: `${pageId}-shortcuts-1`,
          type: 'text',
          content: 'Ctrl+Z\n실행취소'
        },
        {
          id: `${pageId}-shortcuts-2`,
          type: 'text',
          content: 'Ctrl+Shift+Z\n다시실행'
        },
        {
          id: `${pageId}-shortcuts-3`,
          type: 'text',
          content: 'Delete\n선택한 메모 삭제'
        },
        {
          id: `${pageId}-shortcuts-4`,
          type: 'text',
          content: 'Alt + 스크롤\n캔버스 확대/축소'
        },
        {
          id: `${pageId}-shortcuts-5`,
          type: 'text',
          content: 'Spacebar + 드래그\n캔버스 이동'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 150, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 2. 메모 블록과 카테고리 영역
    {
      id: `${pageId}-memo-canvas`,
      title: '📦 메모 블록과 카테고리',
      content: '',
      blocks: [
        {
          id: `${pageId}-canvas-1`,
          type: 'text',
          content: '메모 블록\n드래그로 이동하고, 테두리 모서리를 클릭하여 다른 메모와 연결선을 생성하세요'
        },
        {
          id: `${pageId}-canvas-2`,
          type: 'text',
          content: '카테고리 영역\n메모를 담는 컨테이너입니다. Shift+드래그로 메모를 카테고리에 추가하거나 제거하세요'
        },
        {
          id: `${pageId}-canvas-3`,
          type: 'text',
          content: '카테고리 중첩\n카테고리 안에 다른 카테고리를 넣어 계층 구조를 만들 수 있습니다'
        },
        {
          id: `${pageId}-canvas-4`,
          type: 'text',
          content: '카테고리 연결\n카테고리끼리도 연결선을 생성하여 관계를 표현할 수 있습니다'
        },
        {
          id: `${pageId}-canvas-5`,
          type: 'text',
          content: '카테고리 확장/축소\n카테고리 블록을 클릭하면 영역을 펼치거나 접을 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 450, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 3. 오른쪽 탭 (메모 편집)
    {
      id: `${pageId}-memo-rightpanel`,
      title: '📝 우측 패널 - 메모 편집',
      content: '',
      blocks: [
        {
          id: `${pageId}-right-1`,
          type: 'text',
          content: '텍스트 입력\n메모를 선택하면 우측 패널에서 제목과 내용을 편집할 수 있습니다'
        },
        {
          id: `${pageId}-right-2`,
          type: 'text',
          content: '파일 첨부\n이미지나 파일을 드래그앤드롭으로 업로드하거나 우클릭-파일첨부로 파일을 업로드하세요'
        },
        {
          id: `${pageId}-right-3`,
          type: 'text',
          content: '중요도 부여\n텍스트를 드래그하거나 파일, 이미지, URL을 우클릭해 중요도를 부여하여 분류하세요'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 750, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 4. 우측 패널 (카테고리 편집)
    {
      id: `${pageId}-memo-rightpanel-category`,
      title: '📂 우측 패널 - 카테고리 편집',
      content: '',
      blocks: [
        {
          id: `${pageId}-right-cat-1`,
          type: 'text',
          content: '제목 수정\n카테고리를 선택하면 우측 패널에서 카테고리 제목을 편집할 수 있습니다'
        },
        {
          id: `${pageId}-right-cat-2`,
          type: 'text',
          content: '하위 메모 목록\n카테고리에 포함된 모든 하위 메모 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
        },
        {
          id: `${pageId}-right-cat-3`,
          type: 'text',
          content: '연결된 카테고리\n연결선으로 연결된 다른 카테고리 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 1050, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 5. 왼쪽 탭 (페이지와 검색)
    {
      id: `${pageId}-memo-leftpanel`,
      title: '🔍 좌측 패널 - 페이지와 검색',
      content: '',
      blocks: [
        {
          id: `${pageId}-left-1`,
          type: 'text',
          content: '페이지 관리\n좌측 패널에서 페이지를 추가하거나 삭제하세요. 각 페이지는 독립적인 캔버스입니다'
        },
        {
          id: `${pageId}-left-2`,
          type: 'text',
          content: '통합 검색\n좌측 상단 돋보기 아이콘으로 모든 페이지의 메모와 카테고리를 검색할 수 있습니다'
        },
        {
          id: `${pageId}-left-3`,
          type: 'text',
          content: '검색 필터\n검색 결과를 메모 또는 카테고리로 필터링하여 원하는 항목만 표시할 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 150, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 6. 캔버스 뷰 기능
    {
      id: `${pageId}-memo-canvasview`,
      title: '🎨 캔버스 뷰 기능',
      content: '',
      blocks: [
        {
          id: `${pageId}-view-1`,
          type: 'text',
          content: '단축 이동\n메모나 카테고리를 우클릭하여 단축 이동 목록에 추가하고, 우측 상단의 단축 이동 버튼을 클릭해 빠르게 이동하세요'
        },
        {
          id: `${pageId}-view-2`,
          type: 'text',
          content: '중요도 필터\n캔버스 좌측 상단의 중요도 필터를 통해 특정 중요도의 메모만 표시할 수 있습니다'
        },
        {
          id: `${pageId}-view-3`,
          type: 'text',
          content: '줌과 팬\n마우스 휠로 확대/축소하고, 빈 공간을 드래그하여 캔버스를 이동하세요'
        },
        {
          id: `${pageId}-view-4`,
          type: 'text',
          content: '메모 생성\n캔버스 하단의 "메모 추가" 버튼으로 새로운 메모 블록을 생성하세요'
        },
        {
          id: `${pageId}-view-5`,
          type: 'text',
          content: '카테고리 생성\n캔버스 하단의 "카테고리 추가" 버튼으로 새로운 카테고리 영역을 생성하세요'
        },
        {
          id: `${pageId}-view-6`,
          type: 'text',
          content: '연결 해제\n캔버스 하단의 "연결 해제" 버튼을 켜고 연결선을 클릭하여 메모 간 연결을 제거하세요'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 450, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 7. 기타 사항
    {
      id: `${pageId}-memo-etc`,
      title: '📢 기타 사항',
      content: '',
      blocks: [
        {
          id: `${pageId}-etc-1`,
          type: 'text',
          content: '아직 프로토타입이므로 기기 브라우저에 저장되는 방식이며 시크릿 모드를 사용하시면 저장이 되지 않습니다.\n또 다른 기기로 이용하시면 내용이 기존 기기에 적은 내용이 공유되지 않으니 유의하시기 바랍니다.'
        },
        {
          id: `${pageId}-etc-2`,
          type: 'text',
          content: '추후 이용자가 늘면 로그인 기능을 추가해 어떤 기기에서든 내용이 공유되도록 추가하겠습니다.'
        },
        {
          id: `${pageId}-etc-3`,
          type: 'text',
          content: '앱을 사용하시며 불편한 점이나 의견 있으신 경우 @movee.diary로 DM주시면 감사하겠습니다!',
          importanceRanges: [{
            start: 0,
            end: 55,
            level: 'critical' as ImportanceLevel
          }]
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 750, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    }
  ];

  // 튜토리얼 카테고리 생성
  const tutorialCategory: CategoryBlock = {
    id: `${pageId}-tutorial-category`,
    title: '📖 사용 방법',
    tags: [],
    connections: [],
    position: { x: 100, y: 100 },
    size: { width: 1300, height: 700 },
    children: tutorialMemos.map(memo => memo.id),
    parentId: undefined,
    isExpanded: true
  };

  return [
    {
      id: pageId,
      name: '페이지 1',
      memos: tutorialMemos,
      categories: [tutorialCategory]
    }
  ];
})();

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
  // 브라우저 기본 Ctrl/Command + 휠 줌 차단 (전역)
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // document 전체에 리스너 추가 (passive: false로 preventDefault 가능하게)
    document.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

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
  const [connectingFromDirection, setConnectingFromDirection] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);

  // Shift 드래그 중 영역 캐시 (영역 크기가 변하지 않도록)
  const shiftDragAreaCache = React.useRef<{[categoryId: string]: any}>({});
  const shiftDropProcessedMemos = React.useRef<Set<string>>(new Set()); // Shift 드래그로 처리된 메모 추적

  // 드래그 중인 카테고리의 영역 캐시 (Canvas와 동일한 시스템)
  const [draggedCategoryAreas, setDraggedCategoryAreas] = useState<{[categoryId: string]: {area: any, originalPosition: {x: number, y: number}}}>({});

  // 캔버스 뷰포트 상태 (Canvas에서 App으로 이동)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);

  // 단축 이동 (Quick Navigation)
  const [quickNavItems, setQuickNavItems] = useState<QuickNavItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.QUICK_NAV_ITEMS, [])
  );
  const [showQuickNavPanel, setShowQuickNavPanel] = useState(false);

  // 드래그 시작 시 메모들의 원래 위치 저장
  const dragStartMemoPositions = React.useRef<Map<string, Map<string, {x: number, y: number}>>>(new Map());

  // 드래그 시작 시 하위 카테고리들의 원래 위치 저장
  const dragStartCategoryPositions = React.useRef<Map<string, Map<string, {x: number, y: number}>>>(new Map());

  // 메모 위치 변경 시 캐시 제거 (Canvas.tsx와 동기화)
  const clearCategoryCache = React.useCallback((categoryId: string) => {
    setDraggedCategoryAreas(prev => {
      const newAreas = { ...prev };
      delete newAreas[categoryId];
      return newAreas;
    });
    dragStartMemoPositions.current.delete(categoryId);
    dragStartCategoryPositions.current.delete(categoryId);
    clearCollisionDirections(); // 충돌 방향 맵 초기화
  }, []);

  // 카테고리-카테고리 드롭 감지 (일반 드롭)
  const handleCategoryOnCategoryDrop = React.useCallback((draggedCategory: CategoryBlock, currentPage: Page) => {
    const categoryWidth = draggedCategory.size?.width || 200;
    const categoryHeight = draggedCategory.size?.height || 80;
    const draggedBounds = {
      left: draggedCategory.position.x,
      top: draggedCategory.position.y,
      right: draggedCategory.position.x + categoryWidth,
      bottom: draggedCategory.position.y + categoryHeight
    };

    // 겹침 감지 함수
    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    // 드래그 중인 카테고리와 그 모든 하위 카테고리들을 제외한 페이지 데이터 생성
    const getAllDescendantIds = (categoryId: string): string[] => {
      const descendants: string[] = [categoryId];
      const children = (currentPage.categories || []).filter(c => c.parentId === categoryId);
      children.forEach(child => {
        descendants.push(...getAllDescendantIds(child.id));
      });
      return descendants;
    };

    const excludedIds = getAllDescendantIds(draggedCategory.id);
    const pageWithoutDraggingCategory = {
      ...currentPage,
      categories: (currentPage.categories || []).filter(c => !excludedIds.includes(c.id)),
      memos: currentPage.memos.filter(m => !excludedIds.includes(m.parentId || ''))
    };

    // 드롭 대상 카테고리 찾기 (카테고리 블록 + 영역)
    const overlappingCategories = currentPage.categories?.filter(category => {
      // 자기 자신과 하위 카테고리는 제외
      if (excludedIds.includes(category.id)) return false;

      // 1. 카테고리 블록과의 겹침 체크
      const targetWidth = category.size?.width || 200;
      const targetHeight = category.size?.height || 80;
      const targetBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + targetWidth,
        bottom: category.position.y + targetHeight
      };

      if (isOverlapping(draggedBounds, targetBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      if (category.isExpanded) {
        const categoryArea = calculateCategoryArea(category, pageWithoutDraggingCategory);
        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(draggedBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    let targetCategory: CategoryBlock | null = null;

    if (overlappingCategories.length > 0) {
      // 각 카테고리의 깊이를 계산
      const categoriesWithDepth = overlappingCategories.map(category => {
        let depth = 0;
        let checkParent = category.parentId;
        while (checkParent) {
          depth++;
          const parentCat = currentPage.categories?.find(c => c.id === checkParent);
          checkParent = parentCat?.parentId;
        }
        return { category, depth };
      });

      // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
      const deepest = categoriesWithDepth.reduce((max, item) =>
        item.depth > max.depth ? item : max
      );
      targetCategory = deepest.category;
    }

    if (targetCategory) {
      // 카테고리를 다른 카테고리에 드롭
      const targetCategoryId = targetCategory.id; // null 체크 후 변수에 저장

      // 순환 참조 체크
      if (!canAddCategoryAsChild(targetCategoryId, draggedCategory.id, currentPage.categories || [])) {
        return;
      }

      // 이미 같은 부모의 자식이면 무시
      if (draggedCategory.parentId === targetCategoryId) {
        return;
      }

      // 카테고리를 하위로 추가
      setPages(prev => prev.map(page => {
        if (page.id !== currentPageId) return page;

        const updatedCategories = addCategoryToParent(
          draggedCategory.id,
          targetCategoryId,
          page.categories || []
        );

        return {
          ...page,
          categories: updatedCategories
        };
      }));
    }
  }, [currentPageId]);

  // 카테고리 드래그 종료 시 드롭 감지 및 캐시 제거
  const handleCategoryPositionDragEnd = (categoryId: string, finalPosition: { x: number; y: number }) => {
    console.log('[App] handleCategoryPositionDragEnd - categoryId:', categoryId, 'finalPosition:', finalPosition);

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      clearCategoryCache(categoryId);
      previousFramePosition.current.delete(categoryId);
      return;
    }

    const draggedCategory = currentPage.categories.find(c => c.id === categoryId);
    if (!draggedCategory) {
      clearCategoryCache(categoryId);
      previousFramePosition.current.delete(categoryId);
      return;
    }

    // 최종 위치로 카테고리 위치 업데이트 (stale state 문제 해결)
    const categoryWithFinalPosition = { ...draggedCategory, position: finalPosition };

    // 드랍 시점의 카테고리 및 하위 메모 위치 로그
    const childMemos = currentPage.memos.filter(m => m.parentId === categoryId);
    console.log('[App] 드랍 시 카테고리 최종 위치:', { x: Math.round(finalPosition.x), y: Math.round(finalPosition.y) });
    console.log('[App] 드랍 시 하위 메모 위치:', childMemos.map(m => ({ id: m.id, x: Math.round(m.position.x), y: Math.round(m.position.y) })));

    // 상대적 위치 계산
    if (childMemos.length > 0) {
      const relativeMemoPos = childMemos.map(m => ({
        id: m.id,
        relX: Math.round(m.position.x - finalPosition.x),
        relY: Math.round(m.position.y - finalPosition.y)
      }));
      console.log('[App] 카테고리 기준 상대 위치:', relativeMemoPos);
    }

    // Shift 드래그는 별도 처리 (이미 handleShiftDropCategory에서 처리됨)
    if (!isShiftPressed) {
      // 일반 드롭: 카테고리 블록끼리 겹침 감지
      handleCategoryOnCategoryDrop(categoryWithFinalPosition, currentPage);
    }

    // 드래그 종료 후 캐시 제거 - 메모 위치에 따라 자연스럽게 크기 조정
    // 다중 선택된 모든 카테고리의 캐시도 함께 제거
    const isMultiSelected = selectedCategoryIds.includes(categoryId);
    const categoriesToClear = isMultiSelected ? selectedCategoryIds : [categoryId];

    categoriesToClear.forEach(catId => {
      clearCategoryCache(catId);
      previousFramePosition.current.delete(catId);
      cacheCreationStarted.current.delete(catId);
    });

    // 드래그 종료 시 모든 위치 캐시 초기화
    dragStartMemoPositions.current.clear();
    dragStartCategoryPositions.current.clear();

    shiftDragAreaCache.current = {}; // Shift 드래그 캐시도 클리어
  };

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
  const [dragHoveredCategoryIds, setDragHoveredCategoryIds] = useState<string[]>([]);
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
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState<boolean>(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

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

  // Shift 키 상태 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 카테고리 라벨 위치 자동 업데이트 (영역의 좌상단으로)
  // 메모가 이동할 때만 업데이트
  const updateCategoryPositions = React.useCallback(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) return;

    const categoriesToUpdate: CategoryBlock[] = [];

    currentPage.categories.forEach(category => {
      const childMemos = currentPage.memos.filter(m => m.parentId === category.id);
      const childCategories = currentPage.categories?.filter(c => c.parentId === category.id) || [];
      const hasChildren = childMemos.length > 0 || childCategories.length > 0;

      if (hasChildren) {
        const area = calculateCategoryArea(category, currentPage);
        if (area) {
          // 영역의 좌상단 위치와 category.position이 다르면 업데이트 필요
          const padding = 20;
          const newX = area.x + padding;
          const newY = area.y + padding;

          if (Math.abs(category.position.x - newX) > 1 || Math.abs(category.position.y - newY) > 1) {
            categoriesToUpdate.push({
              ...category,
              position: { x: newX, y: newY }
            });
          }
        }
      }
    });

    // 업데이트가 필요한 카테고리가 있으면 한 번에 업데이트
    if (categoriesToUpdate.length > 0) {
      setPages(prev => prev.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            categories: page.categories?.map(cat => {
              const updated = categoriesToUpdate.find(u => u.id === cat.id);
              return updated || cat;
            }) || []
          };
        }
        return page;
      }));
    }
  }, [pages, currentPageId]);

  // Canvas History Management Functions
  const saveCanvasState = React.useCallback((actionType: CanvasActionType, description: string) => {
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
  }, [pages, currentPageId]);

  const canUndo = canvasHistory.past.length > 0;
  const canRedo = canvasHistory.future.length > 0;

  const undoCanvasAction = React.useCallback(() => {
    console.log('⬅️ undoCanvasAction called', { canUndo, historyLength: canvasHistory.past.length });
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

  }, [canUndo, canvasHistory, currentPageId]);

  const redoCanvasAction = React.useCallback(() => {
    console.log('➡️ redoCanvasAction called', { canRedo, futureLength: canvasHistory.future.length });
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

  }, [canRedo, canvasHistory, currentPageId]);

  // Canvas keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ESC: 모든 선택 해제
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedMemoIds([]);
        setSelectedCategoryIds([]);
        // 드래그 선택 UI도 초기화
        setIsDragSelecting(false);
        setDragSelectStart(null);
        setDragSelectEnd(null);
        setDragHoveredMemoIds([]);
        setDragHoveredCategoryIds([]);
        return;
      }

      // Canvas undo/redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        console.log('🔄 Undo triggered from keyboard');
        e.preventDefault();
        undoCanvasAction();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        console.log('🔄 Redo triggered from keyboard');
        e.preventDefault();
        redoCanvasAction();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoCanvasAction, redoCanvasAction]);

  // localStorage 자동 저장 - 페이지 데이터
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAGES, pages);
  }, [pages]);

  // localStorage 자동 저장 - 현재 페이지 ID
  useEffect(() => {
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
    saveToStorage(STORAGE_KEYS.PANEL_SETTINGS, settings);
  }, [leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth]);

  // localStorage 자동 저장 - 단축 이동 항목
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.QUICK_NAV_ITEMS, quickNavItems);
  }, [quickNavItems]);

  // 현재 페이지 ID가 유효한지 확인하고 수정
  useEffect(() => {
    if (pages.length > 0 && !pages.find(page => page.id === currentPageId)) {
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
    const pageId = Date.now().toString();

    // 튜토리얼 메모들
    const tutorialMemos: MemoBlock[] = [
      // 1. 단축키 설명
      {
        id: `${pageId}-memo-shortcuts`,
        title: '⌨️ 단축키',
        content: '',
        blocks: [
          {
            id: `${pageId}-shortcuts-1`,
            type: 'text',
            content: 'Ctrl+Z\n실행취소'
          },
          {
            id: `${pageId}-shortcuts-2`,
            type: 'text',
            content: 'Ctrl+Shift+Z\n다시실행'
          },
          {
            id: `${pageId}-shortcuts-3`,
            type: 'text',
            content: 'Delete\n선택한 메모 삭제'
          },
          {
            id: `${pageId}-shortcuts-4`,
            type: 'text',
            content: 'Alt + 스크롤\n캔버스 확대/축소'
          },
          {
            id: `${pageId}-shortcuts-5`,
            type: 'text',
            content: 'Spacebar + 드래그\n캔버스 이동'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 150, y: 150 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 2. 메모 블록과 카테고리 영역
      {
        id: `${pageId}-memo-canvas`,
        title: '📦 메모 블록과 카테고리',
        content: '',
        blocks: [
          {
            id: `${pageId}-canvas-1`,
            type: 'text',
            content: '메모 블록\n드래그로 이동하고, 테두리 모서리를 클릭하여 다른 메모와 연결선을 생성하세요'
          },
          {
            id: `${pageId}-canvas-2`,
            type: 'text',
            content: '카테고리 영역\n메모를 담는 컨테이너입니다. Shift+드래그로 메모를 카테고리에 추가하거나 제거하세요'
          },
          {
            id: `${pageId}-canvas-3`,
            type: 'text',
            content: '카테고리 중첩\n카테고리 안에 다른 카테고리를 넣어 계층 구조를 만들 수 있습니다'
          },
          {
            id: `${pageId}-canvas-4`,
            type: 'text',
            content: '카테고리 연결\n카테고리끼리도 연결선을 생성하여 관계를 표현할 수 있습니다'
          },
          {
            id: `${pageId}-canvas-5`,
            type: 'text',
            content: '카테고리 확장/축소\n카테고리 블록을 클릭하면 영역을 펼치거나 접을 수 있습니다'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 450, y: 150 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 3. 오른쪽 탭 (메모 편집)
      {
        id: `${pageId}-memo-rightpanel`,
        title: '📝 우측 패널 - 메모 편집',
        content: '',
        blocks: [
          {
            id: `${pageId}-right-1`,
            type: 'text',
            content: '텍스트 입력\n메모를 선택하면 우측 패널에서 제목과 내용을 편집할 수 있습니다'
          },
          {
            id: `${pageId}-right-2`,
            type: 'text',
            content: '파일 첨부\n이미지나 파일을 드래그앤드롭으로 업로드하거나 우클릭-파일첨부로 파일을 업로드하세요'
          },
          {
            id: `${pageId}-right-3`,
            type: 'text',
            content: '중요도 부여\n텍스트를 드래그하거나 파일, 이미지, URL을 우클릭해 중요도를 부여하여 분류하세요'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 750, y: 150 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 4. 우측 패널 (카테고리 편집)
      {
        id: `${pageId}-memo-rightpanel-category`,
        title: '📂 우측 패널 - 카테고리 편집',
        content: '',
        blocks: [
          {
            id: `${pageId}-right-cat-1`,
            type: 'text',
            content: '제목 수정\n카테고리를 선택하면 우측 패널에서 카테고리 제목을 편집할 수 있습니다'
          },
          {
            id: `${pageId}-right-cat-2`,
            type: 'text',
            content: '하위 메모 목록\n카테고리에 포함된 모든 하위 메모 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
          },
          {
            id: `${pageId}-right-cat-3`,
            type: 'text',
            content: '연결된 카테고리\n연결선으로 연결된 다른 카테고리 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 1050, y: 150 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 5. 왼쪽 탭 (페이지와 검색)
      {
        id: `${pageId}-memo-leftpanel`,
        title: '🔍 좌측 패널 - 페이지와 검색',
        content: '',
        blocks: [
          {
            id: `${pageId}-left-1`,
            type: 'text',
            content: '페이지 관리\n좌측 패널에서 페이지를 추가하거나 삭제하세요. 각 페이지는 독립적인 캔버스입니다'
          },
          {
            id: `${pageId}-left-2`,
            type: 'text',
            content: '통합 검색\n좌측 상단 돋보기 아이콘으로 모든 페이지의 메모와 카테고리를 검색할 수 있습니다'
          },
          {
            id: `${pageId}-left-3`,
            type: 'text',
            content: '검색 필터\n검색 결과를 메모 또는 카테고리로 필터링하여 원하는 항목만 표시할 수 있습니다'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 150, y: 450 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 6. 캔버스 뷰 기능
      {
        id: `${pageId}-memo-canvasview`,
        title: '🎨 캔버스 뷰 기능',
        content: '',
        blocks: [
          {
            id: `${pageId}-view-1`,
            type: 'text',
            content: '단축 이동\n메모나 카테고리를 우클릭하여 단축 이동 목록에 추가하고, 우측 상단의 단축 이동 버튼을 클릭해 빠르게 이동하세요'
          },
          {
            id: `${pageId}-view-2`,
            type: 'text',
            content: '중요도 필터\n캔버스 좌측 상단의 중요도 필터를 통해 특정 중요도의 메모만 표시할 수 있습니다'
          },
          {
            id: `${pageId}-view-3`,
            type: 'text',
            content: '줌과 팬\n마우스 휠로 확대/축소하고, 빈 공간을 드래그하여 캔버스를 이동하세요'
          },
          {
            id: `${pageId}-view-4`,
            type: 'text',
            content: '메모 생성\n캔버스 하단의 "메모 추가" 버튼으로 새로운 메모 블록을 생성하세요'
          },
          {
            id: `${pageId}-view-5`,
            type: 'text',
            content: '카테고리 생성\n캔버스 하단의 "카테고리 추가" 버튼으로 새로운 카테고리 영역을 생성하세요'
          },
          {
            id: `${pageId}-view-6`,
            type: 'text',
            content: '연결 해제\n캔버스 하단의 "연결 해제" 버튼을 켜고 연결선을 클릭하여 메모 간 연결을 제거하세요'
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 450, y: 450 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      },
      // 7. 기타 사항
      {
        id: `${pageId}-memo-etc`,
        title: '📢 기타 사항',
        content: '',
        blocks: [
          {
            id: `${pageId}-etc-1`,
            type: 'text',
            content: '아직 프로토타입이므로 기기 브라우저에 저장되는 방식이며 시크릿 모드를 사용하시면 저장이 되지 않습니다.\n또 다른 기기로 이용하시면 내용이 기존 기기에 적은 내용이 공유되지 않으니 유의하시기 바랍니다.'
          },
          {
            id: `${pageId}-etc-2`,
            type: 'text',
            content: '추후 이용자가 늘면 로그인 기능을 추가해 어떤 기기에서든 내용이 공유되도록 추가하겠습니다.'
          },
          {
            id: `${pageId}-etc-3`,
            type: 'text',
            content: '앱을 사용하시며 불편한 점이나 의견 있으신 경우 @movee.diary로 DM주시면 감사하겠습니다!',
            importanceRanges: [{
              start: 0,
              end: 55,
              level: 'critical'
            }]
          }
        ],
        tags: ['튜토리얼'],
        connections: [],
        position: { x: 750, y: 450 },
        displaySize: 'medium',
        parentId: `${pageId}-tutorial-category`
      }
    ];

    // 튜토리얼 카테고리 생성
    const tutorialCategory: CategoryBlock = {
      id: `${pageId}-tutorial-category`,
      title: '📖 사용 방법',
      tags: [],
      connections: [],
      position: { x: 100, y: 100 },
      size: { width: 1300, height: 700 },
      children: tutorialMemos.map(memo => memo.id),
      parentId: undefined,
      isExpanded: true
    };

    const newPage: Page = {
      id: pageId,
      name: `페이지 ${pages.length + 1}`,
      memos: tutorialMemos,
      categories: [tutorialCategory]
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
      // 드래그 선택 UI도 초기화
      setIsDragSelecting(false);
      setDragSelectStart(null);
      setDragSelectEnd(null);
      setDragHoveredMemoIds([]);
      setDragHoveredCategoryIds([]);
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

      // 실시간으로 드래그 영역과 교집합된 메모들과 카테고리들 계산
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

        const hoveredCategories = (currentPage.categories || []).filter(category => {
          const hasChildren = currentPage.memos.some(memo => memo.parentId === category.id) ||
                             currentPage.categories?.some(cat => cat.parentId === category.id);

          if (hasChildren && category.isExpanded) {
            // 하위 아이템이 있고 펼쳐진 경우: 영역과 교집합 확인
            const area = calculateCategoryArea(category, currentPage);
            if (area) {
              const areaLeft = area.x;
              const areaRight = area.x + area.width;
              const areaTop = area.y;
              const areaBottom = area.y + area.height;

              return (areaLeft < maxX && areaRight > minX && areaTop < maxY && areaBottom > minY);
            }
            return false;
          } else {
            // 하위 아이템이 없거나 접혀진 경우: 카테고리 블록과 교집합 확인
            const categoryWidth = category.size?.width || 200;
            const categoryHeight = category.size?.height || 95;

            const categoryLeft = category.position.x;
            const categoryRight = category.position.x + categoryWidth;
            const categoryTop = category.position.y;
            const categoryBottom = category.position.y + categoryHeight;

            return (categoryLeft < maxX && categoryRight > minX && categoryTop < maxY && categoryBottom > minY);
          }
        });

        setDragHoveredMemoIds(hoveredMemos.map(memo => memo.id));
        setDragHoveredCategoryIds(hoveredCategories.map(category => category.id));
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


      const memosInSelection = currentPage.memos.filter(memo => {
        const memoWidth = memo.size?.width || 200;
        const memoHeight = memo.size?.height || 95;

        // 메모 블록의 경계 계산
        const memoLeft = memo.position.x;
        const memoRight = memo.position.x + memoWidth;
        const memoTop = memo.position.y;
        const memoBottom = memo.position.y + memoHeight;

        // 사각형 교집합 확인
        return (memoLeft < maxX && memoRight > minX && memoTop < maxY && memoBottom > minY);
      });

      // 카테고리 선택 확인 (블록, 영역, 라벨)
      const categoriesInSelection = (currentPage.categories || []).filter(category => {
        const hasChildren = currentPage.memos.some(memo => memo.parentId === category.id) ||
                           currentPage.categories?.some(cat => cat.parentId === category.id);

        let intersects = false;

        if (hasChildren && category.isExpanded) {
          // 하위 아이템이 있고 펼쳐진 경우: 영역과 교집합 확인
          const area = calculateCategoryArea(category, currentPage);
          if (area) {
            const areaLeft = area.x;
            const areaRight = area.x + area.width;
            const areaTop = area.y;
            const areaBottom = area.y + area.height;

            intersects = (areaLeft < maxX && areaRight > minX && areaTop < maxY && areaBottom > minY);
          }
        } else {
          // 하위 아이템이 없거나 접혀진 경우: 카테고리 블록과 교집합 확인
          const categoryWidth = category.size?.width || 200;
          const categoryHeight = category.size?.height || 95;

          const categoryLeft = category.position.x;
          const categoryRight = category.position.x + categoryWidth;
          const categoryTop = category.position.y;
          const categoryBottom = category.position.y + categoryHeight;

          intersects = (categoryLeft < maxX && categoryRight > minX && categoryTop < maxY && categoryBottom > minY);
        }

        return intersects;
      });

      if (memosInSelection.length > 0 || categoriesInSelection.length > 0) {
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
      // 메모를 선택하고 화면을 해당 메모로 이동
      setSelectedMemoId(memoId);
      setSelectedMemoIds([]);
      // 화면을 해당 메모로 이동
      handleNavigateToMemo(memoId);
    }
  };


  // 충돌하는 메모블록 밀어내기 함수
  const pushAwayConflictingMemos = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {

    const conflictingMemos = page.memos.filter(memo => {
      // 현재 카테고리에 속한 메모는 제외 (이미 올바른 위치에 있음)
      if (memo.parentId === categoryId) {
        return false;
      }

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

      // 실제 겹침 여부 확인 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(memoBounds.right <= areaBounds.left ||
                              memoBounds.left >= areaBounds.right ||
                              memoBounds.bottom <= areaBounds.top ||
                              memoBounds.top >= areaBounds.bottom);

      if (isOverlapping) {
      }

      return isOverlapping;
    });


    // 충돌하는 메모들을 영역 밖으로 밀어내기 (겹침 영역 기반)
    conflictingMemos.forEach(memo => {
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

      // 겹침 영역 계산
      const overlapLeft = Math.max(memoBounds.left, areaBounds.left);
      const overlapTop = Math.max(memoBounds.top, areaBounds.top);
      const overlapRight = Math.min(memoBounds.right, areaBounds.right);
      const overlapBottom = Math.min(memoBounds.bottom, areaBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;


      let newX = memo.position.x;
      let newY = memo.position.y;
      const safetyMargin = 5; // 최소 여백

      // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
      if (overlapWidth <= overlapHeight) {
        // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterX = memo.position.x + memoWidth / 2;
        const areaCenterX = categoryArea.x + categoryArea.width / 2;

        if (memoCenterX > areaCenterX) {
          // 오른쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x + overlapWidth + safetyMargin;
        } else {
          // 왼쪽으로 밀어내기: 겹치는 폭만큼
          newX = memo.position.x - overlapWidth - safetyMargin;
        }
      } else {
        // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
        const memoCenterY = memo.position.y + memoHeight / 2;
        const areaCenterY = categoryArea.y + categoryArea.height / 2;

        if (memoCenterY > areaCenterY) {
          // 아래쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y + overlapHeight + safetyMargin;
        } else {
          // 위쪽으로 밀어내기: 겹치는 높이만큼
          newY = memo.position.y - overlapHeight - safetyMargin;
        }
      }

      const newPosition = { x: newX, y: newY };

      // 즉시 상태 업데이트
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
    });
  }, [currentPageId]);

  // 충돌하는 카테고리 영역 밀어내기 함수
  const pushAwayConflictingCategories = React.useCallback((movingCategoryId: string, movingCategoryArea: { x: number; y: number; width: number; height: number }, page: Page) => {

    // 카테고리 배열이 없으면 빈 배열로 초기화
    const categories = page.categories || [];
    if (categories.length === 0) {
      return;
    }

    const conflictingCategories = categories.filter(category => {
      if (category.id === movingCategoryId) return false;
      if (category.parentId === movingCategoryId || movingCategoryId === category.parentId) return false;

      const otherArea = calculateCategoryArea(category, page);
      if (!otherArea) {
        return false;
      }

      // 실제 영역 간 충돌 검사 (여백 없이 정확한 충돌 감지)
      const isOverlapping = !(movingCategoryArea.x + movingCategoryArea.width <= otherArea.x ||
                              movingCategoryArea.x >= otherArea.x + otherArea.width ||
                              movingCategoryArea.y + movingCategoryArea.height <= otherArea.y ||
                              movingCategoryArea.y >= otherArea.y + otherArea.height);

      if (isOverlapping) {
      }

      return isOverlapping;
    });


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

      // 겹침 영역 기반 밀어내기 계산
      const movingBounds = {
        left: movingCategoryArea.x,
        top: movingCategoryArea.y,
        right: movingCategoryArea.x + movingCategoryArea.width,
        bottom: movingCategoryArea.y + movingCategoryArea.height
      };

      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      // 겹침 영역 계산
      const overlapLeft = Math.max(movingBounds.left, categoryBounds.left);
      const overlapTop = Math.max(movingBounds.top, categoryBounds.top);
      const overlapRight = Math.min(movingBounds.right, categoryBounds.right);
      const overlapBottom = Math.min(movingBounds.bottom, categoryBounds.bottom);

      const overlapWidth = overlapRight - overlapLeft;
      const overlapHeight = overlapBottom - overlapTop;


      const safetyMargin = 10; // 최소 여백

      if (distance === 0) {
        // 중심이 같은 경우 오른쪽으로 밀어내기
        offsetX = movingCategoryArea.width + safetyMargin;
        offsetY = 0;
      } else {
        // 정확한 픽셀 단위 밀어내기: 겹치는 만큼만 이동
        if (overlapWidth <= overlapHeight) {
          // 가로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterX > movingCenterX) {
            // 오른쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = overlapWidth + safetyMargin;
            offsetY = 0;
          } else {
            // 왼쪽으로 밀어내기: 겹치는 폭 + 최소 여백
            offsetX = -(overlapWidth + safetyMargin);
            offsetY = 0;
          }
        } else {
          // 세로 방향으로 밀어내기 (겹치는 픽셀만큼만)
          if (categoryCenterY > movingCenterY) {
            // 아래쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = overlapHeight + safetyMargin;
          } else {
            // 위쪽으로 밀어내기: 겹치는 높이 + 최소 여백
            offsetX = 0;
            offsetY = -(overlapHeight + safetyMargin);
          }
        }
      }

      const newCategoryPosition = {
        x: category.position.x + offsetX,
        y: category.position.y + offsetY
      };

      // 카테고리와 하위 요소들을 함께 이동 (즉시 상태 업데이트)
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
    });
  }, [currentPageId]);

  // 통합 충돌 감지 및 밀어내기 함수 (10번 제한)
  const pushAwayConflictingBlocks = React.useCallback((categoryArea: { x: number; y: number; width: number; height: number }, categoryId: string, page: Page) => {
    // 10번 제한 안전장치
    const currentCount = collisionCheckCount.current.get(categoryId) || 0;
    if (currentCount >= 10) {
      return;
    }
    collisionCheckCount.current.set(categoryId, currentCount + 1);

    // 무한 충돌 방지 - 최근 1초 내에 충돌 검사를 했으면 스킵
    const now = Date.now();
    const lastCheck = lastCollisionCheck.current.get(categoryId) || 0;
    if (now - lastCheck < 1000) {
      return;
    }
    lastCollisionCheck.current.set(categoryId, now);

    // 10초 후 카운터 리셋
    setTimeout(() => {
      collisionCheckCount.current.set(categoryId, 0);
    }, 10000);


    // 1. 먼저 다른 카테고리 영역과의 충돌 검사 및 해결
    pushAwayConflictingCategories(categoryId, categoryArea, page);

    // 2. 그 다음 메모블록과의 충돌 검사 및 해결
    pushAwayConflictingMemos(categoryArea, categoryId, page);

  }, [currentPageId, pushAwayConflictingCategories, pushAwayConflictingMemos, collisionCheckCount, lastCollisionCheck]);


  // calculateCategoryArea는 이제 utils/categoryAreaUtils.ts에서 import

  const addMemoBlock = (position?: { x: number; y: number }) => {
    const originalPosition = position || { x: 300, y: 200 };
    let newPosition = { ...originalPosition };

    // 영역과 겹치지 않는 위치 찾기
    if (position) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage?.categories) {
        const memoWidth = 300;
        const memoHeight = 200;
        let isOverlapping = true;
        let adjustedY = newPosition.y;

        while (isOverlapping && adjustedY > -1000) {
          isOverlapping = false;

          for (const category of currentPage.categories) {
            if (category.isExpanded) {
              const area = calculateCategoryArea(category, currentPage);
              if (area) {
                // 메모와 영역이 겹치는지 확인
                const memoLeft = newPosition.x;
                const memoRight = newPosition.x + memoWidth;
                const memoTop = adjustedY;
                const memoBottom = adjustedY + memoHeight;

                const areaLeft = area.x;
                const areaRight = area.x + area.width;
                const areaTop = area.y;
                const areaBottom = area.y + area.height;

                if (!(memoRight < areaLeft || memoLeft > areaRight || memoBottom < areaTop || memoTop > areaBottom)) {
                  // 겹침 - 위로 이동
                  isOverlapping = true;
                  adjustedY -= 50;
                  break;
                }
              }
            }
          }
        }

        newPosition = { x: newPosition.x, y: adjustedY };
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
      parentId: null
    };

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, memos: [...page.memos, newMemo] }
        : page
    ));

    // 위치가 변경된 경우 캔버스를 새 위치로 자동 이동
    if (position && (newPosition.x !== originalPosition.x || newPosition.y !== originalPosition.y)) {
      // 메모의 중심점 계산 (블록 중심이 화면 중앙에 오도록)
      const memoCenterX = newPosition.x + 150; // 메모 너비의 절반
      const memoCenterY = newPosition.y + 100; // 메모 높이의 절반

      // 캔버스 크기 (윈도우 크기 기준, 좌우 패널 제외)
      const canvasWidth = window.innerWidth - (leftPanelWidth + (rightPanelOpen ? rightPanelWidth : 0));
      const canvasHeight = window.innerHeight;

      const newOffset = centerCanvasOnPosition(
        { x: memoCenterX, y: memoCenterY },
        canvasWidth,
        canvasHeight,
        canvasScale
      );

      setCanvasOffset(newOffset);
    }

    // Save canvas state for undo/redo
    setTimeout(() => saveCanvasState('memo_create', `메모 생성: ${newMemo.id}`), 0);
  };

  // Category management functions
  const addCategory = (position?: { x: number; y: number }) => {
    const originalPosition = position || { x: 300, y: 200 };
    let newPosition = { ...originalPosition };

    // 영역과 겹치지 않는 위치 찾기
    if (position) {
      const currentPage = pages.find(p => p.id === currentPageId);
      if (currentPage?.categories) {
        const categoryWidth = 200;
        const categoryHeight = 60;
        let isOverlapping = true;
        let adjustedY = newPosition.y;

        while (isOverlapping && adjustedY > -1000) {
          isOverlapping = false;

          for (const category of currentPage.categories) {
            if (category.isExpanded) {
              const area = calculateCategoryArea(category, currentPage);
              if (area) {
                // 카테고리와 영역이 겹치는지 확인
                const catLeft = newPosition.x;
                const catRight = newPosition.x + categoryWidth;
                const catTop = adjustedY;
                const catBottom = adjustedY + categoryHeight;

                const areaLeft = area.x;
                const areaRight = area.x + area.width;
                const areaTop = area.y;
                const areaBottom = area.y + area.height;

                if (!(catRight < areaLeft || catLeft > areaRight || catBottom < areaTop || catTop > areaBottom)) {
                  // 겹침 - 위로 이동
                  isOverlapping = true;
                  adjustedY -= 50;
                  break;
                }
              }
            }
          }
        }

        newPosition = { x: newPosition.x, y: adjustedY };
      }
    }

    const newCategory: CategoryBlock = {
      id: Date.now().toString(),
      title: 'New Category',
      tags: [],
      connections: [],
      position: newPosition,
      originalPosition: newPosition, // 초기 위치 저장
      isExpanded: true,
      children: []
    };

    setPages(prev => prev.map(page =>
      page.id === currentPageId
        ? { ...page, categories: [...(page.categories || []), newCategory] }
        : page
    ));

    // 위치가 변경된 경우 캔버스를 새 위치로 자동 이동
    if (position && (newPosition.x !== originalPosition.x || newPosition.y !== originalPosition.y)) {
      // 카테고리의 중심점 계산 (블록 중심이 화면 중앙에 오도록)
      const categoryCenterX = newPosition.x + 100; // 카테고리 너비의 절반
      const categoryCenterY = newPosition.y + 30; // 카테고리 높이의 절반

      // 캔버스 크기 (윈도우 크기 기준, 좌우 패널 제외)
      const canvasWidth = window.innerWidth - (leftPanelWidth + (rightPanelOpen ? rightPanelWidth : 0));
      const canvasHeight = window.innerHeight;

      const newOffset = centerCanvasOnPosition(
        { x: categoryCenterX, y: categoryCenterY },
        canvasWidth,
        canvasHeight,
        canvasScale
      );

      setCanvasOffset(newOffset);
    }

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
    // 삭제된 카테고리의 제목 가져오기
    const deletedCategory = pages.find(p => p.id === currentPageId)?.categories?.find(c => c.id === categoryId);
    const categoryTitle = deletedCategory?.title || '카테고리';

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

    // 단축 이동 목록에서 삭제된 카테고리 제거
    setQuickNavItems(prev => prev.filter(item => item.targetId !== categoryId));

    // 실행 취소를 위한 상태 저장
    setTimeout(() => saveCanvasState('category_delete', `카테고리 삭제: ${categoryTitle}`), 0);
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const targetCategory = page.categories.find(c => c.id === categoryId);
      if (!targetCategory) return page;

      const newExpandedState = !targetCategory.isExpanded;

      // 모든 하위 카테고리 ID 수집 (재귀적으로)
      const getAllDescendantCategoryIds = (catId: string): string[] => {
        const childCategories = page.categories.filter(c => c.parentId === catId);
        return childCategories.flatMap(child => [child.id, ...getAllDescendantCategoryIds(child.id)]);
      };

      const descendantIds = getAllDescendantCategoryIds(categoryId);
      const affectedIds = [categoryId, ...descendantIds];

      return {
        ...page,
        categories: page.categories.map(category =>
          affectedIds.includes(category.id)
            ? { ...category, isExpanded: newExpandedState }
            : category
        )
      };
    }));
  };

  const moveToCategory = (itemId: string, categoryId: string | null) => {

    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        // Determine if item is memo or category
        const isMemo = page.memos.some(memo => memo.id === itemId);
        const isCategory = (page.categories || []).some(cat => cat.id === itemId);


        if (isMemo) {
          const targetCategory = categoryId ? (page.categories || []).find(cat => cat.id === categoryId) : null;

          const updatedMemos = page.memos.map(memo => {
            if (memo.id === itemId) {
              let newPosition = memo.position;

              // 카테고리에 종속시킬 때 위치를 카테고리 블록 아래로 조정
              if (categoryId && targetCategory) {
                newPosition = {
                  x: targetCategory.position.x + 30,
                  y: targetCategory.position.y + 200
                };

              }

              console.log('[moveToCategory] parentId 변경:', itemId, '이전:', memo.parentId, '→ 새로운:', categoryId || undefined);
              return { ...memo, parentId: categoryId || undefined, position: newPosition };
            }
            return memo;
          });
          const updatedCategories = (page.categories || []).map(category => {
            if (categoryId && category.id === categoryId) {
              const newChildren = category.children.includes(itemId)
                ? category.children
                : [...category.children, itemId];
              return {
                ...category,
                children: newChildren,
                isExpanded: true // 메모 추가 시 자동으로 확장 상태로 변경
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
              const newChildren = category.children.includes(itemId)
                ? category.children
                : [...category.children, itemId];
              return {
                ...category,
                children: newChildren,
                isExpanded: true // 카테고리 추가 시 자동으로 확장 상태로 변경
              };
            }
            // Remove from other categories
            const filteredChildren = category.children.filter(childId => childId !== itemId);
            if (filteredChildren.length !== category.children.length) {
            }
            return {
              ...category,
              children: filteredChildren
            };
          });
          return { ...page, categories: updatedCategories };
        }
      }
      return page;
    }));

    // 메모를 카테고리에 추가한 경우 해당 카테고리의 캐시 제거 (영역 재계산을 위해)
    if (categoryId) {
      setDraggedCategoryAreas(prev => {
        const newAreas = { ...prev };
        delete newAreas[categoryId];
        return newAreas;
      });
    }

    // moveToCategory에서는 충돌 검사를 하지 않음 (무한 루프 방지)
    // 충돌 검사는 드래그 완료 시에만 수행됨

    // Save canvas state for undo/redo
    const targetName = categoryId ? `카테고리 ${categoryId}` : '최상위';
    setTimeout(() => saveCanvasState('move_to_category', `종속 변경: ${itemId} → ${targetName}`), 0);
  };

  // Shift 드래그로 카테고리에 카테고리 추가
  const handleShiftDropCategory = (draggedCategory: CategoryBlock, position: { x: number; y: number }, currentPage: Page, cachedAreas?: {[categoryId: string]: any}) => {
    // 카테고리 찾기
    const categoryWidth = draggedCategory.size?.width || 200;
    const categoryHeight = draggedCategory.size?.height || 80;
    const categoryBounds = {
      left: position.x,
      top: position.y,
      right: position.x + categoryWidth,
      bottom: position.y + categoryHeight
    };

    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    // 드래그 중인 카테고리와 그 모든 하위 카테고리들을 제외한 페이지 데이터 생성
    const getAllDescendantIds = (categoryId: string): string[] => {
      const descendants: string[] = [categoryId];
      const children = (currentPage.categories || []).filter(c => c.parentId === categoryId);
      children.forEach(child => {
        descendants.push(...getAllDescendantIds(child.id));
      });
      return descendants;
    };

    const excludedIds = getAllDescendantIds(draggedCategory.id);
    const pageWithoutDraggingCategory = {
      ...currentPage,
      categories: (currentPage.categories || []).filter(c => !excludedIds.includes(c.id)),
      memos: currentPage.memos.filter(m => !excludedIds.includes(m.parentId || ''))
    };

    // 타겟 카테고리 찾기 (자기 자신과 자신의 하위는 이미 pageWithoutDraggingCategory에서 제외됨)
    // 겹치는 모든 카테고리 찾기
    const overlappingCategories = pageWithoutDraggingCategory.categories?.filter(category => {

      // 1. 카테고리 블록과의 겹침 체크
      const catWidth = category.size?.width || 200;
      const catHeight = category.size?.height || 80;
      const catBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + catWidth,
        bottom: category.position.y + catHeight
      };

      if (isOverlapping(categoryBounds, catBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 카테고리를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingCategory);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(categoryBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    let targetCategory: CategoryBlock | null = null;

    if (overlappingCategories.length > 0) {
      // 각 카테고리의 깊이를 계산
      const categoriesWithDepth = overlappingCategories.map(category => {
        let depth = 0;
        let checkParent = category.parentId;
        while (checkParent) {
          depth++;
          const parentCat = currentPage.categories?.find(c => c.id === checkParent);
          checkParent = parentCat?.parentId;
        }
        return { category, depth };
      });

      // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
      const deepest = categoriesWithDepth.reduce((max, item) =>
        item.depth > max.depth ? item : max
      );

      targetCategory = deepest.category;
    }

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedCategory.parentId !== newParentId;

    // 다중 선택된 카테고리들도 함께 종속
    const categoriesToMove = selectedCategoryIds.includes(draggedCategory.id)
      ? [draggedCategory.id, ...selectedCategoryIds.filter(id => id !== draggedCategory.id)]
      : [draggedCategory.id];

    if (parentChanged) {
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          // 원래 위치 정보 가져오기 (드래그 시작 시 저장된 위치)
          const originalMemoPositions = dragStartMemoPositions.current.get(draggedCategory.id);
          const originalCategoryPositions = dragStartCategoryPositions.current.get(draggedCategory.id);

          // 부모 카테고리의 children 업데이트
          let updatedCategories = (p.categories || []).map(category => {
            // 드래그된 카테고리들의 parentId만 변경하고 위치는 원래대로
            if (categoriesToMove.includes(category.id)) {
              const originalPos = draggedCategoryAreas[category.id]?.originalPosition;
              return {
                ...category,
                parentId: newParentId,
                position: originalPos || category.position  // 원래 위치로 복원
              };
            }

            // 하위 카테고리들도 원래 위치로 복원
            if (originalCategoryPositions) {
              const originalPos = originalCategoryPositions.get(category.id);
              if (originalPos) {
                category = { ...category, position: originalPos };
              }
            }

            // 이전 부모들에서 제거 (다중 선택된 카테고리들 모두)
            if (categoriesToMove.some(catId => {
              const cat = p.categories?.find(c => c.id === catId);
              return cat?.parentId === category.id;
            })) {
              return {
                ...category,
                children: (category.children || []).filter(id => !categoriesToMove.includes(id))
              };
            }

            // 새 부모에 추가 (다중 선택된 카테고리들 모두)
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              const newChildren = [...currentChildren, ...categoriesToMove.filter(id => !currentChildren.includes(id))];
              return {
                ...category,
                children: newChildren,
                isExpanded: true  // 자동 확장
              };
            }

            return category;
          });

          // 하위 메모들도 원래 위치로 복원
          let updatedMemos = p.memos;
          if (originalMemoPositions) {
            updatedMemos = p.memos.map(memo => {
              const originalPos = originalMemoPositions.get(memo.id);
              if (originalPos) {
                return { ...memo, position: originalPos };
              }
              return memo;
            });
          }

          return {
            ...p,
            categories: updatedCategories,
            memos: updatedMemos
          };
        }
        return p;
      }));

      // Shift 드래그로 카테고리에 넣을 때만 펼침 (빼낼 때는 펼치지 않음)
      if (targetCategory && newParentId && !targetCategory.isExpanded) {
        toggleCategoryExpanded(targetCategory.id);
      }

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 카테고리 이동: ${draggedCategory.title} → ${targetName} (모든 하위 항목 포함)`);

      // 드롭 후 캐시 클리어 (중요!)
      clearCategoryCache(draggedCategory.id);
    } else {
      // 같은 카테고리 내에서 위치만 변경
      setPages(pages.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            categories: (p.categories || []).map(category =>
              category.id === draggedCategory.id
                ? { ...category, position }
                : category
            )
          };
        }
        return p;
      }));
    }
  };

  // Shift 드래그로 카테고리에 새 메모 추가
  const handleShiftDrop = (draggedMemo: MemoBlock, position: { x: number; y: number }, currentPage: Page, cachedAreas?: {[categoryId: string]: any}) => {
    // 카테고리 찾기
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };

    const isOverlapping = (bounds1: any, bounds2: any, margin = 20) => {
      return !(bounds1.right + margin < bounds2.left ||
               bounds1.left - margin > bounds2.right ||
               bounds1.bottom + margin < bounds2.top ||
               bounds1.top - margin > bounds2.bottom);
    };

    // 드래그 중인 메모를 제외한 페이지 데이터 생성
    const pageWithoutDraggingMemo = {
      ...currentPage,
      memos: currentPage.memos.filter(m => m.id !== draggedMemo.id)
    };

    // 카테고리 블록과 영역 모두 체크 - 겹치는 모든 카테고리 찾기
    const overlappingCategories = currentPage.categories?.filter(category => {
      // 1. 카테고리 블록과의 겹침 체크
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryBounds = {
        left: category.position.x,
        top: category.position.y,
        right: category.position.x + categoryWidth,
        bottom: category.position.y + categoryHeight
      };

      if (isOverlapping(memoBounds, categoryBounds, 20)) {
        return true;
      }

      // 2. 카테고리 영역과의 겹침 체크
      if (category.isExpanded) {
        let categoryArea;

        // 캐시된 영역이 있으면 사용 (드래그 중인 메모 제외된 고정 영역)
        if (cachedAreas && cachedAreas[category.id]) {
          categoryArea = cachedAreas[category.id];
        } else {
          // 캐시 없으면 드래그 중인 메모를 제외하고 계산
          categoryArea = calculateCategoryArea(category, pageWithoutDraggingMemo);
        }

        if (categoryArea) {
          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };
          if (isOverlapping(memoBounds, areaBounds, 20)) {
            return true;
          }
        }
      }

      return false;
    }) || [];

    // 겹치는 카테고리 중에서 가장 깊은 레벨(가장 하위) 카테고리 선택
    // 깊이(depth)를 계산하여 가장 깊은 것을 선택
    let targetCategory: CategoryBlock | null = null;

    if (overlappingCategories.length > 0) {
      // 각 카테고리의 깊이를 계산
      const categoriesWithDepth = overlappingCategories.map(category => {
        let depth = 0;
        let checkParent = category.parentId;
        while (checkParent) {
          depth++;
          const parentCat = currentPage.categories?.find(c => c.id === checkParent);
          checkParent = parentCat?.parentId;
        }
        return { category, depth };
      });

      // 깊이가 가장 큰 카테고리 선택 (같은 깊이면 첫 번째)
      const deepest = categoriesWithDepth.reduce((max, item) =>
        item.depth > max.depth ? item : max
      );

      targetCategory = deepest.category;
    }

    // 카테고리 변경 처리
    const newParentId = targetCategory ? targetCategory.id : undefined;
    const parentChanged = draggedMemo.parentId !== newParentId;

    console.log('[handleShiftDrop] 함수 호출됨 - draggedMemo:', draggedMemo.id, 'draggedMemo.parentId:', draggedMemo.parentId, 'newParentId:', newParentId, 'parentChanged:', parentChanged);

    if (parentChanged) {
      // 원래 위치 가져오기 (드래그 시작 시 저장된 위치)
      const originalMemoPositions = dragStartMemoPositions.current.get(draggedMemo.id);

      // 다중 선택된 메모들도 함께 종속
      const memosToMove = selectedMemoIds.includes(draggedMemo.id)
        ? [draggedMemo.id, ...selectedMemoIds.filter(id => id !== draggedMemo.id)]
        : [draggedMemo.id];

      console.log('[handleShiftDrop] setPages 호출 시작 - 이동할 메모:', memosToMove);
      setPages(prev => {
        console.log('[handleShiftDrop] setPages 콜백 실행');
        return prev.map(p => {
          if (p.id === currentPageId) {
          // 메모의 parentId만 변경하고 위치는 원래대로 복원
          const updatedMemos = p.memos.map(memo => {
            if (memosToMove.includes(memo.id)) {
              const originalPos = originalMemoPositions?.get(memo.id);
              console.log('[handleShiftDrop] parentId 변경:', memo.id, '이전:', memo.parentId, '→ 새로운:', newParentId);
              return {
                ...memo,
                parentId: newParentId,
                position: originalPos || memo.position  // 원래 위치로 복원
              };
            }
            return memo;
          });

          // 카테고리의 children 배열 업데이트 (그리고 필요시 expand)
          const updatedCategories = (p.categories || []).map(category => {
            // 이전 부모에서 제거 (모든 이동 메모)
            if (memosToMove.some(memoId => {
              const memo = p.memos.find(m => m.id === memoId);
              return memo?.parentId === category.id;
            })) {
              console.log('[handleShiftDrop] 이전 부모 children 업데이트:', category.id);
              return {
                ...category,
                children: (category.children || []).filter(id => !memosToMove.includes(id))
              };
            }
            // 새 부모에 추가 + expand
            if (category.id === newParentId) {
              const currentChildren = category.children || [];
              const newChildren = [...currentChildren, ...memosToMove.filter(id => !currentChildren.includes(id))];
              console.log('[handleShiftDrop] 새 부모 children 업데이트:', category.id, 'before:', currentChildren, 'after:', newChildren);
              return {
                ...category,
                children: newChildren,
                isExpanded: true  // 여기서 expand 처리
              };
            }
            return category;
          });

            return {
              ...p,
              memos: updatedMemos,
              categories: updatedCategories
            };
          }
          return p;
        });
      });

      const targetName = targetCategory ? `카테고리 ${targetCategory.title}` : '최상위';
      saveCanvasState('move_to_category', `Shift 드래그로 메모 이동: ${draggedMemo.title} → ${targetName}`);

      // Shift 드래그로 처리된 메모 플래그 설정 (detectCategoryOnDrop에서 중복 처리 방지)
      shiftDropProcessedMemos.current.add(draggedMemo.id);
      // 잠시 후 플래그 제거 (다음 드래그를 위해)
      setTimeout(() => {
        shiftDropProcessedMemos.current.delete(draggedMemo.id);
      }, 100);

      // Shift 드래그 후 타이머 클리어 (일반 드래그 타이머와 충돌 방지)
      const existingTimer = categoryExitTimers.current.get(draggedMemo.id);
      if (existingTimer) {
        console.log('[handleShiftDrop] 기존 타이머 클리어:', draggedMemo.id);
        clearTimeout(existingTimer);
        categoryExitTimers.current.delete(draggedMemo.id);
      } else {
        console.log('[handleShiftDrop] 클리어할 타이머 없음:', draggedMemo.id);
      }
    } else {
      // 같은 카테고리 내에서 위치만 변경
      setPages(prev => prev.map(p => {
        if (p.id === currentPageId) {
          return {
            ...p,
            memos: p.memos.map(memo =>
              memo.id === draggedMemo.id
                ? { ...memo, position }
                : memo
            )
          };
        }
        return p;
      }));
    }
  };

  // 카테고리 영역 Shift+드래그 drop 처리 (Canvas에서 호출)
  const handleCategoryAreaShiftDrop = (category: CategoryBlock, position: { x: number; y: number }) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return;

    // 캐시된 영역이 있으면 사용
    const cachedAreas = shiftDragAreaCache.current;

    // handleShiftDropCategory 재사용
    handleShiftDropCategory(category, position, currentPage, cachedAreas);
  };

  // 카테고리 드래그 완료 시 카테고리 블록 겹침 감지 (Shift 드래그)
  const detectCategoryDropForCategory = (categoryId: string, position: { x: number; y: number }) => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedCategory = currentPage.categories.find(c => c.id === categoryId);
    if (!draggedCategory) {
      return;
    }

    // Shift 키가 눌려있으면 카테고리-카테고리 종속 모드
    if (isShiftPressed) {
      handleShiftDropCategory(draggedCategory, position, currentPage, shiftDragAreaCache.current);
    }
  };

  // 드래그 완료 시 카테고리 블록 겹침 감지
  const detectCategoryOnDrop = (memoId: string, position: { x: number; y: number }) => {
    console.log('[detectCategoryOnDrop] 호출됨 - memoId:', memoId, 'isShiftPressed:', isShiftPressed, 'processed:', shiftDropProcessedMemos.current.has(memoId));

    // Shift 드래그로 이미 처리된 메모면 중복 처리 방지
    if (shiftDropProcessedMemos.current.has(memoId)) {
      console.log('[detectCategoryOnDrop] Shift 드래그로 이미 처리됨, 스킵:', memoId);
      return;
    }

    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage || !currentPage.categories) {
      return;
    }

    const draggedMemo = currentPage.memos.find(m => m.id === memoId);
    if (!draggedMemo) {
      return;
    }

    // Shift 키가 눌려있으면 새 메모 복사 모드
    if (isShiftPressed) {
      handleShiftDrop(draggedMemo, position, currentPage, shiftDragAreaCache.current);
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



    // 드래그된 메모의 경계 박스 계산
    const memoWidth = draggedMemo.size?.width || 200;
    const memoHeight = draggedMemo.size?.height || 95;
    const memoBounds = {
      left: position.x,
      top: position.y,
      right: position.x + memoWidth,
      bottom: position.y + memoHeight
    };


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


      const overlapping = isOverlapping(memoBounds, categoryBounds, 20);

      return overlapping;
    });

    if (targetCategory) {
      // 같은 카테고리로 이동하려는 경우 - 실제 겹침이므로 정상적인 카테고리 내 이동
      if (draggedMemo.parentId === targetCategory.id) {
        return;
      }

      // 다른 카테고리로 이동하는 경우 - 방지 (자식 메모는 자동 이동 금지)
      if (draggedMemo.parentId && draggedMemo.parentId !== targetCategory.id) {
        // 자식 메모가 다른 카테고리와 겹치면 밀어내기만 수행하고 이동은 금지
        const categoryArea = calculateCategoryArea(targetCategory, currentPage);
        if (categoryArea) {
          pushAwayConflictingMemos(categoryArea, targetCategory.id, currentPage);
        }
        return; // 이동 중단
      }

      // 메모를 카테고리에 자동으로 추가
      moveToCategory(memoId, targetCategory.id);
      return;
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
                console.log('[categoryExitTimer] 타이머 실행 - 영역 이탈 확인, moveToCategory 호출:', memoId);
                moveToCategory(memoId, null);
              } else {
                console.log('[categoryExitTimer] 타이머 실행 - 여전히 영역 안에 있음, 유지:', memoId);
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
          }
        }
      } else {
      }
    }
  };

  // 카테고리 위치 업데이트 히스토리 타이머 관리
  const categoryPositionTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 이전 프레임 위치 저장 (프레임 간 delta 계산용)
  const previousFramePosition = React.useRef<Map<string, {x: number, y: number}>>(new Map());

  // 캐시 생성 추적 (동기적으로)
  const cacheCreationStarted = React.useRef<Set<string>>(new Set());

  const updateCategoryPosition = (categoryId: string, position: { x: number; y: number }) => {
    console.log('[App] updateCategoryPosition 호출 - categoryId:', categoryId, 'position:', position, 'timestamp:', Date.now());

    // 먼저 현재 카테고리 위치를 찾아서 델타 값 계산 (state 업데이트 전의 원본 위치 기준)
    const currentPage = pages.find(p => p.id === currentPageId);
    const targetCategory = currentPage?.categories?.find(cat => cat.id === categoryId);

    let deltaX = 0;
    let deltaY = 0;
    let frameDeltaX = 0;
    let frameDeltaY = 0;

    if (targetCategory) {
      deltaX = position.x - targetCategory.position.x;
      deltaY = position.y - targetCategory.position.y;

      // 이전 프레임 위치와 비교하여 프레임 간 delta 계산
      const prevPos = previousFramePosition.current.get(categoryId);
      if (prevPos) {
        frameDeltaX = position.x - prevPos.x;
        frameDeltaY = position.y - prevPos.y;
      } else {
        // 첫 프레임이면 전체 delta 사용
        frameDeltaX = deltaX;
        frameDeltaY = deltaY;
      }

      // 현재 위치를 이전 프레임으로 저장
      previousFramePosition.current.set(categoryId, { x: position.x, y: position.y });

      // 첫 번째 위치 변경 시 드래그 시작으로 간주하고 영역 캐시 및 메모 원본 위치 저장
      if (!cacheCreationStarted.current.has(categoryId) && currentPage) {
        console.log('[App] 캐시 생성 시작 - categoryId:', categoryId, '원본 위치:', targetCategory.position);
        cacheCreationStarted.current.add(categoryId);

        const currentArea = calculateCategoryArea(targetCategory, currentPage);
        if (currentArea) {
          setDraggedCategoryAreas(prev => ({
            ...prev,
            [categoryId]: {
              area: currentArea,
              originalPosition: { x: targetCategory.position.x, y: targetCategory.position.y }
            }
          }));
        }

        // 모든 하위 카테고리 ID 수집 (재귀적으로)
        const getAllDescendantCategoryIds = (parentId: string): string[] => {
          const directChildren = (currentPage.categories || [])
            .filter(cat => cat.parentId === parentId)
            .map(cat => cat.id);

          const allDescendants = [...directChildren];
          directChildren.forEach(childId => {
            allDescendants.push(...getAllDescendantCategoryIds(childId));
          });

          return allDescendants;
        };

        const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

        // 다중 선택된 모든 카테고리들의 하위 요소 ID 수집
        const isMultiSelected = selectedCategoryIds.includes(categoryId);
        const allSelectedCategoriesDescendants = new Set<string>();
        if (isMultiSelected) {
          selectedCategoryIds.forEach(selectedCatId => {
            allSelectedCategoriesDescendants.add(selectedCatId);
            getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
              allSelectedCategoriesDescendants.add(descId);
            });
          });
        }

        // 모든 하위 depth의 메모들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const memoPositions = new Map<string, {x: number, y: number}>();
        currentPage.memos.forEach(memo => {
          // 드래그 중인 카테고리의 하위 메모
          if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 다른 카테고리들의 하위 메모
          else if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
          // 다중 선택된 메모들
          else if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
            memoPositions.set(memo.id, { x: memo.position.x, y: memo.position.y });
          }
        });
        dragStartMemoPositions.current.set(categoryId, memoPositions);

        // 모든 하위 depth의 카테고리들 원본 위치 저장 (드래그 중인 카테고리 + 다중 선택된 다른 카테고리들)
        const categoryPositions = new Map<string, {x: number, y: number}>();
        currentPage.categories?.forEach(cat => {
          // 드래그 중인 카테고리의 하위 카테고리
          if (allDescendantCategoryIds.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
          // 다중 선택된 다른 카테고리들과 그 하위 카테고리들
          else if (isMultiSelected && allSelectedCategoriesDescendants.has(cat.id) && cat.id !== categoryId) {
            categoryPositions.set(cat.id, { x: cat.position.x, y: cat.position.y });
          }
        });
        dragStartCategoryPositions.current.set(categoryId, categoryPositions);

      }
    }

    setPages(prev => prev.map(page => {
      if (page.id !== currentPageId) return page;

      const pageTargetCategory = (page.categories || []).find(cat => cat.id === categoryId);
      if (!pageTargetCategory) return page;

      // 원본 카테고리 위치와 새 위치의 총 델타 계산
      const cachedData = draggedCategoryAreas[categoryId];
      const totalDeltaX = cachedData ? position.x - cachedData.originalPosition.x : deltaX;
      const totalDeltaY = cachedData ? position.y - cachedData.originalPosition.y : deltaY;

      // 모든 하위 카테고리 ID 수집 (재귀적으로)
      const getAllDescendantCategoryIds = (parentId: string): string[] => {
        const directChildren = (page.categories || [])
          .filter(cat => cat.parentId === parentId)
          .map(cat => cat.id);

        const allDescendants = [...directChildren];
        directChildren.forEach(childId => {
          allDescendants.push(...getAllDescendantCategoryIds(childId));
        });

        return allDescendants;
      };

      // 다중 선택된 카테고리들 확인
      const isMultiSelected = selectedCategoryIds.includes(categoryId);


      // 드래그 중인 카테고리의 하위 요소만 수집 (이들은 부모를 따라 이동)
      const allDescendantCategoryIds = new Set([categoryId, ...getAllDescendantCategoryIds(categoryId)]);

      // 다중 선택된 "모든" 카테고리들의 하위 요소 수집
      const allSelectedCategoriesDescendants = new Set<string>();
      if (isMultiSelected) {
        selectedCategoryIds.forEach(selectedCatId => {
          allSelectedCategoriesDescendants.add(selectedCatId);
          getAllDescendantCategoryIds(selectedCatId).forEach(descId => {
            allSelectedCategoriesDescendants.add(descId);
          });
        });
      }

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = page.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 모든 하위 depth의 메모들도 함께 이동 (절대 위치 계산)
      const updatedMemos = page.memos.map(memo => {
        // 1. 드래그 중인 카테고리의 하위 메모들 이동 (절대 위치)
        if (memo.parentId && allDescendantCategoryIds.has(memo.parentId)) {
          const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
          if (originalPos) {
            return {
              ...memo,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음 (드래그 종료 후 호출 방지)
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 메모들도 이동 (절대 위치)
        if (isMultiSelected && memo.parentId && allSelectedCategoriesDescendants.has(memo.parentId)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 메모들도 이동 (절대 위치, 선택된 카테고리의 하위 요소가 아닌 경우만)
        if (isMultiSelected && selectedMemoIds.includes(memo.id)) {
          if (!isDescendantOfSelectedCategory(memo.parentId)) {
            const originalPos = dragStartMemoPositions.current.get(categoryId)?.get(memo.id);
            if (originalPos) {
              return {
                ...memo,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }
        return memo;
      });

      // 모든 하위 depth의 카테고리들도 함께 이동 (절대 위치 계산)
      const updatedCategories = (page.categories || []).map(category => {
        if (category.id === categoryId) {
          console.log('[App setPages] 카테고리 위치 업데이트 - categoryId:', categoryId, 'position:', position);
          return { ...category, position };
        }

        // 1. 드래그 중인 카테고리의 하위 카테고리들 이동 (절대 위치)
        if (allDescendantCategoryIds.has(category.id) && category.id !== categoryId) {
          const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
          if (originalPos) {
            return {
              ...category,
              position: {
                x: originalPos.x + totalDeltaX,
                y: originalPos.y + totalDeltaY
              }
            };
          }
          // originalPos가 없으면 위치 변경하지 않음
        }

        // 2. 다중 선택된 다른 카테고리들의 하위 카테고리들도 이동 (절대 위치)
        if (isMultiSelected && allSelectedCategoriesDescendants.has(category.id)) {
          // 이미 위에서 처리했으면 스킵
          if (!allDescendantCategoryIds.has(category.id)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        // 3. 다중 선택된 최상위 카테고리들도 이동 (절대 위치, 하위가 아닌 것만)
        if (isMultiSelected && selectedCategoryIds.includes(category.id) && category.id !== categoryId && !allDescendantCategoryIds.has(category.id)) {
          if (!isDescendantOfSelectedCategory(category.parentId)) {
            const originalPos = dragStartCategoryPositions.current.get(categoryId)?.get(category.id);
            if (originalPos) {
              return {
                ...category,
                position: {
                  x: originalPos.x + totalDeltaX,
                  y: originalPos.y + totalDeltaY
                }
              };
            }
            // originalPos가 없으면 위치 변경하지 않음
          }
        }

        return category;
      });

      // 충돌 검사 수행 (Shift 누르면 충돌 검사 건너뛰기)
      if (!isShiftPressed) {
        const pageWithUpdates = {
          ...page,
          memos: updatedMemos,
          categories: updatedCategories
        };

        // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
        // 다중 선택된 모든 카테고리와 메모의 ID 수집
        const allMovingIds = isMultiSelected
          ? [...selectedCategoryIds, ...selectedMemoIds]
          : [categoryId];

        const collisionResult = resolveUnifiedCollisions(categoryId, 'area', pageWithUpdates, 10, allMovingIds);

        return {
          ...page,
          memos: collisionResult.updatedMemos,
          categories: collisionResult.updatedCategories
        };
      }

      return {
        ...page,
        memos: updatedMemos,
        categories: updatedCategories
      };
    }));

    // 기존 실시간 충돌 검사 로직 제거됨 (resolveAreaCollisions로 통합)
    /*
    // 실시간 면접촉 기반 고정 크기 충돌 검사 - 드래그 중에 작동
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      // 프레임 간 delta를 사용하여 실제 이동 방향 파악
      const capturedDeltaX = deltaX;
      const capturedDeltaY = deltaY;
      const capturedFrameDeltaX = frameDeltaX;
      const capturedFrameDeltaY = frameDeltaY;
      const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);


      setPages(prevPages => {
        const currentPage = prevPages.find(p => p.id === currentPageId);
        if (!currentPage) return prevPages;

        const movingCategory = currentPage.categories?.find(cat => cat.id === categoryId);
        if (!movingCategory) return prevPages;

        // 이동 중인 카테고리의 실제 표시 영역 (하위 메모들 포함)
        // 드래그 중인 카테고리는 캐시된 영역 사용 (크기 고정)
        let movingArea: any = null;

        if (draggedCategoryAreas[movingCategory.id]) {
          // 캐시된 영역이 있다면 현재 카테고리 위치에 맞게 좌표 조정
          const cached = draggedCategoryAreas[movingCategory.id];
          const deltaX = movingCategory.position.x - cached.originalPosition.x;
          const deltaY = movingCategory.position.y - cached.originalPosition.y;

          movingArea = {
            x: cached.area.x + deltaX,
            y: cached.area.y + deltaY,
            width: cached.area.width,   // 캐시된 크기 유지
            height: cached.area.height, // 캐시된 크기 유지
            color: cached.area.color
          };
        } else {
          // 캐시된 영역이 없으면 동적 계산
          movingArea = calculateCategoryArea(movingCategory, currentPage);
        }


        // 실제 영역이 없으면 충돌 검사 생략
        if (!movingArea) {
          return prevPages;
        }

        // 연쇄 충돌 처리: 우선순위 기반 반복 충돌 검사
        let hasCollision = false;
        const pushedMemoIds = new Set<string>(); // 밀려난 메모 추적

        // 초기 카테고리 상태 + 메모 상태 (충돌 계산용)
        let updatedCategories = [...(currentPage.categories || [])];
        let updatedMemosForCollision = [...currentPage.memos];

        // 우선순위 맵: 드래그 중인 카테고리가 최고 우선순위 (0)
        const priorityMap = new Map<string, number>();
        priorityMap.set(categoryId, 0);

        // 주 이동 방향 결정 (프레임 간 delta 사용)
        const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);

        // 최대 10회 반복 (연쇄 충돌)
        let iteration = 0;
        let continueCollisionCheck = true;

        while (continueCollisionCheck && iteration < 10) {
          continueCollisionCheck = false;
          iteration++;

          // 현재 반복에서 이동된 카테고리들
          const movedInThisIteration = new Map<string, {x: number, y: number}>();

          // 이전 상태 저장 (같은 반복 내에서 변경 전 값 참조)
          const previousCategories = [...updatedCategories];

          updatedCategories = updatedCategories.map(currentCat => {
            // 각 카테고리에 대해 우선순위가 높은 다른 카테고리들과 충돌 검사
            let resultCategory = { ...currentCat };
            let totalPushX = 0;
            let totalPushY = 0;
            let highestPusherPriority = Infinity;

            for (const otherCategory of previousCategories) {
              if (otherCategory.id === currentCat.id) continue;

              // 우선순위 확인: 현재 카테고리가 상대방보다 낮은 우선순위일 때만 밀림
              const currentPriority = priorityMap.get(currentCat.id) ?? Infinity;
              const otherPriority = priorityMap.get(otherCategory.id) ?? Infinity;

              if (currentPriority <= otherPriority) continue; // 우선순위가 같거나 높으면 밀리지 않음

              // 영역 계산 (이미 업데이트된 위치 기준 - 메모도 업데이트된 것 사용)
              const currentUpdated = updatedCategories.find(c => c.id === currentCat.id) || currentCat;
              const tempPage = { ...currentPage, memos: updatedMemosForCollision, categories: updatedCategories };
              const currentArea = calculateCategoryArea(currentUpdated, tempPage);
              const otherUpdated = updatedCategories.find(c => c.id === otherCategory.id) || otherCategory;
              const otherArea = calculateCategoryArea(otherUpdated, tempPage);

              if (!currentArea || !otherArea) continue;

              // 실제 영역 겹침 검사
              const isOverlapping = !(
                currentArea.x + currentArea.width <= otherArea.x ||
                currentArea.x >= otherArea.x + otherArea.width ||
                currentArea.y + currentArea.height <= otherArea.y ||
                currentArea.y >= otherArea.y + otherArea.height
              );

              if (!isOverlapping) continue;

              // 충돌한 면 판정
              let pushX = 0;
              let pushY = 0;

              // 밀려나는 영역의 경계
              const currentLeft = currentArea.x;
              const currentRight = currentArea.x + currentArea.width;
              const currentTop = currentArea.y;
              const currentBottom = currentArea.y + currentArea.height;

              // 밀어내는 영역의 경계
              const otherLeft = otherArea.x;
              const otherRight = otherArea.x + otherArea.width;
              const otherTop = otherArea.y;
              const otherBottom = otherArea.y + otherArea.height;

              // 주 이동 방향에 따라 해당 축만 충돌 검사
              if (isMainlyHorizontal) {
                // X축 충돌 검사
                const overlapRight = otherRight - currentLeft;
                if (overlapRight > 0 && otherLeft < currentLeft && otherRight < currentRight) {
                  pushX = overlapRight;
                }
                const overlapLeft = currentRight - otherLeft;
                if (overlapLeft > 0 && otherRight > currentRight && otherLeft > currentLeft) {
                  pushX = -overlapLeft;
                }
              } else {
                // Y축 충돌 검사
                const overlapBottom = otherBottom - currentTop;
                if (overlapBottom > 0 && otherTop < currentTop && otherBottom < currentBottom) {
                  pushY = overlapBottom;
                }
                const overlapTop = currentBottom - otherTop;
                if (overlapTop > 0 && otherBottom > currentBottom && otherTop > currentTop) {
                  pushY = -overlapTop;
                }
              }

              // 충돌이 감지되면 이동량 누적
              if (pushX !== 0 || pushY !== 0) {
                // 가장 우선순위가 높은 밀어내는 영역만 적용
                if (otherPriority < highestPusherPriority) {
                  totalPushX = pushX;
                  totalPushY = pushY;
                  highestPusherPriority = otherPriority;


                  // 우선순위 업데이트: 밀린 카테고리는 밀어낸 카테고리보다 1 낮은 우선순위
                  if (!priorityMap.has(currentCat.id)) {
                    priorityMap.set(currentCat.id, otherPriority + 1);
                  }
                }
              }
            }

            // 최종 이동량 적용
            if (totalPushX !== 0 || totalPushY !== 0) {
              const newPosition = {
                x: currentCat.position.x + totalPushX,
                y: currentCat.position.y + totalPushY
              };

              resultCategory = {
                ...resultCategory,
                position: newPosition
              };

              movedInThisIteration.set(currentCat.id, newPosition);
              hasCollision = true;
              continueCollisionCheck = true; // 다음 반복 필요

              // 영역이 밀릴 때 자식 메모도 함께 이동
              updatedMemosForCollision = updatedMemosForCollision.map(memo => {
                if (currentCat.children?.includes(memo.id)) {
                  return {
                    ...memo,
                    position: {
                      x: memo.position.x + totalPushX,
                      y: memo.position.y + totalPushY
                    }
                  };
                }
                return memo;
              });
            }

            return resultCategory;
          });
        }


        if (hasCollision) {

          // 충돌당한 카테고리들의 내부 메모들도 함께 이동
          const movedCategoryIds = new Set<string>();
          updatedCategories.forEach((cat, idx) => {
            const originalCat = (currentPage.categories || [])[idx];
            if (originalCat && (cat.position.x !== originalCat.position.x || cat.position.y !== originalCat.position.y)) {
              movedCategoryIds.add(cat.id);
            }
          });

          // 메모 충돌 처리: 영역과 메모 간 충돌 검사 (주 이동 방향 재사용)
          const updatedMemos = currentPage.memos.map(memo => {
            // 충돌당한 카테고리의 메모들만 이동 (충돌을 일으킨 카테고리 제외)
            if (memo.parentId && movedCategoryIds.has(memo.parentId) && memo.parentId !== categoryId) {
              const movedCategory = updatedCategories.find(c => c.id === memo.parentId);
              const originalCategory = (currentPage.categories || []).find(c => c.id === memo.parentId);
              if (movedCategory && originalCategory) {
                const memoDeltaX = movedCategory.position.x - originalCategory.position.x;
                const memoDeltaY = movedCategory.position.y - originalCategory.position.y;
                return {
                  ...memo,
                  position: {
                    x: memo.position.x + memoDeltaX,
                    y: memo.position.y + memoDeltaY
                  }
                };
              }
            }

            // 영역에 속하지 않은 독립 메모와의 충돌 처리
            if (!memo.parentId && memo.id !== categoryId) {
              const memoWidth = memo.size?.width || 200;
              const memoHeight = memo.size?.height || 150;
              const memoLeft = memo.position.x;
              const memoRight = memo.position.x + memoWidth;
              const memoTop = memo.position.y;
              const memoBottom = memo.position.y + memoHeight;

              // 영역과 메모의 충돌 검사
              const isOverlapping = !(
                movingArea.x + movingArea.width <= memoLeft ||
                movingArea.x >= memoRight ||
                movingArea.y + movingArea.height <= memoTop ||
                movingArea.y >= memoBottom
              );

              if (isOverlapping) {
                let pushX = 0;
                let pushY = 0;

                const movingAreaRight = movingArea.x + movingArea.width;
                const movingAreaBottom = movingArea.y + movingArea.height;

                // 주 이동 방향 결정 (프레임 간 delta 사용)
                const isMainlyHorizontal = Math.abs(capturedFrameDeltaX) > Math.abs(capturedFrameDeltaY);

                // 주 이동 방향에 따라 해당 축만 충돌 검사
                if (isMainlyHorizontal) {
                  // X축 충돌 검사
                  const overlapRight = movingAreaRight - memoLeft;
                  if (overlapRight > 0 && movingArea.x < memoLeft && movingAreaRight < memoRight) {
                    pushX = overlapRight;
                  }
                  const overlapLeft = memoRight - movingArea.x;
                  if (overlapLeft > 0 && movingAreaRight > memoRight && movingArea.x > memoLeft) {
                    pushX = -overlapLeft;
                  }
                } else {
                  // Y축 충돌 검사
                  const overlapBottom = movingAreaBottom - memoTop;
                  if (overlapBottom > 0 && movingArea.y < memoTop && movingAreaBottom < memoBottom) {
                    pushY = overlapBottom;
                  }
                  const overlapTop = memoBottom - movingArea.y;
                  if (overlapTop > 0 && movingAreaBottom > memoBottom && movingArea.y > memoTop) {
                    pushY = -overlapTop;
                  }
                }

                if (pushX !== 0 || pushY !== 0) {
                  pushedMemoIds.add(memo.id);
                  return {
                    ...memo,
                    position: {
                      x: memo.position.x + pushX,
                      y: memo.position.y + pushY
                    }
                  };
                }
              }
            }

            return memo;
          });

          return prevPages.map(page =>
            page.id === currentPageId
              ? { ...page, categories: updatedCategories, memos: updatedMemos }
              : page
          );
        }

        return prevPages;
      });
    }
    */

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


  const selectCategory = (categoryId: string, isShiftClick: boolean = false) => {
    // 메모 선택 해제
    setSelectedMemoId(null);
    setSelectedMemoIds([]);

    // 빈 문자열이거나 유효하지 않은 ID인 경우 모든 선택 해제
    if (!categoryId || !currentPage?.categories?.find(c => c.id === categoryId)) {
      setSelectedCategoryId(null);
      setSelectedCategoryIds([]);
      // 드래그 선택 UI도 초기화
      setIsDragSelecting(false);
      setDragSelectStart(null);
      setDragSelectEnd(null);
      setDragHoveredMemoIds([]);
      setDragHoveredCategoryIds([]);
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

    // 삭제된 메모의 제목 가져오기
    const deletedMemo = pages.find(p => p.id === currentPageId)?.memos.find(m => m.id === selectedMemoId);
    const memoTitle = deletedMemo?.title || '메모';

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

    // 단축 이동 목록에서 삭제된 메모 제거
    setQuickNavItems(prev => prev.filter(item => item.targetId !== selectedMemoId));

    setSelectedMemoId(null);

    // 실행 취소를 위한 상태 저장
    setTimeout(() => saveCanvasState('memo_delete', `메모 삭제: ${memoTitle}`), 0);
  };

  // 특정 메모를 ID로 삭제하는 함수 (검색 결과에서 사용)
  const deleteMemoById = (memoId: string) => {
    // 삭제된 메모의 제목 가져오기
    let deletedMemoTitle = '메모';
    for (const page of pages) {
      const memo = page.memos.find(m => m.id === memoId);
      if (memo) {
        deletedMemoTitle = memo.title || '메모';
        break;
      }
    }

    setPages(prev => prev.map(page => ({
      ...page,
      memos: page.memos
        .filter(memo => memo.id !== memoId) // 해당 메모 삭제
        .map(memo => ({
          ...memo,
          connections: memo.connections.filter(connId => connId !== memoId) // 다른 메모들에서 삭제된 메모로의 연결 제거
        })),
      categories: (page.categories || []).map(category => ({
        ...category,
        connections: category.connections.filter(connId => connId !== memoId), // 카테고리에서도 삭제된 메모로의 연결 제거
        children: category.children.filter(childId => childId !== memoId) // 자식 목록에서도 제거
      }))
    })));

    // 단축 이동 목록에서 삭제된 메모 제거
    setQuickNavItems(prev => prev.filter(item => item.targetId !== memoId));

    // 삭제한 메모가 현재 선택된 메모였다면 선택 해제
    if (selectedMemoId === memoId) {
      setSelectedMemoId(null);
    }

    // 실행 취소를 위한 상태 저장
    setTimeout(() => saveCanvasState('memo_delete', `메모 삭제: ${deletedMemoTitle}`), 0);
  };

  // 통합 삭제 함수 - 현재 선택된 아이템(메모 또는 카테고리) 삭제
  const deleteSelectedItem = () => {
    // 다중 선택된 항목들 삭제
    if (selectedMemoIds.length > 0 || selectedCategoryIds.length > 0) {
      const memoCount = selectedMemoIds.length;
      const categoryCount = selectedCategoryIds.length;

      setPages(prev => prev.map(page => {
        if (page.id !== currentPageId) return page;

        return {
          ...page,
          memos: page.memos.filter(memo => !selectedMemoIds.includes(memo.id)),
          categories: (page.categories || []).filter(cat => !selectedCategoryIds.includes(cat.id))
        };
      }));

      // 단축 이동 목록에서 삭제된 메모/카테고리 제거
      setQuickNavItems(prev => prev.filter(item =>
        !selectedMemoIds.includes(item.targetId) && !selectedCategoryIds.includes(item.targetId)
      ));

      // 선택 상태 초기화
      setSelectedMemoIds([]);
      setSelectedCategoryIds([]);

      // 단일 선택도 초기화
      if (selectedMemoIds.includes(selectedMemoId || '')) {
        setSelectedMemoId(null);
      }
      if (selectedCategoryIds.includes(selectedCategoryId || '')) {
        setSelectedCategoryId(null);
      }

      // 실행 취소를 위한 상태 저장
      const description = `다중 삭제: 메모 ${memoCount}개, 카테고리 ${categoryCount}개`;
      setTimeout(() => saveCanvasState('bulk_delete', description), 0);
    }
    // 단일 선택 삭제
    else if (selectedMemoId) {
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
      setIsConnecting(false);
      setConnectingFromId(null);
      setConnectingFromDirection(null);
      return;
    }

    // 카테고리-카테고리 연결 시 부모-자식 관계 체크
    if (fromCategory && toCategory) {
      const categories = currentPageData.categories || [];

      // fromCategory가 toCategory의 조상인지 확인 (from이 to의 부모/조부모/...)
      const fromIsAncestorOfTo = isAncestor(fromId, toId, categories);
      // toCategory가 fromCategory의 조상인지 확인 (to가 from의 부모/조부모/...)
      const toIsAncestorOfFrom = isAncestor(toId, fromId, categories);

      // 부모-자식 관계가 있으면 연결 금지
      if (fromIsAncestorOfTo || toIsAncestorOfFrom) {
        setIsConnecting(false);
        setConnectingFromId(null);
        setConnectingFromDirection(null);
        return;
      }
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

  const startConnection = (memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => {
    setIsConnecting(true);
    setConnectingFromId(memoId);
    setConnectingFromDirection(direction || null);
  };

  const updateDragLine = (mousePos: { x: number; y: number }) => {
    setDragLineEnd(mousePos);
  };

  const cancelConnection = () => {
    setIsConnecting(false);
    setConnectingFromId(null);
    setConnectingFromDirection(null);
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
    // 메모가 이동하면 부모 카테고리의 캐시 제거 (영역 재계산을 위해)
    const currentPage = pages.find(p => p.id === currentPageId);
    const movedMemo = currentPage?.memos.find(m => m.id === memoId);
    if (movedMemo?.parentId) {
      clearCategoryCache(movedMemo.parentId);
    }

    // 다중 선택된 메모들 확인
    const isMultiSelected = selectedMemoIds.includes(memoId);
    const deltaX = movedMemo ? position.x - movedMemo.position.x : 0;
    const deltaY = movedMemo ? position.y - movedMemo.position.y : 0;

    setPages(prev => {
      const currentPage = prev.find(p => p.id === currentPageId);
      if (!currentPage) {
        return prev.map(page =>
          page.id === currentPageId
            ? {
                ...page,
                memos: page.memos.map(memo =>
                  memo.id === memoId ? { ...memo, position } : memo
                )
              }
            : page
        );
      }

      const movedMemo = currentPage.memos.find(m => m.id === memoId);
      if (!movedMemo) return prev;

      // 영역과의 충돌 체크 (방향별)
      const categories = currentPage.categories || [];
      const memoWidth = movedMemo.size?.width || 200;
      const memoHeight = movedMemo.size?.height || 95;

      let restrictedX = false;
      let restrictedY = false;

      // 부모가 없는 메모만 영역 충돌 검사 (Shift 누르면 스킵)
      if (!movedMemo.parentId && !isShiftPressed) {
        for (const category of categories) {
          const categoryArea = calculateCategoryArea(category, currentPage);
          if (!categoryArea) continue;

          // 새 위치에서의 메모 영역
          const newMemoBounds = {
            left: position.x,
            top: position.y,
            right: position.x + memoWidth,
            bottom: position.y + memoHeight
          };

          const areaBounds = {
            left: categoryArea.x,
            top: categoryArea.y,
            right: categoryArea.x + categoryArea.width,
            bottom: categoryArea.y + categoryArea.height
          };

          // 겹침 계산
          const overlapLeft = Math.max(newMemoBounds.left, areaBounds.left);
          const overlapTop = Math.max(newMemoBounds.top, areaBounds.top);
          const overlapRight = Math.min(newMemoBounds.right, areaBounds.right);
          const overlapBottom = Math.min(newMemoBounds.bottom, areaBounds.bottom);

          // 겹침이 있으면
          if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
            // X 방향 이동 체크
            const deltaX = position.x - movedMemo.position.x;
            if (deltaX !== 0) restrictedX = true;

            // Y 방향 이동 체크
            const deltaY = position.y - movedMemo.position.y;
            if (deltaY !== 0) restrictedY = true;
          }
        }
      }

      // 제한된 방향은 원래 위치 유지
      const finalPosition = {
        x: restrictedX ? movedMemo.position.x : position.x,
        y: restrictedY ? movedMemo.position.y : position.y
      };

      // 선택된 카테고리의 하위 요소인지 확인하는 함수
      const isDescendantOfSelectedCategory = (itemParentId: string | null | undefined): boolean => {
        if (!itemParentId) return false;
        // 선택된 카테고리 중 하나가 이 아이템의 부모인지 확인 (직계 또는 간접)
        let currentParentId: string | null | undefined = itemParentId;
        while (currentParentId) {
          if (selectedCategoryIds.includes(currentParentId)) {
            return true;
          }
          const parentCategory = currentPage.categories?.find(c => c.id === currentParentId);
          currentParentId = parentCategory?.parentId;
        }
        return false;
      };

      // 선택된 카테고리의 모든 하위 요소(메모, 카테고리) 찾기
      const getAllChildrenOfCategories = (categoryIds: string[]): { memos: Set<string>, categories: Set<string> } => {
        const childMemos = new Set<string>();
        const childCategories = new Set<string>();

        const addDescendants = (catId: string) => {
          // 이 카테고리의 직계 자식 메모들
          currentPage.memos.forEach(m => {
            if (m.parentId === catId) {
              childMemos.add(m.id);
            }
          });

          // 이 카테고리의 직계 자식 카테고리들
          currentPage.categories?.forEach(c => {
            if (c.parentId === catId) {
              childCategories.add(c.id);
              // 재귀적으로 하위 요소들도 추가
              addDescendants(c.id);
            }
          });
        };

        categoryIds.forEach(catId => addDescendants(catId));
        return { memos: childMemos, categories: childCategories };
      };

      const childrenOfSelectedCategories = isMultiSelected
        ? getAllChildrenOfCategories(selectedCategoryIds)
        : { memos: new Set<string>(), categories: new Set<string>() };

      console.log('🔍 선택된 카테고리의 하위 요소:', {
        selectedCategoryIds,
        childMemos: Array.from(childrenOfSelectedCategories.memos),
        childCategories: Array.from(childrenOfSelectedCategories.categories)
      });

      // 메모 위치 업데이트 (다중 선택 시 선택된 모든 메모 + 선택된 카테고리의 하위 메모들 함께 이동)
      const updatedPage = {
        ...currentPage,
        memos: currentPage.memos.map(memo => {
          if (memo.id === memoId) {
            return { ...memo, position: finalPosition };
          }

          // 1. 다중 선택된 다른 메모들 이동 (단, 선택된 카테고리의 하위 요소가 아닌 경우만)
          if (isMultiSelected && selectedMemoIds.includes(memo.id) && memo.id !== memoId) {
            if (!isDescendantOfSelectedCategory(memo.parentId)) {
              return {
                ...memo,
                position: {
                  x: memo.position.x + deltaX,
                  y: memo.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 메모들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.memos.has(memo.id)) {
            return {
              ...memo,
              position: {
                x: memo.position.x + deltaX,
                y: memo.position.y + deltaY
              }
            };
          }

          return memo;
        }),
        // 선택된 카테고리들 + 하위 카테고리들 함께 이동
        categories: (currentPage.categories || []).map(category => {
          // 1. 직접 선택된 카테고리 이동 (단, 다른 선택된 카테고리의 하위가 아닌 경우만)
          if (isMultiSelected && selectedCategoryIds.includes(category.id)) {
            if (!isDescendantOfSelectedCategory(category.parentId)) {
              return {
                ...category,
                position: {
                  x: category.position.x + deltaX,
                  y: category.position.y + deltaY
                }
              };
            }
          }

          // 2. 선택된 카테고리의 하위 카테고리들도 이동
          if (isMultiSelected && childrenOfSelectedCategories.categories.has(category.id)) {
            return {
              ...category,
              position: {
                x: category.position.x + deltaX,
                y: category.position.y + deltaY
              }
            };
          }

          return category;
        })
      };

      // Shift 드래그 중에는 충돌 검사 안 함
      if (isShiftPressed) {
        return prev.map(page =>
          page.id === currentPageId
            ? updatedPage
            : page
        );
      }

      // 통합 충돌 검사 (같은 depth의 메모와 영역 모두 처리)
      // 다중 선택된 모든 메모와 카테고리의 ID 수집
      const allMovingIds = isMultiSelected
        ? [...selectedMemoIds, ...selectedCategoryIds]
        : [memoId];

      const collisionResult = resolveUnifiedCollisions(memoId, 'memo', updatedPage, 10, allMovingIds);

      return prev.map(page =>
        page.id === currentPageId
          ? {
              ...page,
              categories: collisionResult.updatedCategories,
              memos: collisionResult.updatedMemos
            }
          : page
      );
    });

    // 메모 이동 후 부모 카테고리의 라벨 위치 업데이트
    if (movedMemo?.parentId) {
      setTimeout(() => updateCategoryPositions(), 0);
    }

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

  // 검색 결과 메모로 이동 - 캔버스 뷰를 메모 중심으로 이동하고 초기 줌 레벨로 설정
  const handleNavigateToMemo = (memoId: string, pageId?: string) => {
    console.log('[handleNavigateToMemo] Called with:', { memoId, pageId, currentPageId });
    const targetPageId = pageId || currentPageId;
    console.log('[handleNavigateToMemo] Target page ID:', targetPageId);
    const targetPage = pages.find(p => p.id === targetPageId);
    if (!targetPage) {
      console.error('[handleNavigateToMemo] Target page not found!');
      return;
    }
    console.log('[handleNavigateToMemo] Found target page:', targetPage.name);

    const memo = targetPage.memos.find(m => m.id === memoId);
    if (!memo) {
      console.error('[handleNavigateToMemo] Memo not found in target page!');
      return;
    }
    console.log('[handleNavigateToMemo] Found memo:', memo.title, 'at position:', memo.position);

    // Canvas 컨테이너의 실제 크기 가져오기
    const canvasElement = document.getElementById('main-canvas');
    if (!canvasElement) {
      console.error('[handleNavigateToMemo] Canvas element not found!');
      return;
    }
    const rect = canvasElement.getBoundingClientRect();
    const availableWidth = rect.width;
    const availableHeight = rect.height;
    console.log('[handleNavigateToMemo] Canvas size:', { width: availableWidth, height: availableHeight });
    console.log('[handleNavigateToMemo] Canvas rect:', rect);

    // 메모 크기
    const memoWidth = memo.size?.width || 200;
    const memoHeight = memo.size?.height || 150;
    console.log('[handleNavigateToMemo] Memo size:', { width: memoWidth, height: memoHeight });

    // 메모 중심 좌표
    const memoCenterX = memo.position.x + memoWidth / 2;
    const memoCenterY = memo.position.y + memoHeight / 2;
    console.log('[handleNavigateToMemo] Memo center (world coords):', { x: memoCenterX, y: memoCenterY });

    // scale을 1로 리셋할 것이므로 scale 1 기준으로 offset 계산
    const targetScale = 1;
    const newOffsetX = availableWidth / 2 - memoCenterX * targetScale;
    const newOffsetY = availableHeight / 2 - memoCenterY * targetScale;

    console.log('[handleNavigateToMemo] Target scale:', targetScale);
    console.log('[handleNavigateToMemo] Calculated offset:', { newOffsetX, newOffsetY });
    console.log('[handleNavigateToMemo] Before setCanvasOffset - current offset:', canvasOffset, 'current scale:', canvasScale);

    setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    setCanvasScale(targetScale); // 초기 줌 레벨로 리셋

    console.log('[handleNavigateToMemo] After setCanvasOffset called');
    console.log('[handleNavigateToMemo] Expected screen position of memo center:', { x: availableWidth / 2, y: availableHeight / 2 });
  };

  // 카테고리로 이동 - 캔버스 뷰를 카테고리 중심으로 이동
  const handleNavigateToCategory = (categoryId: string, pageId?: string) => {
    console.log('[handleNavigateToCategory] Called with:', { categoryId, pageId, currentPageId });
    const targetPageId = pageId || currentPageId;
    console.log('[handleNavigateToCategory] Target page ID:', targetPageId);
    const targetPage = pages.find(p => p.id === targetPageId);
    if (!targetPage) {
      console.error('[handleNavigateToCategory] Target page not found!');
      return;
    }
    console.log('[handleNavigateToCategory] Found target page:', targetPage.name);

    const category = targetPage.categories?.find(c => c.id === categoryId);
    if (!category) {
      console.error('[handleNavigateToCategory] Category not found in target page!');
      return;
    }
    console.log('[handleNavigateToCategory] Found category:', category.title, 'at position:', category.position);

    // Canvas 컨테이너의 실제 크기 가져오기
    const canvasElement = document.getElementById('main-canvas');
    if (!canvasElement) {
      console.error('[handleNavigateToCategory] Canvas element not found!');
      return;
    }
    const rect = canvasElement.getBoundingClientRect();
    const availableWidth = rect.width;
    const availableHeight = rect.height;

    // 카테고리 영역 계산 (자식이 있는 경우)
    const categoryArea = calculateCategoryArea(category, targetPage);

    if (categoryArea && category.isExpanded) {
      // 영역이 있고 확장된 상태면 전체 영역이 화면에 보이도록 조정
      const areaWidth = categoryArea.width;
      const areaHeight = categoryArea.height;
      const areaCenterX = categoryArea.x + areaWidth / 2;
      const areaCenterY = categoryArea.y + areaHeight / 2;

      // 영역이 화면에 맞도록 스케일 계산 (여백 20% 추가)
      const margin = 0.2;
      const scaleX = availableWidth / (areaWidth * (1 + margin));
      const scaleY = availableHeight / (areaHeight * (1 + margin));
      const optimalScale = Math.min(scaleX, scaleY, 1); // 최대 1배 (확대 안함)

      // 화면 중앙에 영역이 오도록 offset 계산
      const newOffsetX = availableWidth / 2 - areaCenterX * optimalScale;
      const newOffsetY = availableHeight / 2 - areaCenterY * optimalScale;

      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      setCanvasScale(optimalScale);
    } else {
      // 영역이 없거나 축소된 상태면 카테고리 블록만 중앙에 표시
      const categoryWidth = category.size?.width || 200;
      const categoryHeight = category.size?.height || 80;
      const categoryCenterX = category.position.x + categoryWidth / 2;
      const categoryCenterY = category.position.y + categoryHeight / 2;

      const targetScale = 1;
      setCanvasOffset({
        x: availableWidth / 2 - categoryCenterX * targetScale,
        y: availableHeight / 2 - categoryCenterY * targetScale
      });
      setCanvasScale(targetScale);
    }
  };

  // 단축 이동 항목 추가
  const addQuickNavItem = (name: string, targetId: string, targetType: 'memo' | 'category') => {
    // 중복 체크: 같은 페이지의 같은 타겟에 대한 단축 이동이 이미 있는지 확인
    const isDuplicate = quickNavItems.some(
      item => item.targetId === targetId && item.targetType === targetType && item.pageId === currentPageId
    );

    if (isDuplicate) {
      alert('이미 단축 이동이 설정되어 있습니다.');
      return;
    }

    const newItem: QuickNavItem = {
      id: Date.now().toString(),
      name,
      targetId,
      targetType,
      pageId: currentPageId
    };
    setQuickNavItems(prev => [...prev, newItem]);
  };

  // 단축 이동 중복 확인
  const isQuickNavExists = (targetId: string, targetType: 'memo' | 'category'): boolean => {
    return quickNavItems.some(
      item => item.targetId === targetId && item.targetType === targetType && item.pageId === currentPageId
    );
  };

  // 단축 이동 항목 삭제
  const deleteQuickNavItem = (itemId: string) => {
    setQuickNavItems(prev => prev.filter(item => item.id !== itemId));
  };

  // 단축 이동 실행 - 대상으로 이동하고 필요 시 페이지도 전환
  const executeQuickNav = (item: QuickNavItem) => {
    // 페이지가 다르면 페이지 전환
    if (item.pageId !== currentPageId) {
      setCurrentPageId(item.pageId);
      // 페이지 전환 후 약간의 딜레이를 두고 이동 (상태 업데이트 대기)
      setTimeout(() => {
        if (item.targetType === 'memo') {
          handleNavigateToMemo(item.targetId);
        } else {
          handleNavigateToCategory(item.targetId);
        }
      }, 100);
    } else {
      // 같은 페이지면 바로 이동
      if (item.targetType === 'memo') {
        handleNavigateToMemo(item.targetId);
      } else {
        handleNavigateToCategory(item.targetId);
      }
    }
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
            // 검색 결과 처리 로직은 필요에 따라 추가
          }}
          onDeleteMemo={deleteMemoById}
          onDeleteCategory={deleteCategory}
          onNavigateToMemo={handleNavigateToMemo}
          onNavigateToCategory={handleNavigateToCategory}
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
        onDetectCategoryDropForCategory={detectCategoryDropForCategory}
        isConnecting={isConnecting}
        isDisconnectMode={isDisconnectMode}
        connectingFromId={connectingFromId}
        connectingFromDirection={connectingFromDirection}
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
        dragHoveredCategoryIds={dragHoveredCategoryIds}
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
        draggingMemoId={draggingMemoId}
        onMemoDragStart={(memoId: string) => {
          setIsDraggingMemo(true);
          setDraggingMemoId(memoId);
        }}
        onMemoDragEnd={() => {
          setIsDraggingMemo(false);
          setDraggingMemoId(null);
          // 드래그 완료 후 충돌 검사 - 주석 처리 (무한 반복 문제)
          // setTimeout(() => {
          //   const currentPage = pages.find(p => p.id === currentPageId);
          //   if (currentPage) {
          //     // 모든 카테고리에 대해 충돌 검사 수행
          //     currentPage.categories?.forEach(category => {
          //       const categoryArea = calculateCategoryArea(category, currentPage);
          //       if (categoryArea) {
          //         // 카운터 리셋
          //         collisionCheckCount.current.set(category.id, 0);
          //         console.log('🔄 메모 드래그 완료 후 충돌 검사 시작:', category.id);
          //         pushAwayConflictingBlocks(categoryArea, category.id, currentPage);
          //       }
          //     });
          //   }
          // }, 100);
        }}
        isShiftPressed={isShiftPressed}
        shiftDragAreaCacheRef={shiftDragAreaCache}
        onShiftDropCategory={handleCategoryAreaShiftDrop}
        isDraggingCategory={isDraggingCategory}
        onCategoryDragStart={() => {
          setIsDraggingCategory(true);
        }}
        onCategoryDragEnd={() => {
          setIsDraggingCategory(false);
          // 드래그 완료 후 충돌 검사 - 일단 주석 처리 (영역 크기 변경 문제 해결)
          // setTimeout(() => {
          //   const currentPage = pages.find(p => p.id === currentPageId);
          //   if (currentPage) {
          //     // 모든 카테고리에 대해 충돌 검사 수행
          //     currentPage.categories?.forEach(category => {
          //       const categoryArea = calculateCategoryArea(category, currentPage);
          //       if (categoryArea) {
          //         // 카운터 리셋
          //         collisionCheckCount.current.set(category.id, 0);
          //         console.log('🔄 카테고리 드래그 완료 후 충돌 검사 시작:', category.id);
          //         pushAwayConflictingBlocks(categoryArea, category.id, currentPage);
          //       }
          //     });
          //   }
          // }, 100);
        }}
        onCategoryPositionDragEnd={handleCategoryPositionDragEnd}
        onClearCategoryCache={clearCategoryCache}
        canvasOffset={canvasOffset}
        setCanvasOffset={setCanvasOffset}
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        onDeleteMemoById={deleteMemoById}
        onAddQuickNav={addQuickNavItem}
        isQuickNavExists={isQuickNavExists}
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

      {/* 단축 이동 버튼 */}
      <button
        onClick={() => setShowQuickNavPanel(!showQuickNavPanel)}
        style={{
          position: 'fixed',
          top: '20px',
          right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px',
          zIndex: 1001,
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#7c3aed';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#8b5cf6';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M8 2L9.5 5.5L13 6L10.5 8.5L11 12L8 10L5 12L5.5 8.5L3 6L6.5 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>단축 이동</span>
        {quickNavItems.length > 0 && (
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {quickNavItems.length}
          </span>
        )}
      </button>

      {/* 단축 이동 패널 - 작은 네모 버튼들 */}
      {showQuickNavPanel && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000
            }}
            onClick={() => setShowQuickNavPanel(false)}
          />

          {/* 패널 */}
          <div
            style={{
              position: 'fixed',
              top: '70px',
              right: rightPanelOpen ? `${rightPanelWidth + 20}px` : '20px',
              zIndex: 1001,
              display: 'flex',
              gap: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {quickNavItems.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                padding: '16px 20px',
                color: '#9ca3af',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}>
                등록된 단축 이동이 없습니다
              </div>
            ) : (
              <>
                {/* 메모 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'memo').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quickNavItems
                      .filter(item => item.targetType === 'memo')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              executeQuickNav(item);
                              setShowQuickNavPanel(false);
                            }}
                            style={{
                              position: 'relative',
                              backgroundColor: 'white',
                              color: '#8b5cf6',
                              border: '2px solid #8b5cf6',
                              borderRadius: '8px',
                              padding: '8px 32px 8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                              transition: 'all 0.2s ease',
                              width: '140px',
                              textAlign: 'left',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                            }}
                            title={item.name}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%'
                            }}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span style={{ fontSize: '10px', opacity: 0.6 }}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  deleteQuickNavItem(item.id);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: 'none',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* 카테고리 단축 이동 */}
                {quickNavItems.filter(item => item.targetType === 'category').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {quickNavItems
                      .filter(item => item.targetType === 'category')
                      .map(item => {
                        const targetPage = pages.find(p => p.id === item.pageId);
                        const isCurrentPage = item.pageId === currentPageId;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              executeQuickNav(item);
                              setShowQuickNavPanel(false);
                            }}
                            style={{
                              position: 'relative',
                              backgroundColor: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 32px 8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                              transition: 'all 0.2s ease',
                              width: '140px',
                              textAlign: 'left',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#7c3aed';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#8b5cf6';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                            }}
                            title={item.name}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%'
                            }}>
                              {item.name}
                            </span>
                            {!isCurrentPage && targetPage && (
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                {targetPage.name}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${item.name}" 단축 이동을 삭제하시겠습니까?`)) {
                                  deleteQuickNavItem(item.id);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: 'none',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              ×
                            </button>
                          </button>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

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