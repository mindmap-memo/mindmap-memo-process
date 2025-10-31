import React from 'react';
import { MemoBlock } from '../../../types';

export interface UseConnectedMemosProps {
  selectedMemo: MemoBlock | null;
  setShowConnectedMemos: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 연결된 메모 자동 펼침 훅
 *
 * 메모가 선택되면 연결된 메모 섹션을 자동으로 펼칩니다.
 *
 * **기능:**
 * - 메모 선택 시 showConnectedMemos를 true로 설정
 */
export const useConnectedMemos = ({
  selectedMemo,
  setShowConnectedMemos
}: UseConnectedMemosProps) => {
  React.useEffect(() => {
    if (selectedMemo) {
      setShowConnectedMemos(true);
    }
  }, [selectedMemo?.id, setShowConnectedMemos]);
};
