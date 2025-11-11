'use client';

import React from 'react';
import { Plus, Folder, GitBranch } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { MobileSearchResults } from './MobileSearchResults';
import { useMobileLayout } from './hooks/useMobileLayout';
import { useMobileSearch } from './hooks/useMobileSearch';
import { useMobileBackButton } from '../../hooks/useMobileBackButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Canvas from '../Canvas/Canvas';
import RightPanel from '../RightPanel/RightPanel';
import LeftPanel from '../LeftPanel/LeftPanel';
import ImportanceFilter from '../ImportanceFilter';
import { useAppStateContext, useSelection, useConnection, usePanel, useQuickNav } from '../../contexts';
import { MemoDisplaySize, CategoryBlock, MemoBlock } from '../../types';
import { centerOnMemo, centerOnCategory } from '../../utils/categoryAreaUtils';
import styles from '../../scss/components/MobileLayout/MobileLayout.module.scss';

interface MobileLayoutProps {
  // 사용자 정보
  userEmail?: string;
  onLogout?: () => void;

  // 튜토리얼 props
  tutorialState: any;
  tutorialMode: 'basic' | 'core';
  handleStartTutorialWrapper: () => void;
  handleCloseTutorial: () => void;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
  handleStepClick: (stepIndex: number) => void;
  handleNextSubStep: () => void;
  handlePreviousSubStep: () => void;
  TutorialComponent: React.ComponentType<any>;

  // 마이그레이션 props
  migrationStatus: string;
  needsMigration: boolean;
  migrationError: any;
  migrationResult: any;
  migrate: () => void;
  skipMigration: () => void;
  deleteLegacyData: () => void;
  MigrationPromptComponent: React.ComponentType<any>;

  // Quick Nav props
  showQuickNavPanel: boolean;
  setShowQuickNavPanel: (show: boolean) => void;
  QuickNavPanelComponent: React.ComponentType<any>;
  onExecuteQuickNav: (item: any) => void;
  onUpdateQuickNavItem: (itemId: string, newName: string) => void;
  onDeleteQuickNavItem: (itemId: string) => void;

  // 페이지 관련 핸들러
  onAddPage: () => void;
  onPageNameChange: (pageId: string, newName: string) => void;
  onDeletePage: (pageId: string) => void;

  // 액션 핸들러
  onAddMemo: (position?: { x: number; y: number }) => void;
  onAddCategory: (position?: { x: number; y: number }) => void;

