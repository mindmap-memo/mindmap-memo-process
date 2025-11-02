'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { ContentBlock } from '../../types';
import { contentBlocksToHTML, htmlToContentBlocks } from './utils/tiptapConverter';
import { ImportanceMark } from './extensions/ImportanceMark';
import ImportanceToolbar from './ImportanceToolbar';
import styles from '../../scss/components/editor/TiptapEditor.module.scss';
import '../../scss/components/editor/TiptapEditor.global.css';

interface TiptapEditorProps {
  initialBlocks?: ContentBlock[];
  onChange?: (blocks: ContentBlock[]) => void;
  placeholder?: string;
}

export default function TiptapEditor({
  initialBlocks = [],
  onChange,
  placeholder = '텍스트를 입력하세요...',
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
      ImportanceMark,
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const blocks = htmlToContentBlocks(editor);
        onChange(blocks);
      }
    },
  });

  // 초기 블록 로드 (한 번만)
  useEffect(() => {
    if (!editor) return;

    if (initialBlocks && initialBlocks.length > 0) {
      const html = contentBlocksToHTML(initialBlocks);
      editor.commands.setContent(html);
    }
  }, [editor]); // editor가 생성될 때만 실행

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container}>
      <EditorContent editor={editor} />
      <ImportanceToolbar editor={editor} />
    </div>
  );
}
