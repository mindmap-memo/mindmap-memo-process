'use client';

import React from 'react';
import { Plus, Folder } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { MobileSearchResults } from './MobileSearchResults';
import { useMobileLayout } from './hooks/useMobileLayout';
import { useMobileSearch } from './hooks/useMobileSearch';
import Canvas from '../Canvas/Canvas';
import RightPanel from '../RightPanel/RightPanel';
import LeftPanel from '../LeftPanel/LeftPanel';
import ImportanceFilter from '../ImportanceFilter';
import { useAppStateContext, useSelection, useConnection, usePanel } from '../../contexts';
import { MemoDisplaySize, CategoryBlock, MemoBlock } from '../../types';
import { centerOnMemo, centerOnCategory } from '../../utils/categoryAreaUtils';
import styles from '../../scss/components/MobileLayout/MobileLayout.module.scss';

interface MobileLayoutProps {
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

  // Context에서 필요한 상태와 핸들러 가져오기
  const appState = useAppStateContext();
  const selection = useSelection();
  const connection = useConnection();
  const panel = usePanel();

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

  // 현재 페이지 찾기
  const currentPage = appState.pages.find(p => p.id === appState.currentPageId);

  // 선택된 메모 및 카테고리 찾기
  const selectedMemo = currentPage?.memos.find(m => m.id === selection.selectedMemoId);
  const selectedMemos = currentPage?.memos.filter(m => selection.selectedMemoIds.includes(m.id)) || [];
  const selectedCategory = currentPage?.categories?.find(c => c.id === selection.selectedCategoryId);
  const selectedCategories = currentPage?.categories?.filter(c => selection.selectedCategoryIds.includes(c.id)) || [];

  // Editor 표시 조건: 더블탭으로만 열리도록 변경 (자동 열림 제거)
  // React.useEffect(() => {
  //   if (selection.selectedMemoId || selection.selectedCategoryId) {
  //     setShowEditor(true);
  //   }
  // }, [selection.selectedMemoId, selection.selectedCategoryId, setShowEditor]);