  // Canvas 핸들러들
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onCategoryPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryLabelPositionChange: (categoryId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  onCategorySizeChange: (categoryId: string, size: { width: number; height: number }) => void;
  onMemoDisplaySizeChange: (memoId: string, displaySize: MemoDisplaySize) => void;
  onMemoTitleUpdate: (memoId: string, title: string) => void;
  onMemoBlockUpdate: (memoId: string, blockId: string, content: string) => void;
  onCategoryUpdate: (category: CategoryBlock) => void;
  onCategoryToggleExpanded: (categoryId: string) => void;
  onMoveToCategory: (itemId: string, categoryId: string | null) => void;
  onDetectCategoryOnDrop: (memoId: string, position: { x: number; y: number }) => void;
  onDetectCategoryDropForCategory: (categoryId: string, position: { x: number; y: number }, isShiftMode?: boolean) => void;
  onDeleteMemo: (memoId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteSelected: () => void;
  onDisconnectMemo: (memoId: string) => void;
  onStartConnection: (memoId: string, direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCancelConnection: () => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onUpdateDragLine: (position: { x: number; y: number }) => void;
  onCategoryPositionDragEnd: (categoryId: string, position: { x: number; y: number }) => void;
  onCategoryDragStart: () => void;
  onCategoryDragEnd: () => void;
  onMemoDragStart: (memoId: string) => void;
  onMemoDragEnd: () => void;
  onShiftDropCategory: (category: CategoryBlock, position: { x: number; y: number }) => void;
  onClearCategoryCache: (categoryId: string) => void;
  onDeleteMemoById: (memoId: string) => void;
  onAddQuickNav: (name: string, targetId: string, targetType: 'memo' | 'category') => void;
  isQuickNavExists: (targetId: string, targetType: 'memo' | 'category') => boolean;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
  onFocusMemo: (memoId: string) => void;
  onFocusCategory: (categoryId: string) => void;
  onResetFilters: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  shiftDragAreaCacheRef: any;
  onDragSelectStart: (position: { x: number; y: number }) => void;
  onDragSelectMove: (position: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;
  isLongPressActive?: boolean;  // 롱프레스 활성화 상태
  longPressTargetId?: string | null;  // 롱프레스 대상 ID
  setIsLongPressActive?: (active: boolean, targetId?: string | null) => void;  // 롱프레스 상태 업데이트
  setIsShiftPressed?: (pressed: boolean) => void;  // Shift 상태 업데이트 함수
  isShiftPressedRef?: React.MutableRefObject<boolean>;  // Shift ref
}

/**
 * MobileLayout
 *
 * 모바일/태블릿용 레이아웃 컴포넌트
 * - 3개의 독립적인 풀스크린 뷰 (Pages, Canvas, Editor)
 * - 하단 탭 네비게이션으로 뷰 전환
 * - Context API를 통해 모든 상태 접근
 */
export const MobileLayout: React.FC<MobileLayoutProps> = ({
  // 사용자 정보
  userEmail,
  onLogout,
  // 롱프레스 상태
  isLongPressActive,
  longPressTargetId,
  setIsLongPressActive,
  setIsShiftPressed,
  isShiftPressedRef,
  tutorialState,
  tutorialMode,
  handleStartTutorialWrapper,
  handleCloseTutorial,
  handleNextStep,
  handlePreviousStep,
  handleStepClick,
  handleNextSubStep,
  handlePreviousSubStep,
  TutorialComponent,
  migrationStatus,
  needsMigration,
  migrationError,
  migrationResult,
  migrate,
  skipMigration,
  deleteLegacyData,
  MigrationPromptComponent,
  showQuickNavPanel,
  setShowQuickNavPanel,
  QuickNavPanelComponent,
  onExecuteQuickNav,
  onUpdateQuickNavItem,
  onDeleteQuickNavItem,
  onAddPage,
  onPageNameChange,
  onDeletePage,
  onAddMemo,
  onAddCategory,
  // Canvas 핸들러들
  onMemoPositionChange,
  onCategoryPositionChange,
  onCategoryLabelPositionChange,
  onMemoSizeChange,
  onCategorySizeChange,
  onMemoDisplaySizeChange,
  onMemoTitleUpdate,
  onMemoBlockUpdate,
  onCategoryUpdate,
  onCategoryToggleExpanded,
  onMoveToCategory,
  onDetectCategoryOnDrop,
  onDetectCategoryDropForCategory,
  onDeleteMemo,
  onDeleteCategory,
  onDeleteSelected,
  onDisconnectMemo,
  onStartConnection,
  onConnectMemos,
  onCancelConnection,
  onRemoveConnection,
  onUpdateDragLine,
  onCategoryPositionDragEnd,
  onCategoryDragStart,
  onCategoryDragEnd,
  onMemoDragStart,
  onMemoDragEnd,
  onShiftDropCategory,
  onClearCategoryCache,
  onDeleteMemoById,
  onAddQuickNav,
  isQuickNavExists,
  onMemoUpdate,
  onFocusMemo,
  onFocusCategory,
  onResetFilters,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  shiftDragAreaCacheRef,
  onDragSelectStart,
  onDragSelectMove,
  onDragSelectEnd,
}) => {
  const {
    showEditor,
    setShowEditor,
    showPages,
    setShowPages,
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    searchImportanceFilters,
    handleToggleImportanceFilter,
    handleSelectAllImportance,
    handleClearAllImportance,
    searchShowGeneralContent,
    setSearchShowGeneralContent,
    searchResults,
    setSearchResults,
    searchCategoryResults,
    setSearchCategoryResults
  } = useMobileLayout();
  const [showFabMenu, setShowFabMenu] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showExitToast, setShowExitToast] = React.useState(false);
  const [isTabletCollapsed, setIsTabletCollapsed] = React.useState(false); // 태블릿 가로모드 우측 패널 접기 상태

  // 태블릿 가로 모드 감지 (RightPanel을 우측 패널로 표시) - 테스트용: pointer 조건 제거
  const isTabletLandscape = useMediaQuery('(min-width: 769px) and (max-width: 1366px) and (orientation: landscape)');

  // 태블릿 가로모드 초기값 설정: 우측 패널을 펼친 상태로 시작
  React.useEffect(() => {
    if (isTabletLandscape && !showEditor) {
      setShowEditor(true);
    }
  }, [isTabletLandscape]); // showEditor를 의존성에서 제거하여 초기 1회만 실행

  // Context에서 필요한 상태와 핸들러 가져오기
  const appState = useAppStateContext();
  const selection = useSelection();
  const connection = useConnection();
  const panel = usePanel();
  const quickNav = useQuickNav();

  // 태블릿 가로모드에서 우측 패널 상태에 따라 CSS 변수를 전역으로 설정
  React.useEffect(() => {
    // 태블릿 가로모드이고, 에디터가 보이고, 패널이 접히지 않은 경우에만 offset 적용
    const offset = isTabletLandscape && showEditor && !isTabletCollapsed
      ? '300px'
      : '0px';
    document.documentElement.style.setProperty('--right-panel-offset', offset);
    console.log('🌐 [MobileLayout] 전역 CSS 변수 설정:', {
      isTabletLandscape,
      showEditor,
      isTabletCollapsed,
      offset
    });

    return () => {
      document.documentElement.style.removeProperty('--right-panel-offset');
    };
  }, [isTabletLandscape, showEditor, isTabletCollapsed]);

  // 태블릿 가로 모드에서 메모/카테고리 선택 시 자동으로 RightPanel 표시
  React.useEffect(() => {
    if (isTabletLandscape && (selection?.selectedMemoId || selection?.selectedCategoryId)) {
      setShowEditor(true);
    }
  }, [isTabletLandscape, selection?.selectedMemoId, selection?.selectedCategoryId]);

  // 모바일 뒤로가기 버튼 처리
  useMobileBackButton({
    isEditorOpen: showEditor,
    onClose: () => {
      setShowEditor(false);
      selection?.setSelectedMemoId(null);
      selection?.setSelectedCategoryId(null);
    },
    showExitToast,
    onShowExitToast: setShowExitToast
  });

  // Context 데이터 유효성 검증 (초기 로딩 상태 처리)
  // useEffect 대신 직접 체크하여 더 빠르게 응답
  const isContextReady = !!(
    appState &&
    selection &&
    connection &&
    panel &&
    quickNav &&
    appState.pages &&
    Array.isArray(appState.pages) &&
    appState.pages.length > 0
  );

  // Context가 준비되지 않았으면 로딩 화면 표시
  if (!isContextReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#666',
        gap: '16px'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Mindmap Memo</div>
        <div>앱을 초기화하는 중...</div>
        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') && (
          <div style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center', maxWidth: '90%' }}>
            <div>DEBUG: Context Ready = {isContextReady ? 'true' : 'false'}</div>
            <div>appState = {appState ? 'exists' : 'undefined'}</div>
            <div>selection = {selection ? 'exists' : 'undefined'}</div>
            <div>connection = {connection ? 'exists' : 'undefined'}</div>
            <div>panel = {panel ? 'exists' : 'undefined'}</div>
            <div>quickNav = {quickNav ? 'exists' : 'undefined'}</div>
            <div style={{ marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              <div>pages = {appState?.pages ? `array(${appState.pages.length})` : 'undefined'}</div>
              <div>currentPageId = {appState?.currentPageId || 'undefined'}</div>
              <div>quickNav.quickNavItems = {quickNav?.quickNavItems ? (
                Array.isArray(quickNav.quickNavItems) ? `array(${quickNav.quickNavItems.length})` : `NOT ARRAY: ${typeof quickNav.quickNavItems}`
              ) : 'undefined'}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 검색 기능
  useMobileSearch({
    pages: appState.pages,
    currentPageId: appState.currentPageId,
    searchQuery,
    searchCategory,
    searchImportanceFilters,
    searchShowGeneralContent,
    setSearchResults,
    setSearchCategoryResults
  });

  // onDeleteQuickNav 래퍼 함수 (targetId, targetType → itemId 변환)
  const handleDeleteQuickNav = React.useCallback((targetId: string, targetType: 'memo' | 'category') => {
    // quickNavItems에서 해당 target을 가진 item의 id를 찾아서 삭제
    const item = quickNav.quickNavItems.find(
      (item: any) => item.targetId === targetId && item.targetType === targetType
    );
    if (item) {
      onDeleteQuickNavItem(item.id);
    }
  }, [quickNav.quickNavItems, onDeleteQuickNavItem]);

  // 현재 페이지 찾기 (안전한 접근)
  const currentPage = React.useMemo(() => {
    if (!appState || !appState.pages || !Array.isArray(appState.pages)) {
      console.error('[MobileLayout] appState.pages is not available:', appState);
      return undefined;
    }
    return appState.pages.find(p => p.id === appState.currentPageId);
  }, [appState.pages, appState.currentPageId]);


  // 선택된 메모 및 카테고리 찾기 (안전한 접근)
  const selectedMemo = React.useMemo(() => {
    if (!currentPage?.memos || !Array.isArray(currentPage.memos)) return undefined;
    return currentPage.memos.find(m => m.id === selection.selectedMemoId);
  }, [currentPage, selection.selectedMemoId]);

  const selectedMemos = React.useMemo(() => {
    if (!currentPage?.memos || !Array.isArray(currentPage.memos)) return [];
    if (!selection.selectedMemoIds || !Array.isArray(selection.selectedMemoIds)) return [];
    return currentPage.memos.filter(m => selection.selectedMemoIds.includes(m.id));
  }, [currentPage, selection.selectedMemoIds]);

  const selectedCategory = React.useMemo(() => {
    if (!currentPage?.categories || !Array.isArray(currentPage.categories)) return undefined;
    return currentPage.categories.find(c => c.id === selection.selectedCategoryId);
  }, [currentPage, selection.selectedCategoryId]);

  const selectedCategories = React.useMemo(() => {
    if (!currentPage?.categories || !Array.isArray(currentPage.categories)) return [];
    if (!selection.selectedCategoryIds || !Array.isArray(selection.selectedCategoryIds)) return [];
    return currentPage.categories.filter(c => selection.selectedCategoryIds.includes(c.id));
  }, [currentPage, selection.selectedCategoryIds]);

  // Editor 표시 조건: 더블탭으로만 열리도록 변경 (자동 열림 제거)
  // React.useEffect(() => {
  //   if (selection.selectedMemoId || selection.selectedCategoryId) {
  //     setShowEditor(true);
  //   }
  // }, [selection.selectedMemoId, selection.selectedCategoryId, setShowEditor]);

  return (
    <React.Fragment>
      <div className={styles.mobileLayout}>
        {/* 마이그레이션 프롬프트 */}
        {needsMigration && (
          <MigrationPromptComponent
            status={migrationStatus}
            error={migrationError}
            result={migrationResult}
            onMigrate={migrate}
            onSkip={skipMigration}
            onDeleteLegacyData={deleteLegacyData}
          />
        )}

      {/* 상단 헤더 - 뒤로가기, 검색, 실행취소/다시실행 */}
      {!showPages && (
        <>
          <MobileHeader
            onBackToPages={() => {
              setShowPages(true);
              setShowEditor(false);  // 에디터 닫기
            }}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onToggleQuickNav={() => setShowQuickNavPanel(!showQuickNavPanel)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchCategory={searchCategory}
            onSearchCategoryChange={setSearchCategory}
            searchImportanceFilters={searchImportanceFilters}
            onToggleImportanceFilter={handleToggleImportanceFilter}
            onSelectAllImportance={handleSelectAllImportance}
            onClearAllImportance={handleClearAllImportance}
            searchShowGeneralContent={searchShowGeneralContent}
            onToggleGeneralContent={(checked) => setSearchShowGeneralContent(checked)}
            showFilters={showFilters}
            onToggleFilters={setShowFilters}
          />

          {/* 검색 결과 표시 */}
          {searchQuery.length > 0 && (
            <MobileSearchResults
              searchResults={searchResults}
              searchCategoryResults={searchCategoryResults}
              searchQuery={searchQuery}
              showFilters={showFilters}
              onNavigateToMemo={(memoId) => {
                const currentPage = appState?.pages?.find(p => p.id === appState.currentPageId);
                if (currentPage && selection && appState) {
                  // 메모 선택
                  selection.handleMemoSelect(memoId);
                  // 화면 중앙으로 이동 (scale 리셋 포함)
                  centerOnMemo(memoId, currentPage, appState.canvasScale, appState.setCanvasOffset, appState.setCanvasScale);
                }
                // 검색창 닫기
                setSearchQuery('');
              }}
              onNavigateToCategory={(categoryId) => {
                const currentPage = appState?.pages?.find(p => p.id === appState.currentPageId);
                if (currentPage && selection && appState) {
                  // 카테고리 선택
                  selection.selectCategory(categoryId);
                  // 카테고리 영역 전체를 화면 중앙으로 이동 (scale 조정 포함)
                  centerOnCategory(categoryId, currentPage, appState.canvasScale, appState.setCanvasOffset, appState.setCanvasScale);
                }
                // 검색창 닫기
                setSearchQuery('');
              }}
            />
          )}
        </>
      )}

      {/* 페이지 선택 뷰 */}
      {showPages && appState?.pages && (
        <div className={styles.pagesOverlay}>
          <div className={styles.pagesContainer}>
            <LeftPanel
              fullscreen={true}
              pages={appState.pages}
              currentPageId={appState.currentPageId || ''}
              onPageSelect={(pageId) => {
                console.log('🔵 [MobileLayout] 페이지 선택:', pageId);
                console.log('🔵 [MobileLayout] appState:', appState);
                console.log('🔵 [MobileLayout] setCurrentPageId:', appState?.setCurrentPageId);
                if (appState?.setCurrentPageId) {
                  appState.setCurrentPageId(pageId);
                  setShowPages(false);
                  console.log('✅ [MobileLayout] 페이지 전환 완료');
                } else {
                  console.error('❌ [MobileLayout] setCurrentPageId가 없습니다!');
                }
              }}
              onAddPage={onAddPage}
              onPageNameChange={onPageNameChange}
              onDeletePage={onDeletePage}
              width={0}
              onResize={() => {}}
              userEmail={userEmail}
              onLogout={onLogout}
              onStartTutorial={handleStartTutorialWrapper}
            />
          </div>
        </div>
      )}

      {/* 뷰 컨테이너 */}
      <div className={styles.viewContainer}>
        {/* Canvas 뷰 */}
        <div
          className={styles.view}
          style={{
            paddingRight: isTabletLandscape && showEditor && !isTabletCollapsed ? '300px' : '0',
            '--right-panel-offset': (() => {
              const offset = isTabletLandscape && showEditor && !isTabletCollapsed ? '300px' : '0px';
              console.log('🔧 [MobileLayout] CSS 변수 설정:', {
                isTabletLandscape,
                showEditor,
                isTabletCollapsed,
                offset
              });
              return offset;
            })()
          } as React.CSSProperties}
        >
          {currentPage && !showPages ? (
            <>
              <Canvas
              fullscreen={!isTabletLandscape}
              currentPage={currentPage}
              selectedMemoId={selection?.selectedMemoId}
              selectedMemoIds={selection?.selectedMemoIds || []}
              selectedCategoryId={selection?.selectedCategoryId}
              selectedCategoryIds={selection?.selectedCategoryIds || []}
              onMemoSelect={selection?.handleMemoSelect || (() => {})}
              onCategorySelect={selection?.selectCategory || (() => {})}
              onAddMemo={onAddMemo}
              onAddCategory={onAddCategory}
              onDeleteMemo={() => {
                if (selection?.selectedMemoId) {
                  onDeleteMemo(selection.selectedMemoId);
                }
              }}
              onDeleteCategory={onDeleteCategory}
              onDeleteSelected={onDeleteSelected}
              onDisconnectMemo={() => {
                if (selection?.selectedMemoId) {
                  onDisconnectMemo(selection.selectedMemoId);
                }
              }}
              onMemoPositionChange={onMemoPositionChange}
              onCategoryPositionChange={onCategoryPositionChange}
              onCategoryLabelPositionChange={onCategoryLabelPositionChange}
              onMemoSizeChange={onMemoSizeChange}
              onCategorySizeChange={onCategorySizeChange}
              onMemoDisplaySizeChange={onMemoDisplaySizeChange}
              onMemoTitleUpdate={onMemoTitleUpdate}
              onMemoBlockUpdate={onMemoBlockUpdate}
              onCategoryUpdate={onCategoryUpdate}
              onCategoryToggleExpanded={onCategoryToggleExpanded}
              onMoveToCategory={onMoveToCategory}
              onDetectCategoryOnDrop={onDetectCategoryOnDrop}
              onDetectCategoryDropForCategory={onDetectCategoryDropForCategory}
              isConnecting={connection?.isConnecting || false}
              isDisconnectMode={connection?.isDisconnectMode || false}
              connectingFromId={connection?.connectingFromId}
              connectingFromDirection={connection?.connectingFromDirection}
              dragLineEnd={connection?.dragLineEnd}
              onStartConnection={onStartConnection}
              onConnectMemos={onConnectMemos}
              onCancelConnection={onCancelConnection}
              onRemoveConnection={onRemoveConnection}
              onUpdateDragLine={onUpdateDragLine}
              isDragSelecting={selection?.isDragSelecting || false}
              dragSelectStart={selection?.dragSelectStart}
              dragSelectEnd={selection?.dragSelectEnd}
              dragHoveredMemoIds={selection?.dragHoveredMemoIds || []}
              dragHoveredCategoryIds={selection?.dragHoveredCategoryIds || []}
              onDragSelectStart={onDragSelectStart}
              onDragSelectMove={onDragSelectMove}
              onDragSelectEnd={onDragSelectEnd}
              activeImportanceFilters={selection?.activeImportanceFilters || new Set()}
              onToggleImportanceFilter={selection?.toggleImportanceFilter || (() => {})}
              showGeneralContent={selection?.showGeneralContent ?? true}
              onToggleGeneralContent={selection?.toggleGeneralContent || (() => {})}
              alwaysShowContent={selection?.alwaysShowContent ?? false}
              onToggleAlwaysShowContent={selection?.toggleAlwaysShowContent}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              isDraggingMemo={appState?.isDraggingMemo || false}
              draggingMemoId={appState?.draggingMemoId}
              onMemoDragStart={onMemoDragStart}
              onMemoDragEnd={onMemoDragEnd}
              isShiftPressed={appState?.isShiftPressed || false}
              shiftDragAreaCacheRef={shiftDragAreaCacheRef}
              onShiftDropCategory={onShiftDropCategory}
              isDraggingCategory={appState?.isDraggingCategory || false}
              draggingCategoryId={appState?.draggingCategoryId}
              onCategoryDragStart={onCategoryDragStart}
              onCategoryDragEnd={onCategoryDragEnd}
              onCategoryPositionDragEnd={onCategoryPositionDragEnd}
              onClearCategoryCache={onClearCategoryCache}
              canvasOffset={appState?.canvasOffset || { x: 0, y: 0 }}
              setCanvasOffset={appState?.setCanvasOffset || (() => {})}
              canvasScale={appState?.canvasScale || 1}
              setCanvasScale={appState?.setCanvasScale || (() => {})}
              onDeleteMemoById={onDeleteMemoById}
              onAddQuickNav={onAddQuickNav}
              onDeleteQuickNav={handleDeleteQuickNav}
              isQuickNavExists={isQuickNavExists}
              onOpenEditor={() => setShowEditor(true)}
              isLongPressActive={isLongPressActive}
              longPressTargetId={longPressTargetId}
              setIsLongPressActive={setIsLongPressActive}
              setIsShiftPressed={setIsShiftPressed}
              isShiftPressedRef={isShiftPressedRef}
            />
            </>
          ) : (
            <div className={styles.noPageContainer}>
              {appState.pages && appState.pages.length > 0 ? (
                <LeftPanel
                  fullscreen={true}
                  pages={appState.pages}
                  currentPageId={appState.currentPageId}
                  onPageSelect={(pageId) => {
                    console.log('🔵 [MobileLayout 574줄] 페이지 선택:', pageId);
                    console.log('🔵 [MobileLayout 574줄] showPages:', showPages);
                    appState.setCurrentPageId(pageId);
                    setShowPages(false);  // Canvas 뷰로 전환
                    console.log('✅ [MobileLayout 574줄] 페이지 전환 및 Canvas 뷰 활성화');
                  }}
                  onAddPage={onAddPage}
                  onPageNameChange={onPageNameChange}
                  onDeletePage={onDeletePage}
                  width={0}
                  onResize={() => {}}
                  userEmail={userEmail}
                  onLogout={onLogout}
                  onStartTutorial={handleStartTutorialWrapper}
                />
              ) : (
                <div className={styles.loadingMessage}>페이지 로딩 중...</div>
              )}
            </div>
          )}
        </div>

        {/* Editor 뷰 - 모바일/태블릿 세로: 전체 화면 오버레이로 표시 */}
        {showEditor && !isTabletLandscape && (
          <div className={styles.editorOverlay}>
            <div className={styles.editorContainer}>
              <div className={styles.editorHeader}>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowEditor(false)}
                >
                  ✕
                </button>
              </div>
              <RightPanel
                selectedMemo={selectedMemo}
                selectedMemos={selectedMemos}
                selectedCategory={selectedCategory}
                selectedCategories={selectedCategories}
                currentPage={currentPage}
                onMemoUpdate={onMemoUpdate}
                onCategoryUpdate={onCategoryUpdate}
                onMemoSelect={selection?.handleMemoSelect || (() => {})}
                onCategorySelect={selection?.selectCategory || (() => {})}
                onFocusMemo={onFocusMemo}
                onFocusCategory={onFocusCategory}
                width={panel?.rightPanelWidth || 400}
                onResize={(panel as any)?.handleRightPanelResize || (() => {})}
                isFullscreen={true}
                onToggleFullscreen={() => {}}
                activeImportanceFilters={selection?.activeImportanceFilters || []}
                showGeneralContent={selection?.showGeneralContent || false}
                onResetFilters={onResetFilters}
                onClose={() => setShowEditor(false)}
              />
            </div>
          </div>
        )}
      </div>

      </div>

      {/* 태블릿 가로모드 RightPanel - Canvas 위에 완전히 독립적인 overlay로 표시 */}
      {showEditor && isTabletLandscape && (
        <RightPanel
          selectedMemo={selectedMemo}
          selectedMemos={selectedMemos}
          selectedCategory={selectedCategory}
          selectedCategories={selectedCategories}
          currentPage={currentPage}
          onMemoUpdate={onMemoUpdate}
          onCategoryUpdate={onCategoryUpdate}
          onMemoSelect={selection?.handleMemoSelect || (() => {})}
          onCategorySelect={selection?.selectCategory || (() => {})}
          onFocusMemo={onFocusMemo}
          onFocusCategory={onFocusCategory}
          width={300}
          onResize={() => {}}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
          activeImportanceFilters={selection?.activeImportanceFilters || []}
          showGeneralContent={selection?.showGeneralContent || false}
          onResetFilters={onResetFilters}
          onClose={() => setShowEditor(false)}
          isTablet={true}
          isTabletCollapsed={isTabletCollapsed}
          onToggleTabletCollapse={() => setIsTabletCollapsed(!isTabletCollapsed)}
        />
      )}

      {/* 튜토리얼 */}
      {tutorialState.isActive && (
        <TutorialComponent
          currentStep={tutorialState.currentStep}
          onClose={handleCloseTutorial}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          onStepClick={handleStepClick}
          currentSubStep={tutorialState.currentSubStep}
          onNextSubStep={handleNextSubStep}
          onPreviousSubStep={handlePreviousSubStep}
          tutorialMode={tutorialMode}
        />
      )}

      {/* Quick Navigation Panel */}
      {showQuickNavPanel && quickNav?.quickNavItems && (
        <QuickNavPanelComponent
          quickNavItems={quickNav.quickNavItems}
          pages={appState?.pages || []}
          currentPageId={appState?.currentPageId || ''}
          rightPanelOpen={isTabletLandscape && showEditor}
          rightPanelWidth={isTabletLandscape && showEditor ? 300 : 0}
          showQuickNavPanel={showQuickNavPanel}
          onTogglePanel={() => setShowQuickNavPanel(false)}
          onExecuteQuickNav={(item: any) => {
            console.log('🚀 [MobileLayout] QuickNav 항목 클릭:', {
              itemName: item.name,
              targetId: item.targetId,
              targetType: item.targetType,
              pageId: item.pageId,
              currentPageId: appState?.currentPageId
            });
            // App.tsx에서 전달받은 executeQuickNav 사용 (PC 버전과 동일한 로직)
            onExecuteQuickNav(item);
            // 패널 닫기
            setShowQuickNavPanel(false);
            console.log('✅ [MobileLayout] QuickNav 실행 완료, 패널 닫기');
          }}
          onUpdateQuickNavItem={onUpdateQuickNavItem}
          onDeleteQuickNavItem={onDeleteQuickNavItem}
          hideButton={true} // 모바일에서는 버튼 숨김 (MobileHeader에 버튼 있음)
        />
      )}

      {/* FAB 메뉴 - 메모/카테고리 선택 */}
      {!showEditor && showFabMenu && (
        <div className={styles.fabMenu}>
          <div
            className={styles.fabMenuItem}
            onClick={() => {
              const position = {
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 100
              };
              onAddMemo(position);
              setShowFabMenu(false);
            }}
          >
            <div className={`${styles.fabMenuIcon} ${styles.memoIcon}`}>
              <Plus size={18} />
            </div>
            <span className={styles.fabMenuText}>메모 추가</span>
          </div>
          <div
            className={styles.fabMenuItem}
            onClick={() => {
              const position = {
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 100
              };
              onAddCategory(position);
              setShowFabMenu(false);
            }}
          >
            <div className={`${styles.fabMenuIcon} ${styles.categoryIcon}`}>
              <Folder size={18} />
            </div>
            <span className={styles.fabMenuText}>카테고리 추가</span>
          </div>
        </div>
      )}

      {/* 연결선 생성 버튼 - FAB 버튼 위 (태블릿 가로모드에서는 항상 표시) */}
      {(!showEditor || isTabletLandscape) && connection && (
        <button
          className={`${styles.connectionButton} ${connection.isConnecting ? styles.active : ''}`}
          onClick={() => {
            if (connection.isConnecting) {
              // 연결 모드 완전히 종료
              connection.setIsConnecting?.(false);
              connection.setConnectingFromId?.(null);
              onCancelConnection();
            } else {
              // 연결 모드 활성화 (메모 선택 없이도 가능)
              connection.setIsConnecting?.(true);
            }
          }}
          aria-label={connection.isConnecting ? "연결 취소" : "연결선 생성"}
        >
          <GitBranch size={24} />
        </button>
      )}

      {/* FAB 버튼 - 우측 하단 (태블릿 가로모드에서는 항상 표시) */}
      {(!showEditor || isTabletLandscape) && (
        <button
          className={styles.fabButton}
          onClick={() => setShowFabMenu(!showFabMenu)}
          aria-label="추가 메뉴"
        >
          <Plus size={28} style={{ transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
      )}

      {/* ImportanceFilter - 모바일에서는 하단에 가로로 배치 (태블릿 가로모드에서는 항상 표시) */}
      {(!showEditor || isTabletLandscape) && selection && (
        <>
          <ImportanceFilter
            activeFilters={selection.activeImportanceFilters || []}
            onToggleFilter={selection.toggleImportanceFilter || (() => {})}
            showGeneralContent={selection.showGeneralContent || false}
            onToggleGeneralContent={selection.toggleGeneralContent || (() => {})}
            alwaysShowContent={selection.alwaysShowContent || false}
            onToggleAlwaysShowContent={selection.toggleAlwaysShowContent}
            isMobile={true}
          />

          {/* 내용 항상 표시 버튼 - 중요도 필터 오른쪽 */}
          <button
            onClick={selection.toggleAlwaysShowContent}
            style={{
              position: 'fixed',
              top: '60px',
              left: '88px', // 중요도 필터 원형 버튼(56px) + 여백(32px)
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: selection.alwaysShowContent ? 'rgba(139, 92, 246, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 1700,
              fontSize: '11px',
              fontWeight: 600,
              color: selection.alwaysShowContent ? '#fff' : '#333',
              textAlign: 'center',
              lineHeight: 1.3,
              padding: '6px',
              wordBreak: 'keep-all',
              whiteSpace: 'pre-line',
              pointerEvents: 'auto' // MobileLayout이 pointer-events: none이므로 필수
            }}
          >
            내용{'\n'}표시
          </button>
        </>
      )}

      {/* 뒤로가기 종료 안내 토스트 */}
      {showExitToast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 10000,
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          뒤로가기 버튼을 한번 더 누르면 종료됩니다
        </div>
      )}
    </React.Fragment>
  );
};
