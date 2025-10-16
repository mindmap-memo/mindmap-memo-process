import { useState, useRef, useCallback, useEffect } from 'react';
import React from 'react';
import { clearCollisionDirections } from '../utils/categoryAreaUtils';

/**
 * useDragState
 *
 * 드래그 앤 드롭 관련 상태와 캐시를 관리하는 커스텀 훅입니다.
 *
 * **관리하는 상태:**
 * - 카테고리 영역 캐시 (드래그 중 영역 크기 고정)
 * - 드래그 시작 시 메모/카테고리 위치 캐시
 * - Shift 드래그 영역 캐시
 * - 충돌 검사 타이머 및 디바운스
 * - 드래그 안정화 타이머
 * - 카테고리 위치 업데이트 타이머
 *
 * **주요 기능:**
 * - `clearCategoryCache`: 특정 카테고리의 모든 캐시 제거
 * - 드래그 종료 시 캐시 정리로 메모리 누수 방지
 *
 * @returns 드래그 상태, ref, 캐시 관리 함수
 *
 * @example
 * ```tsx
 * const {
 *   draggedCategoryAreas,
 *   setDraggedCategoryAreas,
 *   clearCategoryCache,
 *   dragStartMemoPositions
 * } = useDragState();
 *
 * // 드래그 시작 시 위치 저장
 * dragStartMemoPositions.current.set(pageId, new Map(memoPositions));
 *
 * // 드래그 종료 시 캐시 제거
 * clearCategoryCache(categoryId);
 * ```
 */
export const useDragState = () => {
  // ===== 카테고리 영역 캐시 =====
  /**
   * 드래그 중인 카테고리의 영역 캐시
   * - 드래그 중에는 영역 크기가 변하지 않도록 고정
   * - 드래그 종료 시 캐시 제거하여 자연스럽게 크기 조정
   * - ref로 변경: state 업데이트 비동기성 문제 해결
   */
  const draggedCategoryAreas = useRef<{
    [categoryId: string]: {
      area: any;
      originalPosition: { x: number; y: number };
    };
  }>({});

  /**
   * Shift 드래그 중 영역 캐시
   * - Shift+드래그로 카테고리에 아이템 추가 시 영역 크기 고정
   */
  const shiftDragAreaCache = useRef<{ [categoryId: string]: any }>({});

  /**
   * Shift 드롭으로 처리된 메모 추적
   * - 중복 처리 방지
   */
  const shiftDropProcessedMemos = useRef<Set<string>>(new Set());

  // ===== 드래그 시작 위치 캐시 =====
  /**
   * 드래그 시작 시 메모들의 원래 위치 저장
   * - Map<pageId, Map<memoId, position>>
   * - Shift+드래그 종료 시 원래 위치로 복원용
   */
  const dragStartMemoPositions = useRef<Map<string, Map<string, { x: number; y: number }>>>(
    new Map()
  );

  /**
   * 드래그 시작 시 하위 카테고리들의 원래 위치 저장
   * - Map<pageId, Map<categoryId, position>>
   * - 카테고리 드래그 시 하위 카테고리도 함께 이동
   */
  const dragStartCategoryPositions = useRef<Map<string, Map<string, { x: number; y: number }>>>(
    new Map()
  );

  // ===== 드래그 안정화 타이머 =====
  /**
   * 빠른 드래그 안정화를 위한 상태
   * - 마지막 드래그 시간 및 위치 추적
   * - 카테고리 진입/퇴출 타이머 관리
   */
  const lastDragTime = useRef<Map<string, number>>(new Map());
  const lastDragPosition = useRef<Map<string, { x: number; y: number }>>(new Map());
  const categoryExitTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ===== 충돌 검사 디바운스 =====
  /**
   * 충돌 검사 디바운스를 위한 상태
   * - 과도한 충돌 검사 방지
   */
  const collisionCheckTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCollisionCheck = useRef<Map<string, number>>(new Map());
  const collisionCheckCount = useRef<Map<string, number>>(new Map());

  // ===== 카테고리 위치 업데이트 타이머 =====
  /**
   * 카테고리 위치 업데이트 히스토리 타이머
   * - 위치 업데이트 디바운싱용
   */
  const categoryPositionTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ===== 프레임 간 위치 추적 =====
  /**
   * 이전 프레임 위치 저장 (프레임 간 delta 계산용)
   */
  const previousFramePosition = useRef<Map<string, { x: number; y: number }>>(new Map());

  /**
   * 캐시 생성 추적 (동기적으로)
   */
  const cacheCreationStarted = useRef<Set<string>>(new Set());

  // ===== 캐시 제거 함수 =====
  /**
   * 특정 카테고리의 모든 캐시를 제거합니다.
   *
   * **제거 대상:**
   * - 드래그 영역 캐시
   * - 메모 위치 캐시
   * - 카테고리 위치 캐시
   * - 충돌 방향 맵
   *
   * @param categoryId - 캐시를 제거할 카테고리 ID
   */
  const clearCategoryCache = useCallback((categoryId: string) => {
    delete draggedCategoryAreas.current[categoryId];
    dragStartMemoPositions.current.delete(categoryId);
    dragStartCategoryPositions.current.delete(categoryId);
    clearCollisionDirections(); // 충돌 방향 맵 초기화
  }, []);

  // ===== 컴포넌트 언마운트 시 타이머 정리 =====
  useEffect(() => {
    return () => {
      // 모든 카테고리 종료 타이머 정리
      categoryExitTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryExitTimers.current.clear();

      // 카테고리 위치 업데이트 타이머 정리
      categoryPositionTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      categoryPositionTimers.current.clear();

      // 충돌 검사 타이머 정리
      collisionCheckTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      collisionCheckTimers.current.clear();
    };
  }, []);

  return {
    // 영역 캐시
    draggedCategoryAreas,
    shiftDragAreaCache,
    shiftDropProcessedMemos,

    // 위치 캐시
    dragStartMemoPositions,
    dragStartCategoryPositions,

    // 드래그 안정화
    lastDragTime,
    lastDragPosition,
    categoryExitTimers,

    // 충돌 검사
    collisionCheckTimers,
    lastCollisionCheck,
    collisionCheckCount,

    // 카테고리 위치 업데이트
    categoryPositionTimers,
    previousFramePosition,
    cacheCreationStarted,

    // 유틸리티 함수
    clearCategoryCache
  };
};
