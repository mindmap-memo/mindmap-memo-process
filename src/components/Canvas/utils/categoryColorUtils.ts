/**
 * 카테고리 영역의 색상 계산
 * 카테고리 ID를 기반으로 일관된 색상 반환
 */
export const getCategoryAreaColor = (categoryId: string): string => {
  // 카테고리 ID를 기반으로 색상 해시 생성
  const colorPalette = [
    'rgba(139, 92, 246, 0.1)',   // 보라
    'rgba(59, 130, 246, 0.1)',   // 파랑
    'rgba(16, 185, 129, 0.1)',   // 초록
    'rgba(245, 158, 11, 0.1)',   // 주황
    'rgba(239, 68, 68, 0.1)',    // 빨강
    'rgba(236, 72, 153, 0.1)',   // 핑크
    'rgba(14, 165, 233, 0.1)',   // 하늘
    'rgba(132, 204, 22, 0.1)',   // 라임
  ];

  // ID 문자열을 숫자로 변환하여 색상 인덱스 결정
  const hash = categoryId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colorPalette.length;

  return colorPalette[colorIndex];
};
