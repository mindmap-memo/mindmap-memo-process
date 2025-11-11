import { useEffect } from 'react';
import { TextBlock, ImportanceRange } from '../../../../types';

interface UseTextBlockEffectsParams {
  block: TextBlock;
  content: string;
  isFocused: boolean;
  isEditing: boolean;
  showImportanceMenu: boolean;
  importanceRanges: ImportanceRange[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readModeRef: React.RefObject<HTMLDivElement | null>;
  setContent: (content: string) => void;
  setImportanceRanges: React.Dispatch<React.SetStateAction<ImportanceRange[]>>;
  setBackgroundKey: React.Dispatch<React.SetStateAction<number>>;
  setShowImportanceMenu: (value: boolean) => void;
  setSelectedRange: (range: { start: number; end: number } | null) => void;
}

export const useTextBlockEffects = (params: UseTextBlockEffectsParams) => {
  const {
    block,
    content,
    isFocused,
    isEditing,
    showImportanceMenu,
    importanceRanges,
    textareaRef,
    readModeRef,
    setContent,
    setImportanceRanges,
    setBackgroundKey,
    setShowImportanceMenu,
    setSelectedRange
  } = params;

  // 외부에서 블록 내용이 변경되었을 때 로컬 상태 동기화
  // 단, 포커스된 상태에서는 외부 변경을 무시 (사용자가 입력 중일 수 있음)
  useEffect(() => {
    // 포커스된 상태에서는 외부 변경 무시
    if (isFocused) {
      return;
    }

    // content가 변경되지 않았으면 동기화하지 않음
    if (block.content === content) {
      return;
    }

    // 외부 변경이 있을 때만 동기화 (사용자 입력 중에는 무시)
    setContent(block.content);
  }, [block.content, isFocused, content, setContent]);

  // 외부에서 importanceRanges가 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    const isSameContent = JSON.stringify(importanceRanges) === JSON.stringify(block.importanceRanges);

    // 내용이 다를 때만 업데이트
    if (!isSameContent) {
      const newRanges = block.importanceRanges ? [...block.importanceRanges] : [];
      setImportanceRanges(newRanges);
      setBackgroundKey(prev => prev + 1);
    }
  }, [block.importanceRanges]);

  // 편집모드 진입 시 포커스만 처리 (동기화는 하지 않음)
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // 포커스만 주고, 값은 건드리지 않음
      // 값 동기화는 외부 block.content 변경 시에만 발생
    }
  }, [isEditing]);

  // 메뉴 외부 클릭/드래그 시 닫기
  useEffect(() => {
    const handleClickOrDragOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 메뉴 내부 클릭/드래그가 아니고, 현재 textarea도 아닌 경우 닫기
      if (showImportanceMenu &&
          !target.closest('[data-importance-menu]') &&
          target !== textareaRef.current) {
        setShowImportanceMenu(false);
        setSelectedRange(null);
      }
    };

    if (showImportanceMenu) {
      // mousedown과 drag 이벤트 모두 감지
      document.addEventListener('mousedown', handleClickOrDragOutside, true); // capture phase
      document.addEventListener('dragstart', handleClickOrDragOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOrDragOutside, true);
      document.removeEventListener('dragstart', handleClickOrDragOutside, true);
    };
  }, [showImportanceMenu]);

  // 텍스트 영역 자동 리사이즈 - 최적화
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '24px';
    if (content.trim() !== '' && (content.includes('\n') || textarea.scrollHeight > 24)) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  // 읽기 모드 DOM 검사 (디버깅용)
  useEffect(() => {
    if (readModeRef.current) {
      const allSpans = readModeRef.current.querySelectorAll('span');
      console.log('[TextBlock 읽기 모드] DOM 검사:', {
        blockId: block.id,
        totalSpans: allSpans.length,
        spans: Array.from(allSpans).map((span, idx) => ({
          index: idx,
          text: span.textContent?.substring(0, 20),
          visibility: window.getComputedStyle(span).visibility,
          display: window.getComputedStyle(span).display,
          backgroundColor: window.getComputedStyle(span).backgroundColor,
          color: window.getComputedStyle(span).color,
          isHidden: window.getComputedStyle(span).visibility === 'hidden' || window.getComputedStyle(span).display === 'none'
        }))
      });
    }
  }, [block.content, block.importanceRanges]);
};
