/**
 * 충돌 검사 유틸리티 배럴 파일 (Barrel Export)
 *
 * 모든 충돌 검사 함수와 타입을 한 곳에서 export
 */

// 타입 정의
export type { CollisionResult, MemoCollisionResult, CollidableObject } from './types';

// 통합 충돌 검사
export { resolveUnifiedCollisions } from './unified';

// 영역 충돌 검사
export { resolveAreaCollisions } from './area';

// 메모 충돌 검사
export { resolveMemoCollisions, checkMemoAreaCollision } from './memo';

// 계층적 충돌 검사
export {
  resolveHierarchicalCollisions,
  resolveSiblingMemoCollisions,
  resolveMemoChildAreaCollisions
} from './hierarchical';
