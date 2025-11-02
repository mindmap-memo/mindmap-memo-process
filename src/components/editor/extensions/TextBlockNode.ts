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
        // Enter 키로 새 블록 생성하고 커서 뒤 텍스트 이동
        const { state, view } = editor;
        const { $from } = state.selection;

        // 현재 노드가 textBlock인 경우에만 처리
        if ($from.parent.type.name !== 'textBlock') {
          return false;
        }

        // 현재 블록의 시작과 끝 위치
        const blockStart = $from.before();
        const blockEnd = $from.after();
        const cursorPos = $from.pos;

        // 커서 앞뒤 텍스트 분리
        const textBefore = state.doc.textBetween($from.start(), cursorPos, '\n');
        const textAfter = state.doc.textBetween(cursorPos, $from.end(), '\n');

        // 트랜잭션 생성
        const tr = state.tr;

        // 1. 현재 블록을 커서 앞 텍스트로 교체
        const beforeNode = state.schema.nodes.textBlock.create(
          $from.parent.attrs,
          textBefore ? state.schema.text(textBefore) : undefined
        );

        // 2. 새 블록을 커서 뒤 텍스트로 생성
        const afterNode = state.schema.nodes.textBlock.create(
          { id: Date.now().toString() },
          textAfter ? state.schema.text(textAfter) : undefined
        );

        // 3. 현재 블록 위치에 두 블록을 모두 교체
        tr.replaceWith(blockStart, blockEnd, [beforeNode, afterNode]);

        // 4. 새 블록의 시작 위치로 커서 이동
        const newCursorPos = blockStart + beforeNode.nodeSize + 1;
        tr.setSelection(TextSelection.near(tr.doc.resolve(newCursorPos)));

        // 트랜잭션 적용
        view.dispatch(tr);

        return true;
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
