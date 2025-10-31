import React from 'react';
import { MemoBlock } from '../../../types';

export interface UseTableCreationProps {
  selectedMemo: MemoBlock | null;
  onMemoUpdate: (memoId: string, updates: Partial<MemoBlock>) => void;
}

/**
 * 테이블 생성 신호 감지 훅
 *
 * TableBlock 컴포넌트에서 전역 신호를 통해 테이블 생성을 요청하면
 * 이를 감지하여 메모의 블록 목록에 테이블 블록을 추가합니다.
 *
 * **기능:**
 * - window.createTableAfterBlock 신호 감지 (100ms 간격)
 * - 지정된 블록 다음에 테이블 블록 삽입
 * - 신호 처리 후 자동 제거
 */
export const useTableCreation = ({
  selectedMemo,
  onMemoUpdate
}: UseTableCreationProps) => {
  React.useEffect(() => {
    const checkForTableCreation = () => {
      const signal = (window as any).createTableAfterBlock;
      if (signal && selectedMemo) {
        const { afterBlockId, tableBlock } = signal;

        // 현재 메모에서 해당 블록 찾기
        const blockIndex = selectedMemo.blocks?.findIndex(block => block.id === afterBlockId);

        if (blockIndex !== undefined && blockIndex >= 0 && selectedMemo.blocks) {
          const updatedBlocks = [...selectedMemo.blocks];
          updatedBlocks.splice(blockIndex + 1, 0, tableBlock);

          onMemoUpdate(selectedMemo.id, { blocks: updatedBlocks });

          // 신호 제거
          delete (window as any).createTableAfterBlock;
        }
      }
    };

    const interval = setInterval(checkForTableCreation, 100);
    return () => clearInterval(interval);
  }, [selectedMemo, onMemoUpdate]);
};
