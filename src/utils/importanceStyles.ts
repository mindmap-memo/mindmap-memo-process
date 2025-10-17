import { ImportanceLevel } from '../types';

// 중요도 레벨별 형광펜 스타일 정의
export const getImportanceStyle = (level?: ImportanceLevel) => {
  if (!level || level === 'none') return {};

  switch (level) {
    case 'critical':
      return { backgroundColor: '#ffcdd2', borderLeft: '3px solid #f44336' }; // 빨간 형광펜 - 매우중요
    case 'important':
      return { backgroundColor: '#ffcc80', borderLeft: '3px solid #ff9800' }; // 주황 형광펜 - 중요
    case 'opinion':
      return { backgroundColor: '#e1bee7', borderLeft: '3px solid #9c27b0' }; // 보라 형광펜 - 의견
    case 'reference':
      return { backgroundColor: '#81d4fa', borderLeft: '3px solid #2196f3' }; // 파란 형광펜 - 참고
    case 'question':
      return { backgroundColor: '#fff59d', borderLeft: '3px solid #fbc02d' }; // 노란 형광펜 - 질문
    case 'idea':
      return { backgroundColor: '#c8e6c9', borderLeft: '3px solid #4caf50' }; // 초록 형광펜 - 아이디어
    case 'data':
      return { backgroundColor: '#bdbdbd', borderLeft: '3px solid #616161' }; // 진한 회색 형광펜 - 데이터
    default:
      return {};
  }
};

export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  critical: '매우중요',
  important: '중요',
  opinion: '의견',
  reference: '참고',
  question: '질문',
  idea: '아이디어',
  data: '데이터',
  none: '강조 해제'
};

// 중요도 레벨별 색상 (메뉴 표시용)
export const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  critical: '#ffcdd2',
  important: '#ffcc80',
  opinion: '#e1bee7',
  reference: '#81d4fa',
  question: '#fff59d',
  idea: '#c8e6c9',
  data: '#bdbdbd',
  none: '#ffffff'
};

// 블록이 필터링되어야 하는지 확인하는 헬퍼 함수
export const shouldShowBlock = (
  blockImportance?: ImportanceLevel,
  activeFilters?: Set<ImportanceLevel>,
  showGeneralContent?: boolean
): boolean => {
  // 필터가 설정되지 않았으면 모든 블록 표시
  if (!activeFilters && showGeneralContent !== false) {
    return true;
  }

  // 블록에 중요도가 설정되어 있는 경우
  if (blockImportance && blockImportance !== 'none') {
    // 해당 중요도가 필터에 포함되어 있는지 확인
    return activeFilters ? activeFilters.has(blockImportance) : true;
  }

  // 블록에 중요도가 설정되지 않은 경우 (일반 내용)
  return showGeneralContent !== false;
};
