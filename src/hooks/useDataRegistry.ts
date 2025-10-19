import { useEffect } from 'react';
import { globalDataRegistry } from '../utils/dataRegistry';

/**
 * useDataRegistry
 *
 * Data Registry 초기화 및 동기화를 관리하는 커스텀 훅입니다.
 *
 * **주요 기능:**
 * - globalDataRegistry와 로컬 dataRegistry 상태를 동기화
 * - dataRegistry 변경 시 자동으로 구독 설정
 * - 언마운트 시 구독 해제
 *
 * @param props - dataRegistry, setDataRegistry
 */

interface UseDataRegistryProps {
  dataRegistry: Record<string, any>;
  setDataRegistry: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const useDataRegistry = ({
  dataRegistry,
  setDataRegistry
}: UseDataRegistryProps) => {
  // ===== Data Registry 초기화 및 동기화 =====
  useEffect(() => {
    // globalDataRegistry에 현재 상태 설정
    globalDataRegistry.setRegistry(dataRegistry);

    // 변경 사항 구독
    const unsubscribe = globalDataRegistry.subscribe(() => {
      setDataRegistry({ ...globalDataRegistry.getRegistry() });
    });

    // 언마운트 시 구독 해제
    return unsubscribe;
  }, [dataRegistry, setDataRegistry]);
};
