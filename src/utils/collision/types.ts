/**
 * 충돌 검사 시스템 타입 정의
 */

import { CategoryBlock, MemoBlock } from '../../types';
import { CategoryArea } from '../categoryAreaUtils';

/**
 * 충돌 검사 결과 (카테고리 + 메모)
 */
export interface CollisionResult {
  updatedCategories: CategoryBlock[];
  updatedMemos: MemoBlock[];
}

/**
 * 메모 충돌 검사 결과
 */
export interface MemoCollisionResult {
  memos: MemoBlock[];
  blockedByArea: boolean; // 이동 중인 메모가 영역에 막혔는지
}

/**
 * 충돌 가능 객체 타입 (메모 또는 영역)
 */
export interface CollidableObject {
  id: string;
  type: 'memo' | 'area';
  parentId: string | null | undefined;
  bounds: CategoryArea;
  originalMemo?: MemoBlock;
  originalCategory?: CategoryBlock;
}
