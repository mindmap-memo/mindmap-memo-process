import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from '../nodeviews/ImageNodeView';

export interface ImageAttributes {
  src: string;
  alt?: string;
  importance?: string;
}

export const ImageNode = Node.create({
  name: 'imageNode',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: '',
      },
      alt: {
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
        tag: 'div[data-type="image-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'image-node',
        'class': 'image-node',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
