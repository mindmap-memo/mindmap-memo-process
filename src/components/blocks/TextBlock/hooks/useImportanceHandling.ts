import React from 'react';
import { ImportanceLevel, ImportanceRange, TextBlock } from '../../../../types';

interface UseImportanceHandlingParams {
  block: TextBlock;
  content: string;
  importanceRanges: ImportanceRange[];
  isEditing: boolean;
  canEdit: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setImportanceRanges: React.Dispatch<React.SetStateAction<ImportanceRange[]>>;
  setBackgroundKey: React.Dispatch<React.SetStateAction<number>>;
  setShowImportanceMenu: (value: boolean) => void;
  setImportanceMenuPosition: (position: { x: number; y: number }) => void;
  setSelectedRange: (range: { start: number; end: number } | null) => void;
  selectedRange: { start: number; end: number } | null;
  onUpdate?: (block: TextBlock) => void;
  onSaveToHistory?: () => void;
}

export const useImportanceHandling = (params: UseImportanceHandlingParams) => {
  const {
    block,
    content,
    importanceRanges,
    isEditing,
    canEdit,
    textareaRef,
    setImportanceRanges,
    setBackgroundKey,
    setShowImportanceMenu,
    setImportanceMenuPosition,
    setSelectedRange,
    selectedRange,
    onUpdate,
    onSaveToHistory
  } = params;

  // 텍스트 선택 처리 (드래그 끝난 후)
  const handleTextSelection = (e: React.MouseEvent) => {
    if (!isEditing || !canEdit) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && end > start) {
      // 텍스트가 선택된 경우
      setSelectedRange({ start, end });

      // 메뉴 크기 (8개 항목 * 약 32px + padding)
      const menuWidth = 150;
      const menuHeight = 280; // 여유있게 설정

      // 화면 크기
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // textarea의 실제 화면상 위치
      const textareaRect = textarea.getBoundingClientRect();

      // 드래그 끝난 위치 (마우스 업 위치)를 사용
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 기본 위치: 마우스 오른쪽에 바로 붙여서 표시
      let x = mouseX + 10;
      let y = mouseY - 10; // 마우스 위치보다 약간 위에 표시

      // 오른쪽 경계 체크 - 화면을 넘어가면 왼쪽에 표시
      if (x + menuWidth > viewportWidth) {
        x = mouseX - menuWidth - 10;
      }

      // 왼쪽 경계 체크
      if (x < 10) {
        x = 10;
      }

      // 아래쪽 경계 체크 - 양옆 체크와 동일한 방식
      if (y + menuHeight > viewportHeight) {
        y = viewportHeight - menuHeight - 10;
      }

      // 위쪽 경계 체크
      if (y < 10) {
        y = 10;
      }

      setImportanceMenuPosition({ x, y });
      setShowImportanceMenu(true);
    } else {
      setShowImportanceMenu(false);
      setSelectedRange(null);
    }
  };

  // 중요도 적용
  const applyImportance = (level: ImportanceLevel) => {
    if (!selectedRange) {
      return;
    }

    const ranges = importanceRanges || [];
    const newRange: ImportanceRange = {
      start: selectedRange.start,
      end: selectedRange.end,
      level: level
    };

    let updatedRanges: ImportanceRange[];

    if (level === 'none') {
      // 강조 해제: 선택된 범위와 겹치는 기존 범위들을 분할하거나 제거
      updatedRanges = [];

      ranges.forEach(range => {
        // 겹치지 않는 범위는 그대로 유지
        if (range.end <= selectedRange.start || range.start >= selectedRange.end) {
          updatedRanges.push(range);
        } else {
          // 겹치는 범위를 분할
          // 선택된 범위 앞부분
          if (range.start < selectedRange.start) {
            updatedRanges.push({
              start: range.start,
              end: selectedRange.start,
              level: range.level
            });
          }

          // 선택된 범위 뒷부분
          if (range.end > selectedRange.end) {
            updatedRanges.push({
              start: selectedRange.end,
              end: range.end,
              level: range.level
            });
          }
        }
      });
    } else {
      // 강조 적용: 겹치는 부분을 새 강조로 덮어쓰고, 기존 강조의 나머지 부분은 유지
      updatedRanges = [];

      ranges.forEach(range => {
        // 겹치지 않는 범위는 그대로 유지
        if (range.end <= selectedRange.start || range.start >= selectedRange.end) {
          updatedRanges.push(range);
        } else {
          // 겹치는 범위를 분할하여 겹치지 않는 부분만 유지
          // 선택된 범위 앞부분
          if (range.start < selectedRange.start) {
            updatedRanges.push({
              start: range.start,
              end: selectedRange.start,
              level: range.level
            });
          }

          // 선택된 범위 뒷부분
          if (range.end > selectedRange.end) {
            updatedRanges.push({
              start: selectedRange.end,
              end: range.end,
              level: range.level
            });
          }
          // 겹치는 중간 부분은 새 강조로 덮어쓰므로 제거
        }
      });

      // 새 강조 범위 추가
      updatedRanges.push(newRange);
    }

    // 로컬 상태 업데이트
    setImportanceRanges(updatedRanges);
    setBackgroundKey(prev => prev + 1);

    // 블록 업데이트
    const updatedBlock: TextBlock = {
      id: block.id,
      type: 'text',
      content: content,
      importanceRanges: updatedRanges
    };

    if (onUpdate) {
      onUpdate(updatedBlock);
    }

    // 중요도 변경 시 히스토리 저장
    if (onSaveToHistory) {
      setTimeout(() => onSaveToHistory(), 50);
    }

    // 메뉴 닫기 및 포커스 복원
    setShowImportanceMenu(false);
    setSelectedRange(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  return {
    handleTextSelection,
    applyImportance
  };
};
