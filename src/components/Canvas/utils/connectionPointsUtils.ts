/**
 * 블록(메모 또는 카테고리)의 연결점 계산
 */
export const getBlockConnectionPoints = (item: any) => {
  const x = item.position.x;
  const y = item.position.y;
  const width = item.size?.width || 200;
  const height = item.size?.height || 100;

  return {
    top: { x: x + width / 2, y: y },
    bottom: { x: x + width / 2, y: y + height },
    left: { x: x, y: y + height / 2 },
    right: { x: x + width, y: y + height / 2 }
  };
};

/**
 * 메모 또는 카테고리의 연결점 계산
 * 카테고리 영역의 경우 렌더링된 실제 영역을 기준으로 계산
 */
export const getConnectionPoints = (
  item: any,
  renderedCategoryAreas: { [categoryId: string]: { x: number; y: number; width: number; height: number } }
) => {
  // 카테고리 블록인 경우
  if (item.children !== undefined) {
    // 1순위: 렌더링된 영역 정보 사용 (expanded 카테고리만 여기 있음)
    const renderedArea = renderedCategoryAreas[item.id];
    if (renderedArea) {
      const { x, y, width, height } = renderedArea;
      return {
        top: { x: x + width / 2, y: y },
        bottom: { x: x + width / 2, y: y + height },
        left: { x: x, y: y + height / 2 },
        right: { x: x + width, y: y + height / 2 }
      };
    }

    // 2순위: collapsed 카테고리는 블록 기준으로 계산
    return getBlockConnectionPoints(item);
  }

  // 메모 블록인 경우 - 블록 기준 연결점 사용
  return getBlockConnectionPoints(item);
};
