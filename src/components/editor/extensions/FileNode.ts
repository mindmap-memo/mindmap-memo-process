import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FileNodeView from '../nodeviews/FileNodeView';

export interface FileAttributes {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string; // base64 data
  importance?: string;
}

export const FileNode = Node.create({
  name: 'fileNode',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      fileName: {
        default: '',
      },
      fileSize: {
        default: 0,
      },
      fileType: {
        default: '',
      },
      fileData: {
        default: '',
      },
      importance: {
        default: 'none',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'file-node',
        'class': 'file-node',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView);
  },
});
