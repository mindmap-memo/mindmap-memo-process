import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Page, QuickNavItem, ImportanceLevel } from '../types';
import { DEFAULT_PAGES } from '../constants/defaultData';
import { fetchPages, createPage, createMemo, createCategory } from '../utils/api';

/**
 * useAppState
 *
 * 앱의 핵심 상태를 관리하는 커스텀 훅입니다.
 *
 * **관리하는 상태:**
 * - 페이지 데이터 (memos, categories)
 * - 현재 페이지 ID
 * - 선택된 메모/카테고리 (단일 및 다중 선택)
 * - 캔버스 뷰포트 (offset, scale)
 * - 단축 이동 (Quick Navigation)
 * - 중요도 필터
 * - 드래그 선택 상태
 * - Data Registry (테이블 데이터)
 *
 * **초기화:**
 * - 데이터베이스에서 데이터 로드
 * - 실패 시 기본값 제공
 *
 * @param isAuthenticated - 사용자 인증 여부
 * @returns 앱 상태 및 setter 함수들
 *
 * @example
 * ```tsx
 * const {
 *   pages,
 *   setPages,
 *   currentPageId,
 *   setCurrentPageId,
 *   selectedMemoId,
 *   setSelectedMemoId
 * } = useAppState(!!session);
 * ```
 */
