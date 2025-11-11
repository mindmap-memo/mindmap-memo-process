'use client';

import React, { useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImportanceLevel } from '../../../types';
import BlockContextMenu from '../BlockContextMenu';

export default function TextBlockNodeView({ node, selected, updateAttributes, deleteNode, getPos, editor }: NodeViewProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = React.useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 더블탭 감지를 위한 ref
  const lastTapTimeRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { importance } = node.attrs;

  // 네이티브 이벤트 리스너 등록
  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const handleNativeDragOver = (e: DragEvent) => {
      const hasNodeData = e.dataTransfer?.types.includes('application/x-tiptap-node-pos');
      if (hasNodeData) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      }
    };

    // 더블탭 이벤트 (touchend에서 감지)
    const handleNativeTouchEnd = (e: TouchEvent) => {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;

      // 300ms 이내에 두 번째 탭이 발생하면 더블탭으로 인식
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // 더블탭 감지 시 기본 동작 방지
        e.preventDefault();
        e.stopPropagation();

        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        // 에디터 포커스 해제 (Enter 키 처리 방지)
        if (editor) {
          editor.commands.blur();
        }

        // 블록 중요도 컨텍스트 메뉴 표시
        // 메뉴의 하단(중요도 제거 버튼)이 블록 위쪽에 오도록 배치
        let menuX: number;
        let menuBottomY: number; // 메뉴 하단이 와야 할 Y 위치

        // 블록의 DOM 요소 위치 가져오기
        const blockElement = wrapperRef.current;
        if (blockElement) {
          const blockRect = blockElement.getBoundingClientRect();
          const touch = e.changedTouches[0];

          // 메뉴 X는 터치 위치 (또는 블록 중앙)
          menuX = touch ? touch.clientX : blockRect.left + blockRect.width / 2;

          // 메뉴 하단이 블록 상단 위쪽 10px에 오도록
          menuBottomY = blockRect.top - 10;
        } else {
          // 폴백: 터치 위치 기준
          const touch = e.changedTouches[0];
          menuX = touch.clientX;
          menuBottomY = touch.clientY - 10;
        }

        // menuBottomY를 전달 (BlockContextMenu에서 transform으로 메뉴를 위로 올림)
        setContextMenu({ show: true, x: menuX, y: menuBottomY });

        lastTapTimeRef.current = 0; // 리셋
      } else {
        // 첫 번째 탭 기록
        lastTapTimeRef.current = currentTime;

        // 300ms 후 리셋
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(() => {
          lastTapTimeRef.current = 0;
        }, 300);
      }
    };

    // 캡처 단계에서 이벤트 가로채기
    wrapper.addEventListener('dragover', handleNativeDragOver, true);
    // touchend에서 더블탭 감지 (touchstart는 네이티브 동작 허용)
    content.addEventListener('touchend', handleNativeTouchEnd, { passive: false, capture: false });

    return () => {
      wrapper.removeEventListener('dragover', handleNativeDragOver, true);
      content.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [editor]);

  const handleContextMenu = (e: React.MouseEvent) => {
    // 모바일(터치) 환경에서는 네이티브 텍스트 선택 허용
    // @ts-ignore - nativeEvent의 sourceCapabilities 체크
    if (e.nativeEvent && e.nativeEvent.sourceCapabilities && e.nativeEvent.sourceCapabilities.firesTouchEvents) {
      return; // 모바일: 네이티브 동작 허용, ImportanceToolbar는 텍스트 선택 시 자동 표시
    }

    // PC에서만 커스텀 컨텍스트 메뉴 표시
    e.preventDefault();
    e.stopPropagation();

    // 메뉴의 하단이 우클릭 위치 위쪽 10px에 오도록
    const menuBottomY = e.clientY - 10;
    setContextMenu({ show: true, x: e.clientX, y: menuBottomY });
  };

  // 수동 드래그 구현
  const handleDragStart = (e: React.DragEvent) => {
    if (!editor || typeof getPos !== 'function') return;

    const pos = getPos();
    if (typeof pos !== 'number') return;

    // 드래그 데이터에 노드 위치와 JSON 저장
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-tiptap-node-pos', pos.toString());
    e.dataTransfer.setData('application/x-tiptap-node-type', node.type.name);
    e.dataTransfer.setData('application/x-tiptap-node-data', JSON.stringify(node.toJSON()));

    // 투명한 드래그 이미지로 브라우저 기본 커서 숨기기
    const transparentImg = document.createElement('img');
    transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(transparentImg, 0, 0);

    // body에 드래그 중 클래스 추가 (CSS 커서 제어)
    document.body.classList.add('dragging-tiptap-block');

    // 전역 네이티브 dragover 이벤트 리스너 등록 (최우선 처리)
    const globalDragOverHandler = (nativeEvent: DragEvent) => {
      nativeEvent.preventDefault();
      if (nativeEvent.dataTransfer) {
        nativeEvent.dataTransfer.dropEffect = 'move';
      }
    };

    // 캡처 단계에서 전역으로 등록
    document.addEventListener('dragover', globalDragOverHandler, true);

    // 드래그 종료 시 리스너 제거
    const cleanupListener = () => {
      document.removeEventListener('dragover', globalDragOverHandler, true);
      document.removeEventListener('dragend', cleanupListener);
      document.removeEventListener('drop', cleanupListener);
    };

    document.addEventListener('dragend', cleanupListener);
    document.addEventListener('drop', cleanupListener);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // body에서 드래그 중 클래스 제거
    document.body.classList.remove('dragging-tiptap-block');

    // 드래그 종료 시 에디터 강제 업데이트로 dropcursor 제거
    if (editor) {
      requestAnimationFrame(() => {
        editor.commands.focus();
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // 드롭 허용을 위한 preventDefault
    const hasNodeData = e.dataTransfer.types.includes('application/x-tiptap-node-pos');

    if (hasNodeData) {
      e.preventDefault();
      // stopPropagation 제거 - ProseMirror의 dropcursor가 작동하도록 함
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor || typeof getPos !== 'function') return;

    const draggedPosStr = e.dataTransfer.getData('application/x-tiptap-node-pos');
    const draggedNodeDataStr = e.dataTransfer.getData('application/x-tiptap-node-data');

    if (!draggedPosStr || !draggedNodeDataStr) return;

    const draggedPos = parseInt(draggedPosStr, 10);
    const dropPos = getPos();
    if (typeof dropPos !== 'number') return;

    if (draggedPos === dropPos) return;

    try {
      const { state } = editor;
      const draggedNode = state.doc.nodeAt(draggedPos);

      if (!draggedNode) return;

      // 마우스 Y 위치로 블록의 위/아래 판단
      const dropElement = e.currentTarget as HTMLElement;
      const rect = dropElement.getBoundingClientRect();
      const mouseY = e.clientY;
      const blockMiddle = rect.top + rect.height / 2;
      const isDropAbove = mouseY < blockMiddle;

      // 드롭 위치 계산
      let targetPos: number;

      if (isDropAbove) {
        // 블록 위쪽에 드롭
        targetPos = dropPos;
      } else {
        // 블록 아래쪽에 드롭
        targetPos = dropPos + node.nodeSize;
      }

      // 같은 블록 바로 아래로 드래그하는 경우 무시
      if (draggedPos + draggedNode.nodeSize === targetPos) return;

      // TipTap 명령으로 안전하게 이동
      editor.chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (!dispatch) return false;

          try {
            // 1. 드래그된 노드의 내용 복사
            const slice = state.doc.slice(draggedPos, draggedPos + draggedNode.nodeSize);

            // 2. 삭제 및 삽입 위치 계산
            let deleteFrom = draggedPos;
            let deleteTo = draggedPos + draggedNode.nodeSize;
            let insertAt = targetPos;

            // 위에서 아래로 이동: 먼저 삽입, 그 다음 삭제
            if (draggedPos < targetPos) {
              tr.insert(insertAt, slice.content);
              tr.delete(deleteFrom, deleteTo);
            }
            // 아래에서 위로 이동: 먼저 삭제, 그 다음 삽입
            else {
              tr.delete(deleteFrom, deleteTo);
              tr.insert(insertAt, slice.content);
            }

            return true;
          } catch (err) {
            console.error('❌ [Drop] 트랜잭션 에러:', err);
            return false;
          }
        })
        .run();

    } catch (error) {
      console.error('❌ [Drop] 전체 에러:', error);
    }
  };

  const handleDelete = () => {
    deleteNode();
  };

  const handleSetImportance = (level: ImportanceLevel) => {
    updateAttributes({ importance: level });

    // 블록 내의 모든 텍스트에 ImportanceMark 적용
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const from = pos + 1; // 블록 시작 위치
      const to = pos + node.nodeSize - 1; // 블록 끝 위치

      if (level === 'none') {
        // 중요도 제거
        editor.chain()
          .setTextSelection({ from, to })
          .unsetMark('importanceMark')
          .run();
      } else {
        // 중요도 적용
        editor.chain()
          .setTextSelection({ from, to })
          .setMark('importanceMark', { importance: level })
          .run();
      }
    }
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef as any}
      as="div"
      className="text-block-wrapper"
      data-importance={importance && importance !== 'none' ? importance : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      onDragOverCapture={handleDragOver}
      style={{
        display: 'block',
        position: 'relative',
        margin: '2px 0',
        padding: '2px',
        borderRadius: '2px',
        transition: 'background-color 0.1s ease',
        minHeight: '24px',
        backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
      }}
    >
      <BlockContextMenu
        show={contextMenu.show}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onDelete={handleDelete}
        onSetImportance={handleSetImportance}
        onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
        currentImportance={importance as ImportanceLevel}
      />
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        onDragOverCapture={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 드래그 핸들 */}
        <div
          ref={dragHandleRef}
          contentEditable={false}
          draggable="true"
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            cursor: 'grab',
            padding: '2px 4px',
            opacity: isHovered ? 1 : 0.3,
            transition: 'opacity 0.1s ease',
            fontSize: '14px',
            color: '#9ca3af',
            lineHeight: '1',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: 0,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            // 드래그 시작 전 커서 설정
            e.currentTarget.style.cursor = 'grabbing';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.cursor = 'grab';
          }}
        >
          ⋮⋮
        </div>

        {/* 에디터 콘텐츠 */}
        <NodeViewContent
          ref={contentRef}
          as="div"
          style={{
            flex: 1,
            minWidth: 0,
            outline: 'none',
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}
