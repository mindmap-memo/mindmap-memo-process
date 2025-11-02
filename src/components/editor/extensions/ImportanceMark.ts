import { Mark } from '@tiptap/core';
import { ImportanceLevel } from '../../../types';

export interface ImportanceMarkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    importanceMark: {
      setImportance: (level: ImportanceLevel) => ReturnType;
      unsetImportance: () => ReturnType;
      toggleImportance: (level: ImportanceLevel) => ReturnType;
    };
  }
}

export const ImportanceMark = Mark.create<ImportanceMarkOptions>({
  name: 'importanceMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      importance: {
        default: null,
        parseHTML: element => element.getAttribute('data-importance'),
        renderHTML: attributes => {
          if (!attributes.importance) {
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
        tag: 'mark[data-importance]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setImportance:
        (level: ImportanceLevel) =>
        ({ commands }) => {
          return commands.setMark(this.name, { importance: level });
        },
      unsetImportance:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      toggleImportance:
        (level: ImportanceLevel) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { importance: level });
        },
    };
  },
});