export const useAppState = (isAuthenticated: boolean = false) => {
  // ===== 페이지 & 데이터 상태 =====
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('1');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 초기 데이터 로드
  useEffect(() => {
    // 인증되지 않았으면 로딩 완료 처리
    if (!isAuthenticated) {
      console.log('[useAppState] 🔓 인증되지 않음 - 기본 데이터 사용');
      setPages(DEFAULT_PAGES);
      setCurrentPageId('1');
      setIsInitialLoadDone(true);
      setLoadingProgress(100);
      return;
    }

    const loadInitialData = async () => {
      try {
        console.log('[useAppState] 🚀 데이터 로딩 시작');
        setLoadingProgress(10);

        // 데이터 페칭 시작
        console.log('[useAppState] 📡 서버에서 페이지 데이터 가져오는 중...');
        setLoadingProgress(30);
        const loadedPages = await fetchPages();
        console.log('[useAppState] ✅ 페이지 데이터 로드 완료:', {
          pageCount: loadedPages.length,
          pages: loadedPages.map(p => ({ id: p.id, name: p.name, memoCount: p.memos?.length || 0, categoryCount: p.categories?.length || 0 }))
        });

        setLoadingProgress(60);

        if (loadedPages.length > 0) {
          // 페이지가 있지만 메모/카테고리가 비어있는지 확인
          const needsInitialData = loadedPages.every(
            p => (!p.memos || p.memos.length === 0) && (!p.categories || p.categories.length === 0)
          );

          if (needsInitialData) {
            console.log('⚠️ 페이지는 있지만 데이터가 비어있습니다. 샘플 데이터를 추가합니다.');

            // 각 페이지에 샘플 데이터 추가
            const updatedPages: Page[] = [];
            for (let i = 0; i < loadedPages.length; i++) {
              const existingPage = loadedPages[i];
              if (!existingPage) continue; // 안전성 체크

              const defaultPage = DEFAULT_PAGES[i] || DEFAULT_PAGES[0]; // 기본값 사용

              try {
                // 메모 생성
                const createdMemos = [];
                for (const memo of (defaultPage.memos || [])) {
                  try {
                    console.log(`📝 메모 생성 시도: ${memo.title}`, {
                      tags: memo.tags,
                      connections: memo.connections,
                      position: memo.position,
                    });
                    const createdMemo = await createMemo({
                      ...memo,
                      pageId: existingPage.id,
                    });
                    createdMemos.push(createdMemo);
                  } catch (memoError) {
                    console.error(`❌ 메모 생성 실패: ${memo.title}`, memoError);
                  }
                }
                console.log(`✅ 메모 ${createdMemos.length}개 생성 완료`);

                // 카테고리 생성
                const createdCategories = [];
                for (const category of (defaultPage.categories || [])) {
                  try {
                    const createdCategory = await createCategory({
                      ...category,
                      pageId: existingPage.id,
                    });
                    createdCategories.push(createdCategory);
                  } catch (categoryError) {
                    console.error(`❌ 카테고리 생성 실패: ${category.title}`, categoryError);
                  }
                }
                console.log(`✅ 카테고리 ${createdCategories.length}개 생성 완료`);

                updatedPages.push({
                  ...existingPage,
                  memos: createdMemos,
                  categories: createdCategories,
                  quickNavItems: existingPage.quickNavItems || []
                });
              } catch (error) {
                console.error(`❌ 페이지 데이터 추가 실패: ${existingPage.name}`, error);
                updatedPages.push({
                  ...existingPage,
                  memos: existingPage.memos || [],
                  categories: existingPage.categories || [],
                  quickNavItems: existingPage.quickNavItems || []
                });
              }
            }

            // 안전성 체크: updatedPages가 비어있지 않은지 확인
            if (updatedPages.length > 0 && updatedPages[0]) {
              setPages(updatedPages);
              setCurrentPageId(updatedPages[0].id);
            } else {
              // 페이지 생성 실패 시 DEFAULT_PAGES 사용
              console.warn('페이지 업데이트 실패. 기본 페이지로 폴백합니다.');
              setPages(DEFAULT_PAGES);
              setCurrentPageId(DEFAULT_PAGES[0]?.id || '1');
            }
          } else {
            // 이미 데이터가 있으면 그대로 사용
            console.log('[useAppState] 📦 기존 데이터 사용');
            // 안전성 체크: memos와 categories가 배열인지 확인
            const safePages = loadedPages.map(page => ({
              ...page,
              memos: Array.isArray(page.memos) ? page.memos : [],
              categories: Array.isArray(page.categories) ? page.categories : [],
              quickNavItems: Array.isArray(page.quickNavItems) ? page.quickNavItems : []
            }));

            console.log('[useAppState] ✅ 페이지 데이터 설정 완료:', {
              pageCount: safePages.length,
              firstPageId: safePages[0]?.id,
              firstPageQuickNavItems: safePages[0]?.quickNavItems
            });

            setPages(safePages);
            setCurrentPageId(safePages[0]?.id || '1');
          }
        } else {
          // 첫 로그인: 기본 페이지를 DB에 생성
          console.log('첫 로그인 감지. 기본 페이지를 데이터베이스에 생성합니다.');

          // DEFAULT_PAGES를 DB에 생성
          const createdPages: Page[] = [];
          for (const page of DEFAULT_PAGES) {
            if (!page) continue; // 안전성 체크

            try {
              // 1. 페이지 생성
              const newPage = await createPage(page.id, page.name);
              console.log(`✅ 페이지 생성 완료: ${page.name}`);

              // 2. 메모 생성
              const createdMemos = [];
              for (const memo of (page.memos || [])) {
                try {
                  console.log(`📝 메모 생성 시도: ${memo.title}`, {
                    tags: memo.tags,
                    connections: memo.connections,
                    position: memo.position,
                  });
                  const createdMemo = await createMemo({
                    ...memo,
                    pageId: page.id,
                  });
                  createdMemos.push(createdMemo);
                } catch (memoError) {
                  console.error(`❌ 메모 생성 실패: ${memo.title}`, memoError);
                }
              }
              console.log(`✅ 메모 ${createdMemos.length}개 생성 완료`);

              // 3. 카테고리 생성
              const createdCategories = [];
              for (const category of (page.categories || [])) {
                try {
                  const createdCategory = await createCategory({
                    ...category,
                    pageId: page.id,
                  });
                  createdCategories.push(createdCategory);
                } catch (categoryError) {
                  console.error(`❌ 카테고리 생성 실패: ${category.title}`, categoryError);
                }
              }
              console.log(`✅ 카테고리 ${createdCategories.length}개 생성 완료`);

              // 생성된 페이지에 메모와 카테고리 추가
              createdPages.push({
                ...newPage,
                memos: createdMemos,
                categories: createdCategories,
                quickNavItems: newPage.quickNavItems || []
              });
            } catch (pageError) {
              console.error(`❌ 페이지 생성 실패: ${page.name}`, pageError);
            }
          }

          if (createdPages.length > 0 && createdPages[0]) {
            setPages(createdPages);
            setCurrentPageId(createdPages[0].id);
          } else {
            // 페이지 생성 실패 시 로컬 DEFAULT_PAGES 사용
            console.warn('페이지 생성 실패. 로컬 페이지를 사용합니다.');
            setPages(DEFAULT_PAGES);
            setCurrentPageId(DEFAULT_PAGES[0]?.id || '1');
          }
        }

        setLoadingProgress(90);

        // UI 렌더링을 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('[useAppState] ❌ 데이터베이스 연결 실패. 기본 페이지로 시작합니다:', error);
        console.log('[useAppState] 💡 데이터베이스를 사용하려면 create-tables.sql을 실행하세요.');
        setPages(DEFAULT_PAGES);
        setCurrentPageId('1');
        setLoadingProgress(90);
      } finally {
        console.log('[useAppState] 🏁 데이터 로딩 완료 - 진행률 100%');
        setLoadingProgress(100);
        // 100% 애니메이션을 보여주기 위한 짧은 대기
        setTimeout(() => {
          setIsInitialLoadDone(true);
        }, 200);
      }
    };

    loadInitialData();
  }, [isAuthenticated]);

  // ===== 선택 상태 (메모) =====
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]);

  // ===== 선택 상태 (카테고리) =====
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // ===== 캔버스 뷰포트 상태 =====
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(0.35);

  // ===== 단축 이동 (Quick Navigation) =====
  const [showQuickNavPanel, setShowQuickNavPanel] = useState(false);

  // 현재 페이지의 quickNavItems를 가져오기 (페이지별 저장)
  const quickNavItems = useMemo(() => {
    if (!pages || pages.length === 0) {
      return [];
    }
    const currentPage = pages?.find(p => p.id === currentPageId);
    return currentPage?.quickNavItems || [];
  }, [pages, currentPageId]);

  // ===== 중요도 필터 =====
  const [activeImportanceFilters, setActiveImportanceFilters] = useState<Set<ImportanceLevel>>(
    new Set(['critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'] as ImportanceLevel[])
  );
  const [showGeneralContent, setShowGeneralContent] = useState<boolean>(true);

  // ===== 드래그 선택 상태 =====
  const [isDragSelecting, setIsDragSelecting] = useState<boolean>(false);
  const [dragSelectStart, setDragSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSelectEnd, setDragSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragHoveredMemoIds, setDragHoveredMemoIds] = useState<string[]>([]);
  const [dragHoveredCategoryIds, setDragHoveredCategoryIds] = useState<string[]>([]);
  const [isDragSelectingWithShift, setIsDragSelectingWithShift] = useState<boolean>(false);

  // ===== 연결 모드 상태 =====
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDisconnectMode, setIsDisconnectMode] = useState<boolean>(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectingFromDirection, setConnectingFromDirection] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [dragLineEnd, setDragLineEnd] = useState<{ x: number; y: number } | null>(null);

  // ===== Shift 키 상태 =====
  const [isShiftPressed, setIsShiftPressedState] = useState<boolean>(false);
  const isShiftPressedRef = useRef<boolean>(false);

  // Shift 키 상태 업데이트 함수 (state와 ref를 동시에 업데이트)
  const setIsShiftPressed = useCallback((value: React.SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(isShiftPressed) : value;
    setIsShiftPressedState(newValue);
    isShiftPressedRef.current = newValue; // 즉시 ref 업데이트
  }, [isShiftPressed]);

  // ===== 드래그 상태 =====
  const [isDraggingMemo, setIsDraggingMemo] = useState<boolean>(false);
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState<boolean>(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

  return {
    // 페이지 & 데이터
    pages,
    setPages,
    currentPageId,
    setCurrentPageId,
    isInitialLoadDone,
    loadingProgress,

    // 선택 상태 (메모)
    selectedMemoId,
    setSelectedMemoId,
    selectedMemoIds,
    setSelectedMemoIds,

    // 선택 상태 (카테고리)
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryIds,
    setSelectedCategoryIds,

    // 캔버스 뷰포트
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,

    // 단축 이동
    quickNavItems,
    showQuickNavPanel,
    setShowQuickNavPanel,

    // 중요도 필터
    activeImportanceFilters,
    setActiveImportanceFilters,
    showGeneralContent,
    setShowGeneralContent,

    // 드래그 선택
    isDragSelecting,
    setIsDragSelecting,
    dragSelectStart,
    setDragSelectStart,
    dragSelectEnd,
    setDragSelectEnd,
    dragHoveredMemoIds,
    setDragHoveredMemoIds,
    dragHoveredCategoryIds,
    setDragHoveredCategoryIds,
    isDragSelectingWithShift,
    setIsDragSelectingWithShift,

    // 연결 모드
    isConnecting,
    setIsConnecting,
    isDisconnectMode,
    setIsDisconnectMode,
    connectingFromId,
    setConnectingFromId,
    connectingFromDirection,
    setConnectingFromDirection,
    dragLineEnd,
    setDragLineEnd,

    // Shift 키
    isShiftPressed,
    setIsShiftPressed,
    isShiftPressedRef,

    // 드래그 상태
    isDraggingMemo,
    setIsDraggingMemo,
    draggingMemoId,
    setDraggingMemoId,
    isDraggingCategory,
    setIsDraggingCategory,
    draggingCategoryId,
    setDraggingCategoryId
  };
};
