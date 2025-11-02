'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Code from '@tiptap/extension-code';
import Strike from '@tiptap/extension-strike';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { ContentBlock, TextBlock, ImageBlock, FileBlock } from '../../types';
import { DocumentNode } from './extensions/DocumentNode';
import { TextBlockNode } from './extensions/TextBlockNode';
import { FileNode } from './extensions/FileNode';
import { ImageNode } from './extensions/ImageNode';
import { ImportanceMark } from './extensions/ImportanceMark';
import ImportanceToolbar from './ImportanceToolbar';
import styles from '../../scss/components/editor/TiptapEditor.module.scss';
import '../../scss/components/editor/TiptapEditor.global.css';

interface BlockEditorProps {
  initialBlocks?: ContentBlock[];
  onChange?: (blocks: ContentBlock[]) => void;
  placeholder?: string;
}

export default function BlockEditor({
  initialBlocks = [],
  onChange,
  placeholder = '텍스트를 입력하세요...',
}: BlockEditorProps) {

  // ContentBlocks를 TipTap JSON으로 변환
  const blocksToEditorContent = (blocks: ContentBlock[]) => {
    if (blocks.length === 0) {
      return {
        type: 'doc',
        content: [
          {
            type: 'textBlock',
            attrs: { id: Date.now().toString() },
            content: [],
          },
        ],
      };
    }

    return {
      type: 'doc',
      content: blocks.map(block => {
        if (block.type === 'text') {
          const textBlock = block as TextBlock;
          let textNodes: any[] = [];

          // [LINK:url:text] 마커와 줄바꿈(\n)을 파싱하여 실제 노드로 변환
          const parseContentWithMedia = (content: string, importanceRanges: any[] = []) => {
            const nodes: any[] = [];
            let currentPos = 0;

            // 링크 마커 정규식: [LINK:url:text]
            const linkRegex = /\[LINK:(.*?):(.*?)\]/g;
            let lastIndex = 0;
            let match;

            const processText = (text: string, startPos: number) => {
              if (!text) return;

              // 줄바꿈 처리
              const parts = text.split('\n');
              parts.forEach((part, idx) => {
                if (part) {
                  // 중요도 범위 확인
                  const relevantRanges = importanceRanges.filter(
                    (r: any) => r.start < startPos + part.length && r.end > startPos
                  );

                  if (relevantRanges.length > 0) {
                    // 중요도가 있는 경우 세분화
                    let partLastPos = 0;
                    relevantRanges.forEach((range: any) => {
                      const relStart = Math.max(0, range.start - startPos);
                      const relEnd = Math.min(part.length, range.end - startPos);

                      if (relStart > partLastPos) {
                        nodes.push({
                          type: 'text',
                          text: part.substring(partLastPos, relStart),
                        });
                      }

                      nodes.push({
                        type: 'text',
                        text: part.substring(relStart, relEnd),
                        marks: [{ type: 'importanceMark', attrs: { importance: range.level } }],
                      });

                      partLastPos = relEnd;
                    });

                    if (partLastPos < part.length) {
                      nodes.push({
                        type: 'text',
                        text: part.substring(partLastPos),
                      });
                    }
                  } else {
                    nodes.push({
                      type: 'text',
                      text: part,
                    });
                  }

                  startPos += part.length;
                }

                // 줄바꿈 추가 (마지막 부분 제외)
                if (idx < parts.length - 1) {
                  nodes.push({ type: 'hardBreak' });
                  startPos += 1;
                }
              });
            };

            while ((match = linkRegex.exec(content)) !== null) {
              // 마커 전 텍스트 처리
              const textBefore = content.substring(lastIndex, match.index);
              processText(textBefore, currentPos);
              currentPos += textBefore.length;

              // 링크 마커 처리
              nodes.push({
                type: 'text',
                text: match[2],
                marks: [{ type: 'link', attrs: { href: match[1] } }],
              });

              currentPos += match[0].length;
              lastIndex = linkRegex.lastIndex;
            }

            // 남은 텍스트 처리
            const remainingText = content.substring(lastIndex);
            processText(remainingText, currentPos);

            return nodes;
          };

          if (textBlock.content) {
            textNodes = parseContentWithMedia(textBlock.content, textBlock.importanceRanges);
          }

          return {
            type: 'textBlock',
            attrs: { id: textBlock.id },
            content: textNodes,
          };
        }
        // FileBlock 처리
        else if (block.type === 'file') {
          const fileBlock = block as FileBlock;
          return {
            type: 'fileNode',
            attrs: {
              fileName: fileBlock.fileName || fileBlock.name,
              fileSize: fileBlock.fileSize || fileBlock.size || 0,
              fileType: fileBlock.fileType || fileBlock.type_info || '',
              fileData: fileBlock.fileData || fileBlock.url,
              importance: fileBlock.importance || 'none',
            },
          };
        }
        // ImageBlock 처리
        else if (block.type === 'image') {
          const imageBlock = block as ImageBlock;
          return {
            type: 'imageNode',
            attrs: {
              src: imageBlock.src || imageBlock.url || '',
              alt: imageBlock.alt || '',
              importance: imageBlock.importance || 'none',
            },
          };
        }

        return null;
      }).filter((item): item is Exclude<typeof item, null> => item !== null),
    };
  };

  // TipTap JSON을 ContentBlocks로 변환
  const editorContentToBlocks = (doc: any): ContentBlock[] => {
    if (!doc || !doc.content) return [];

    return doc.content.map((node: any) => {
      // TextBlock 노드 처리
      if (node.type === 'textBlock') {
        let content = '';
        let currentPos = 0;
        const importanceRanges: Array<{ start: number; end: number; level: any }> = [];

        if (node.content) {
          node.content.forEach((child: any) => {
            // 텍스트 노드
            if (child.type === 'text') {
              const text = child.text || '';

              // 링크 마크 처리 - 링크가 있으면 [LINK:url:text] 형식으로 저장
              if (child.marks) {
                const linkMark = child.marks.find((m: any) => m.type === 'link');

                if (linkMark) {
                  const linkMarker = `[LINK:${linkMark.attrs?.href || ''}:${text}]`;
                  content += linkMarker;
                  currentPos += linkMarker.length;

                  // 중요도도 함께 있을 수 있음
                  const importanceMark = child.marks.find((m: any) =>
                    m.type === 'importanceMark' && m.attrs?.importance
                  );

                  if (importanceMark) {
                    importanceRanges.push({
                      start: currentPos - linkMarker.length,
                      end: currentPos,
                      level: importanceMark.attrs.importance
                    });
                  }
                  return;
                }

                // 중요도 마크 처리 (링크가 없는 경우)
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

              content += text;
              currentPos += text.length;
            }
            // 줄바꿈(hardBreak) 노드
            else if (child.type === 'hardBreak') {
              content += '\n';
              currentPos += 1;
            }
          });
        }

        const textBlock: TextBlock = {
          id: node.attrs?.id || Date.now().toString(),
          type: 'text',
          content,
        };

        if (importanceRanges.length > 0) {
          textBlock.importanceRanges = importanceRanges;
        }

        return textBlock;
      }
      // FileNode 처리
      else if (node.type === 'fileNode') {
        const fileBlock: FileBlock = {
          id: Date.now().toString() + Math.random(),
          type: 'file',
          url: node.attrs?.fileData || '',
          name: node.attrs?.fileName || '',
          size: node.attrs?.fileSize || 0,
          type_info: node.attrs?.fileType || '',
          fileName: node.attrs?.fileName || '',
          fileSize: node.attrs?.fileSize || 0,
          fileType: node.attrs?.fileType || '',
          fileData: node.attrs?.fileData || '',
          importance: node.attrs?.importance || 'none',
        };
        return fileBlock;
      }
      // ImageNode 처리
      else if (node.type === 'imageNode') {
        const imageBlock: ImageBlock = {
          id: Date.now().toString() + Math.random(),
          type: 'image',
          url: node.attrs?.src || '',
          src: node.attrs?.src || '',
          alt: node.attrs?.alt || '',
          importance: node.attrs?.importance || 'none',
        };
        return imageBlock;
      }

      return null;
    }).filter(Boolean) as ContentBlock[];
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      DocumentNode,
      TextBlockNode,
      FileNode,
      ImageNode,
      Text,
      Bold,
      Italic,
      Code,
      Strike,
      History,
      HardBreak,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Dropcursor.configure({
        color: '#3b82f6',
        width: 2,
      }),
      Gapcursor,
      ImportanceMark,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: blocksToEditorContent(initialBlocks),
    onUpdate: ({ editor }) => {
      if (onChange) {
        const blocks = editorContentToBlocks(editor.getJSON());
        onChange(blocks);
      }
    },
  });

  // 초기 블록 로드 (히스토리 초기화 방지)
  useEffect(() => {
    if (!editor) return;

    const content = blocksToEditorContent(initialBlocks);
    const currentContent = editor.getJSON();

    // 내용이 실제로 변경된 경우에만 업데이트 (무한 루프 방지)
    if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
      // requestAnimationFrame을 사용하여 React 렌더링 사이클 이후에 실행
      requestAnimationFrame(() => {
        editor.commands.setContent(content, false);
      });
    }
  }, [editor, initialBlocks]); // initialBlocks가 바뀔 때마다 에디터 내용 업데이트

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
