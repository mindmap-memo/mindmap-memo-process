'use client';

import React from 'react';
import { Plus, Folder } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { useMobileLayout } from './hooks/useMobileLayout';
import Canvas from '../Canvas/Canvas';
import RightPanel from '../RightPanel/RightPanel';
import ImportanceFilter from '../ImportanceFilter';
import { useAppStateContext, useSelection, useConnection, usePanel } from '../../contexts';
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

  // 액션 핸들러
  onAddMemo: (position: { x: number; y: number }) => void;
  onAddCategory: (position: { x: number; y: number }) => void;
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
  onAddMemo,
  onAddCategory,
}) => {
  const { showEditor, setShowEditor } = useMobileLayout();
  const [showFabMenu, setShowFabMenu] = React.useState(false);

  // Context에서 필요한 상태와 핸들러 가져오기
  const appState = useAppStateContext();
  const selection = useSelection();
  const connection = useConnection();
  const panel = usePanel();

  // 임시: appState에 없는 핸들러들의 기본값
  const noopHandler = () => {};
  const safeAppState = {
    ...appState,
    onMemoPositionChange: appState.onMemoPositionChange || noopHandler,
    onCategoryPositionChange: appState.onCategoryPositionChange || noopHandler,
    onCategoryLabelPositionChange: appState.onCategoryLabelPositionChange || noopHandler,
    onMemoSizeChange: appState.onMemoSizeChange || noopHandler,
    onCategorySizeChange: appState.onCategorySizeChange || noopHandler,
    onMemoDisplaySizeChange: appState.onMemoDisplaySizeChange || noopHandler,
    onMemoTitleUpdate: appState.onMemoTitleUpdate || noopHandler,
    onMemoBlockUpdate: appState.onMemoBlockUpdate || noopHandler,
    onCategoryUpdate: appState.onCategoryUpdate || noopHandler,
    onCategoryToggleExpanded: appState.onCategoryToggleExpanded || noopHandler,
    onMoveToCategory: appState.onMoveToCategory || noopHandler,
    onDetectCategoryOnDrop: appState.onDetectCategoryOnDrop || noopHandler,
    onDetectCategoryDropForCategory: appState.onDetectCategoryDropForCategory || noopHandler,
    onDeleteMemo: appState.onDeleteMemo || noopHandler,
    onDeleteCategory: appState.onDeleteCategory || noopHandler,
    onDeleteSelected: appState.onDeleteSelected || noopHandler,
    onMemoUpdate: appState.onMemoUpdate || noopHandler,
    onFocusMemo: appState.onFocusMemo || noopHandler,
    onResetFilters: appState.onResetFilters || noopHandler,
    onCategoryPositionDragEnd: appState.onCategoryPositionDragEnd || noopHandler,
    onCategoryDragStart: appState.onCategoryDragStart || noopHandler,
    onCategoryDragEnd: appState.onCategoryDragEnd || noopHandler,
    onMemoDragStart: appState.onMemoDragStart || noopHandler,
    onMemoDragEnd: appState.onMemoDragEnd || noopHandler,
    onShiftDropCategory: appState.onShiftDropCategory || noopHandler,
    onClearCategoryCache: appState.onClearCategoryCache || noopHandler,
    onDeleteMemoById: appState.onDeleteMemoById || noopHandler,
    onAddQuickNav: appState.onAddQuickNav || noopHandler,
    isQuickNavExists: appState.isQuickNavExists || (() => false),
    onAddMemo: appState.onAddMemo || onAddMemo,
    onAddCategory: appState.onAddCategory || onAddCategory,
    isDragSelecting: appState.isDragSelecting || false,
    dragSelectStart: appState.dragSelectStart || null,
    dragSelectEnd: appState.dragSelectEnd || null,
    dragHoveredMemoIds: appState.dragHoveredMemoIds || [],
    dragHoveredCategoryIds: appState.dragHoveredCategoryIds || [],
    onDragSelectStart: appState.onDragSelectStart || noopHandler,
    onDragSelectMove: appState.onDragSelectMove || noopHandler,
    onDragSelectEnd: appState.onDragSelectEnd || noopHandler,
    activeImportanceFilters: appState.activeImportanceFilters || [],
    canUndo: appState.canUndo || false,
    canRedo: appState.canRedo || false,
    onUndo: appState.onUndo || noopHandler,
    onRedo: appState.onRedo || noopHandler,
    isDraggingMemo: appState.isDraggingMemo || false,
    draggingMemoId: appState.draggingMemoId || null,
    shiftDragAreaCacheRef: appState.shiftDragAreaCacheRef || { current: new Map() },
    isDraggingCategory: appState.isDraggingCategory || false,
    draggingCategoryId: appState.draggingCategoryId || null,
    onDisconnectMemo: appState.onDisconnectMemo || connection.disconnectMemo,
    dragLineEnd: appState.dragLineEnd || null,
  };

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

      {/* 상단 헤더 - 페이지 이동 버튼 */}
      <MobileHeader
        currentPageId={appState.currentPageId}
        pages={appState.pages}
        onPageChange={appState.setCurrentPageId}
      />

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
              onAddMemo={safeAppState.onAddMemo}
              onAddCategory={safeAppState.onAddCategory}
              onDeleteMemo={safeAppState.onDeleteMemo}
              onDeleteCategory={safeAppState.onDeleteCategory}
              onDeleteSelected={safeAppState.onDeleteSelected}
              onDisconnectMemo={safeAppState.onDisconnectMemo}
              onMemoPositionChange={safeAppState.onMemoPositionChange}
              onCategoryPositionChange={safeAppState.onCategoryPositionChange}
              onCategoryLabelPositionChange={safeAppState.onCategoryLabelPositionChange}
              onMemoSizeChange={safeAppState.onMemoSizeChange}
              onCategorySizeChange={safeAppState.onCategorySizeChange}
              onMemoDisplaySizeChange={safeAppState.onMemoDisplaySizeChange}
              onMemoTitleUpdate={safeAppState.onMemoTitleUpdate}
              onMemoBlockUpdate={safeAppState.onMemoBlockUpdate}
              onCategoryUpdate={safeAppState.onCategoryUpdate}
              onCategoryToggleExpanded={safeAppState.onCategoryToggleExpanded}
              onMoveToCategory={safeAppState.onMoveToCategory}
              onDetectCategoryOnDrop={safeAppState.onDetectCategoryOnDrop}
              onDetectCategoryDropForCategory={safeAppState.onDetectCategoryDropForCategory}
              isConnecting={connection.isConnecting}
              isDisconnectMode={connection.isDisconnectMode}
              connectingFromId={connection.connectingFromId}
              connectingFromDirection={connection.connectingFromDirection}
              dragLineEnd={safeAppState.dragLineEnd}
              onStartConnection={connection.onStartConnection}
              onConnectMemos={connection.onConnectMemos}
              onCancelConnection={connection.onCancelConnection}
              onRemoveConnection={connection.onRemoveConnection}
              onUpdateDragLine={connection.onUpdateDragLine}
              isDragSelecting={safeAppState.isDragSelecting}
              dragSelectStart={safeAppState.dragSelectStart}
              dragSelectEnd={safeAppState.dragSelectEnd}
              dragHoveredMemoIds={safeAppState.dragHoveredMemoIds}
              dragHoveredCategoryIds={safeAppState.dragHoveredCategoryIds}
              onDragSelectStart={safeAppState.onDragSelectStart}
              onDragSelectMove={safeAppState.onDragSelectMove}
              onDragSelectEnd={safeAppState.onDragSelectEnd}
              activeImportanceFilters={selection.activeImportanceFilters}
              onToggleImportanceFilter={selection.toggleImportanceFilter}
              showGeneralContent={selection.showGeneralContent}
              onToggleGeneralContent={selection.toggleGeneralContent}
              canUndo={safeAppState.canUndo}
              canRedo={safeAppState.canRedo}
              onUndo={safeAppState.onUndo}
              onRedo={safeAppState.onRedo}
              isDraggingMemo={safeAppState.isDraggingMemo}
              draggingMemoId={safeAppState.draggingMemoId}
              onMemoDragStart={safeAppState.onMemoDragStart}
              onMemoDragEnd={safeAppState.onMemoDragEnd}
              isShiftPressed={appState.isShiftPressed}
              shiftDragAreaCacheRef={safeAppState.shiftDragAreaCacheRef}
              onShiftDropCategory={safeAppState.onShiftDropCategory}
              isDraggingCategory={safeAppState.isDraggingCategory}
              draggingCategoryId={safeAppState.draggingCategoryId}
              onCategoryDragStart={safeAppState.onCategoryDragStart}
              onCategoryDragEnd={safeAppState.onCategoryDragEnd}
              onCategoryPositionDragEnd={safeAppState.onCategoryPositionDragEnd}
              onClearCategoryCache={safeAppState.onClearCategoryCache}
              canvasOffset={appState.canvasOffset}
              setCanvasOffset={appState.setCanvasOffset}
              canvasScale={appState.canvasScale}
              setCanvasScale={appState.setCanvasScale}
              onDeleteMemoById={safeAppState.onDeleteMemoById}
              onAddQuickNav={safeAppState.onAddQuickNav}
              isQuickNavExists={safeAppState.isQuickNavExists}
              onOpenEditor={() => setShowEditor(true)}
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
                onMemoUpdate={safeAppState.onMemoUpdate}
                onCategoryUpdate={safeAppState.onCategoryUpdate}
                onMemoSelect={selection.handleMemoSelect}
                onCategorySelect={selection.selectCategory}
                onFocusMemo={safeAppState.onFocusMemo}
                width={panel.rightPanelWidth}
                onResize={panel.handleRightPanelResize}
                isFullscreen={true}
                onToggleFullscreen={() => {}}
                activeImportanceFilters={safeAppState.activeImportanceFilters}
                showGeneralContent={appState.showGeneralContent}
                onResetFilters={safeAppState.onResetFilters}
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
        <QuickNavPanelComponent onClose={() => setShowQuickNavPanel(false)} />
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
