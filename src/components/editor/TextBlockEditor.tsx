'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextBlock, ImportanceLevel } from '../../types';
import { ImportanceMark } from './extensions/ImportanceMark';
import ImportanceToolbar from './ImportanceToolbar';
import '../../scss/components/editor/TiptapEditor.global.css';

interface TextBlockEditorProps {
  block: TextBlock;
  onUpdate: (block: TextBlock) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onFocusUp: () => void;
  onFocusDown: () => void;
  autoFocus?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export default function TextBlockEditor({
  block,
  onUpdate,
  onEnter,
  onBackspaceAtStart,
  onFocusUp,
  onFocusDown,
  autoFocus = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false
}: TextBlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      StarterKit.configure({
        // paragraph만 사용, 나머지는 비활성화
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: '텍스트를 입력하세요...',
      }),
      ImportanceMark,
    ],
    content: block.content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'single-block-editor',
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;

        // Enter 키: 새 블록 생성
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onEnter();
          return true;
        }

        // Backspace at start: 이전 블록과 병합
        if (event.key === 'Backspace' && $from.pos === 1 && selection.empty) {
          event.preventDefault();
          onBackspaceAtStart();
          return true;
        }

        // ArrowUp at start: 이전 블록으로 포커스
        if (event.key === 'ArrowUp' && $from.pos === 1) {
          onFocusUp();
          return true;
        }

        // ArrowDown at end: 다음 블록으로 포커스
        if (event.key === 'ArrowDown') {
          const doc = state.doc;
          const isAtEnd = $from.pos === doc.content.size - 1;
          if (isAtEnd) {
            onFocusDown();
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const json = editor.getJSON();

      // importanceRanges 추출
      const importanceRanges: Array<{ start: number; end: number; level: ImportanceLevel }> = [];
      let currentPos = 0;

      if (json.content && json.content[0]?.content) {
        json.content[0].content.forEach((child: any) => {
          if (child.type === 'text') {
            const text = child.text || '';

            if (child.marks) {
              const importanceMark = child.marks.find((m: any) =>
                m.type === 'importanceMark' && m.attrs?.importance
              );

              if (importanceMark) {
                importanceRanges.push({
                  start: currentPos,
                  end: currentPos + text.length,
                  level: importanceMark.attrs.importance
                });
              }
            }

            currentPos += text.length;
          }
        });
      }

      onUpdate({
        ...block,
        content: text,
        importanceRanges: importanceRanges.length > 0 ? importanceRanges : undefined
      });
    },
  });

  // 초기 콘텐츠 로드
  useEffect(() => {
    if (!editor) return;

    // importanceRanges를 HTML로 변환
    if (block.importanceRanges && block.importanceRanges.length > 0) {
      const sortedRanges = [...block.importanceRanges].sort((a, b) => a.start - b.start);
      let html = '<p>';
      let lastPos = 0;

      sortedRanges.forEach(range => {
        if (range.start > lastPos) {
          html += block.content.substring(lastPos, range.start);
        }
        const text = block.content.substring(range.start, range.end);
        html += `<mark data-importance="${range.level}">${text}</mark>`;
        lastPos = range.end;
      });

      if (lastPos < block.content.length) {
        html += block.content.substring(lastPos);
      }

      html += '</p>';
      editor.commands.setContent(html);
    } else {
      editor.commands.setContent(`<p>${block.content || ''}</p>`);
    }
  }, [editor]); // editor가 생성될 때만 실행

  // Auto focus
  useEffect(() => {
    if (autoFocus && editor) {
      setTimeout(() => {
        editor.commands.focus('end');
      }, 50);
    }
  }, [autoFocus, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={editorRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        margin: '0',
        padding: '1px 2px',
        borderRadius: '2px',
        position: 'relative',
        transition: 'background-color 0.1s ease, opacity 0.2s ease',
        minHeight: '20px',
        opacity: isDragging ? 0.4 : 1,
        borderTop: isDragOver ? '2px solid #3b82f6' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
        }
        const handle = e.currentTarget.querySelector('.drag-handle') as HTMLElement;
        if (handle) handle.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        const handle = e.currentTarget.querySelector('.drag-handle') as HTMLElement;
        if (handle) handle.style.opacity = '0';
      }}
    >
      {/* 드래그 핸들 */}
      <div
        className="drag-handle"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: '0 2px',
          opacity: 0,
          transition: 'opacity 0.1s ease',
          fontSize: '14px',
          color: '#9ca3af',
          lineHeight: '1.2',
          userSelect: 'none',
        }}
      >
        ⋮⋮
      </div>

      {/* 에디터 영역 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <EditorContent editor={editor} />
      </div>

      <ImportanceToolbar editor={editor} />
    </div>
  );
}
