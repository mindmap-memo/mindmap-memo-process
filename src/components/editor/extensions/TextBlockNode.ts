import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
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

  atom: false,

  priority: 1000, // 매우 높은 우선순위 설정

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

  renderHTML({ node, HTMLAttributes }) {
    const isEmpty = node.content.size === 0;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'text-block',
        class: `text-block-node${isEmpty ? ' is-empty' : ''}`,
      }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Enter 키는 BlockEditor의 capture phase에서 처리됨
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
