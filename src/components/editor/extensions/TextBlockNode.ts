import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TextBlockNodeView from '../nodeviews/TextBlockNodeView';

export interface TextBlockAttributes {
  id: string;
  importance?: string;
}

export const TextBlockNode = Node.create({
  name: 'textBlock',

  group: 'block',

  content: 'inline*',

  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      importance: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-importance'),
        renderHTML: attributes => {
          if (!attributes.importance || attributes.importance === 'none') {
            return {};
          }
          return {
            'data-importance': attributes.importance,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="text-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'text-block',
        class: 'text-block-node',
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Shift-Enter': ({ editor }) => {
        // Shift+Enter로 같은 블록 내에서 줄바꿈 (하드 브레이크)
        return editor.commands.setHardBreak();
      },

      Enter: ({ editor }) => {
        // Enter 키로 새 블록 생성
        const { $from } = editor.state.selection;

        // 현재 노드가 textBlock인 경우에만 처리
        if ($from.parent.type.name !== 'textBlock') {
          return false;
        }

        // 새 텍스트 블록 삽입
        return editor
          .chain()
          .insertContentAt($from.after(), {
            type: 'textBlock',
            attrs: { id: Date.now().toString() },
          })
          .focus($from.after() + 1)
          .run();
      },

      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;

        // 현재 노드가 textBlock이고, 커서가 맨 앞에 있고, 선택이 없을 때
        if (
          $from.parent.type.name !== 'textBlock' ||
          $from.parentOffset !== 0 ||
          !empty
        ) {
          return false;
        }

        // 첫 번째 블록이면 삭제하지 않음
        if ($from.before() === 1) {
          return true;
        }

        // 이전 블록과 병합
        const prevNodePos = $from.before() - 1;

        // 위치가 유효하지 않으면 처리하지 않음
        if (prevNodePos < 0) {
          return true;
        }

        const prevNode = editor.state.doc.resolve(prevNodePos).nodeBefore;

        if (prevNode && prevNode.type.name === 'textBlock') {
          // 이전 블록이 텍스트 블록이면 병합
          return editor
            .chain()
            .deleteNode('textBlock')
            .focus(prevNodePos)
            .run();
        }

        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TextBlockNodeView);
  },
});
