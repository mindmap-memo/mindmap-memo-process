import { useState, useRef, useEffect, useMemo } from 'react';
import { Page, QuickNavItem, ImportanceLevel, DataRegistry } from '../types';
import { DEFAULT_PAGES } from '../constants/defaultData';
import { fetchPages } from '../utils/api';

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
 * } = useAppState();
 * ```
 */
export const useAppState = () => {
  // ===== 페이지 & 데이터 상태 =====
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('1');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      // 개발 환경에서 localStorage가 비어있으면 자동으로 테스트 데이터 생성
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        try {
          const { STORAGE_KEYS } = await import('../constants/defaultData');
          const { MIGRATION_FLAG_KEY } = await import('../features/migration/utils/migrationUtils');
          const { createEnhancedTestData } = await import('../features/migration/utils/debugUtils');

          const hasData = localStorage.getItem(STORAGE_KEYS.PAGES);
          if (!hasData) {
            console.log('🔧 개발 모드: 테스트 데이터 자동 생성');
            createEnhancedTestData();
            // 마이그레이션 플래그 리셋 (프롬프트가 나타나도록)
            localStorage.removeItem(MIGRATION_FLAG_KEY);
          }
        } catch (error) {
          console.error('테스트 데이터 생성 실패:', error);
        }
      }

      try {
        const loadedPages = await fetchPages();
        if (loadedPages.length > 0) {
          setPages(loadedPages);
          setCurrentPageId(loadedPages[0].id);
        } else {
          // 페이지가 없으면 기본 페이지 사용
          console.log('데이터베이스에 페이지가 없습니다. 기본 페이지를 사용합니다.');
          setPages(DEFAULT_PAGES);
          setCurrentPageId('1');
        }
      } catch (error) {
        console.error('데이터베이스 연결 실패. 기본 페이지로 시작합니다:', error);
        console.log('데이터베이스를 사용하려면 create-tables.sql을 실행하세요.');
        setPages(DEFAULT_PAGES);
        setCurrentPageId('1');
      } finally {
        setIsInitialLoadDone(true);
      }
    };

    loadInitialData();
  }, []);

  // ===== 선택 상태 (메모) =====
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [selectedMemoIds, setSelectedMemoIds] = useState<string[]>([]);

  // ===== 선택 상태 (카테고리) =====
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // ===== 캔버스 뷰포트 상태 =====
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);

  // ===== 단축 이동 (Quick Navigation) =====
  const [showQuickNavPanel, setShowQuickNavPanel] = useState(false);

  // 현재 페이지의 quickNavItems를 가져오기 (페이지별 저장)
  const quickNavItems = useMemo(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
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
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const isShiftPressedRef = useRef<boolean>(false);

  // Shift 키 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    isShiftPressedRef.current = isShiftPressed;
  }, [isShiftPressed]);

  // ===== Data Registry =====
  const [dataRegistry, setDataRegistry] = useState<DataRegistry>({});

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

    // Data Registry
    dataRegistry,
    setDataRegistry,

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