  return (
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
            onBackToPages={() => setShowPages(true)}
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
                const currentPage = appState.pages.find(p => p.id === appState.currentPageId);
                if (currentPage) {
                  // 메모 선택
                  selection.handleMemoSelect(memoId);
                  // 화면 중앙으로 이동
                  centerOnMemo(memoId, currentPage, appState.canvasScale, appState.setCanvasOffset);
                }
                // 검색창 닫기
                setSearchQuery('');
              }}
              onNavigateToCategory={(categoryId) => {
                const currentPage = appState.pages.find(p => p.id === appState.currentPageId);
                if (currentPage) {
                  // 카테고리 선택
                  selection.selectCategory(categoryId);
                  // 카테고리 영역 전체를 화면 중앙으로 이동
                  centerOnCategory(categoryId, currentPage, appState.canvasScale, appState.setCanvasOffset);
                }
                // 검색창 닫기
                setSearchQuery('');
              }}
            />
          )}
        </>
      )}

      {/* 페이지 선택 뷰 */}
      {showPages && (
        <div className={styles.pagesOverlay}>
          <div className={styles.pagesContainer}>
            <LeftPanel
              fullscreen={true}
              pages={appState.pages}
              currentPageId={appState.currentPageId}
              onPageSelect={(pageId) => {
                appState.setCurrentPageId(pageId);
                setShowPages(false);
              }}
              onAddPage={onAddPage}
              onPageNameChange={onPageNameChange}
              onDeletePage={onDeletePage}
              width={0}
              onResize={() => {}}
            />
          </div>
        </div>
      )}

      {/* 뷰 컨테이너 */}
      <div className={styles.viewContainer}>
        {/* Canvas 뷰 */}
        <div className={styles.view}>
            <Canvas
              fullscreen
              currentPage={currentPage}
              selectedMemoId={selection.selectedMemoId}
              selectedMemoIds={selection.selectedMemoIds}
              selectedCategoryId={selection.selectedCategoryId}
              selectedCategoryIds={selection.selectedCategoryIds}
              onMemoSelect={selection.handleMemoSelect}
              onCategorySelect={selection.selectCategory}
              onAddMemo={onAddMemo}
              onAddCategory={onAddCategory}
              onDeleteMemo={() => {
                if (selection.selectedMemoId) {
                  onDeleteMemo(selection.selectedMemoId);
                }
              }}
              onDeleteCategory={onDeleteCategory}
              onDeleteSelected={onDeleteSelected}
              onDisconnectMemo={() => {
                if (selection.selectedMemoId) {
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
              isConnecting={connection.isConnecting}
              isDisconnectMode={connection.isDisconnectMode}
              connectingFromId={connection.connectingFromId}
              connectingFromDirection={connection.connectingFromDirection}
              dragLineEnd={connection.dragLineEnd}
              onStartConnection={onStartConnection}
              onConnectMemos={onConnectMemos}
              onCancelConnection={onCancelConnection}
              onRemoveConnection={onRemoveConnection}
              onUpdateDragLine={onUpdateDragLine}
              isDragSelecting={selection.isDragSelecting}
              dragSelectStart={selection.dragSelectStart}
              dragSelectEnd={selection.dragSelectEnd}
              dragHoveredMemoIds={selection.dragHoveredMemoIds}
              dragHoveredCategoryIds={selection.dragHoveredCategoryIds}
              onDragSelectStart={onDragSelectStart}
              onDragSelectMove={onDragSelectMove}
              onDragSelectEnd={onDragSelectEnd}
              activeImportanceFilters={selection.activeImportanceFilters}
              onToggleImportanceFilter={selection.toggleImportanceFilter}
              showGeneralContent={selection.showGeneralContent}
              onToggleGeneralContent={selection.toggleGeneralContent}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              isDraggingMemo={appState.isDraggingMemo}
              draggingMemoId={appState.draggingMemoId}
              onMemoDragStart={onMemoDragStart}
              onMemoDragEnd={onMemoDragEnd}
              isShiftPressed={appState.isShiftPressed}
              shiftDragAreaCacheRef={shiftDragAreaCacheRef}
              onShiftDropCategory={onShiftDropCategory}
              isDraggingCategory={appState.isDraggingCategory}
              draggingCategoryId={appState.draggingCategoryId}
              onCategoryDragStart={onCategoryDragStart}
              onCategoryDragEnd={onCategoryDragEnd}
              onCategoryPositionDragEnd={onCategoryPositionDragEnd}
              onClearCategoryCache={onClearCategoryCache}
              canvasOffset={appState.canvasOffset}
              setCanvasOffset={appState.setCanvasOffset}
              canvasScale={appState.canvasScale}
              setCanvasScale={appState.setCanvasScale}
              onDeleteMemoById={onDeleteMemoById}
              onAddQuickNav={onAddQuickNav}
              isQuickNavExists={isQuickNavExists}
              onOpenEditor={() => setShowEditor(true)}
              isLongPressActive={isLongPressActive}
              longPressTargetId={longPressTargetId}
              setIsLongPressActive={setIsLongPressActive}
              setIsShiftPressed={setIsShiftPressed}
              isShiftPressedRef={isShiftPressedRef}
            />
        </div>

        {/* Editor 뷰 - showEditor가 true일 때만 표시 */}
        {showEditor && (
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
                onMemoSelect={selection.handleMemoSelect}
                onCategorySelect={selection.selectCategory}
                onFocusMemo={onFocusMemo}
                width={panel.rightPanelWidth}
                onResize={(panel as any).handleRightPanelResize || (() => {})}
                isFullscreen={true}
                onToggleFullscreen={() => {}}
                activeImportanceFilters={selection.activeImportanceFilters}
                showGeneralContent={selection.showGeneralContent}
                onResetFilters={onResetFilters}
                onClose={() => setShowEditor(false)}
              />
            </div>
          </div>
        )}
      </div>

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
      {showQuickNavPanel && (
        <QuickNavPanelComponent
          quickNavItems={appState.currentPage?.quickNavItems || []}
          pages={appState.pages}
          currentPageId={appState.currentPageId}
          rightPanelOpen={false}
          rightPanelWidth={0}
          showQuickNavPanel={showQuickNavPanel}
          onTogglePanel={() => setShowQuickNavPanel(false)}
          onExecuteQuickNav={onExecuteQuickNav}
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

      {/* FAB 버튼 - 우측 하단 */}
      {!showEditor && (
        <button
          className={styles.fabButton}
          onClick={() => setShowFabMenu(!showFabMenu)}
          aria-label="추가 메뉴"
        >
          <Plus size={28} style={{ transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
      )}

      {/* ImportanceFilter - 모바일에서는 하단에 가로로 배치 */}
      {!showEditor && (
        <ImportanceFilter
          activeFilters={selection.activeImportanceFilters}
          onToggleFilter={selection.toggleImportanceFilter}
          showGeneralContent={selection.showGeneralContent}
          onToggleGeneralContent={selection.toggleGeneralContent}
          isMobile={true}
        />
      )}
    </div>
  );
};
