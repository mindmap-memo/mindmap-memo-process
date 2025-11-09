import { Editor } from '@tiptap/react';
import { ContentBlock, TextBlock, ImageBlock, FileBlock, BookmarkBlock } from '../../../types';

/**
 * ContentBlock 배열을 TipTap HTML로 변환
 */
export function contentBlocksToHTML(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '<p></p>';
  }

  const htmlParts = blocks.map(block => {
    switch (block.type) {
      case 'text':
        return textBlockToHTML(block as TextBlock);
      case 'image':
        return imageBlockToHTML(block as ImageBlock);
      case 'file':
        return fileBlockToHTML(block as FileBlock);
      case 'bookmark':
        return bookmarkBlockToHTML(block as BookmarkBlock);
      default:
        return '<p></p>';
    }
  });

  return htmlParts.join('');
}

/**
 * TextBlock을 HTML로 변환 (중요도 포함)
 */
function textBlockToHTML(block: TextBlock): string {
  if (!block.content) {
    return '<p></p>';
  }

  // importanceRanges가 없거나 배열이 아니면 일반 paragraph
  if (!block.importanceRanges || !Array.isArray(block.importanceRanges) || block.importanceRanges.length === 0) {
    return `<p>${escapeHTML(block.content)}</p>`;
  }

  // importanceRanges를 위치순 정렬
  const sortedRanges = [...block.importanceRanges].sort((a, b) => a.start - b.start);

  let html = '<p>';
  let lastPos = 0;

  sortedRanges.forEach(range => {
    // 범위 이전 텍스트
    if (range.start > lastPos) {
      html += escapeHTML(block.content.substring(lastPos, range.start));
    }

    // 중요도가 있는 텍스트 (mark 태그 사용)
    const text = escapeHTML(block.content.substring(range.start, range.end));
    html += `<mark data-importance="${range.level}">${text}</mark>`;

    lastPos = range.end;
  });

  // 마지막 범위 이후 텍스트
  if (lastPos < block.content.length) {
    html += escapeHTML(block.content.substring(lastPos));
  }

  html += '</p>';
  return html;
}

/**
 * ImageBlock을 HTML로 변환
 */
function imageBlockToHTML(block: ImageBlock): string {
  const alt = block.alt ? escapeHTML(block.alt) : '';
  const caption = block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : '';
  const importance = block.importance ? ` data-importance="${block.importance}"` : '';

  return `<figure${importance}><img src="${block.url}" alt="${alt}" />${caption}</figure>`;
}

/**
 * FileBlock을 HTML로 변환 (커스텀 data 속성 사용)
 */
function fileBlockToHTML(block: FileBlock): string {
  const name = escapeHTML(block.name);
  const size = block.size || 0;
  const typeInfo = block.type_info || '';
  const importance = block.importance || '';

  return `<div class="file-block" data-file-url="${block.url}" data-file-name="${name}" data-file-size="${size}" data-file-type="${typeInfo}" data-importance="${importance}">📎 ${name}</div>`;
}

/**
 * BookmarkBlock을 HTML로 변환
 */
function bookmarkBlockToHTML(block: BookmarkBlock): string {
  const title = block.title ? escapeHTML(block.title) : block.url;
  const description = block.description ? escapeHTML(block.description) : '';
  const importance = block.importance || '';

  return `<div class="bookmark-block" data-bookmark-url="${block.url}" data-bookmark-title="${title}" data-bookmark-description="${description}" data-importance="${importance}">🔗 ${title}</div>`;
}

/**
 * TipTap HTML을 ContentBlock 배열로 변환
 */
export function htmlToContentBlocks(editor: Editor): ContentBlock[] {
  const json = editor.getJSON();
  const blocks: ContentBlock[] = [];

  if (!json.content) {
    return blocks;
  }

  json.content.forEach((node: any) => {
    const block = nodeToContentBlock(node);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * TipTap JSON 노드를 ContentBlock으로 변환
 */
function nodeToContentBlock(node: any): ContentBlock | null {
  switch (node.type) {
    case 'paragraph':
      return paragraphToTextBlock(node);
    case 'textBlock':
      return textBlockToTextBlock(node);
    case 'figure':
      return figureToImageBlock(node);
    case 'imageNode':
      return imageNodeToImageBlock(node);
    case 'fileNode':
      return fileNodeToFileBlock(node);
    default:
      // 기타 노드 타입은 텍스트로 변환
      if (node.content) {
        return paragraphToTextBlock(node);
      }
      return null;
  }
}

/**
 * Paragraph 노드를 TextBlock으로 변환
 */
function paragraphToTextBlock(node: any): TextBlock {
  let content = '';
  const importanceRanges: any[] = [];
  let currentPos = 0;

  if (node.content) {
    node.content.forEach((child: any) => {
      if (child.type === 'text') {
        const text = child.text || '';

        // mark에 importance가 있는지 확인
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

        content += text;
        currentPos += text.length;
      }
    });
  }

  return {
    id: Date.now().toString() + Math.random(),
    type: 'text',
    content,
    importanceRanges: importanceRanges.length > 0 ? importanceRanges : undefined
  };
}

/**
 * Figure 노드를 ImageBlock으로 변환
 */
function figureToImageBlock(node: any): ImageBlock | null {
  const img = node.content?.find((n: any) => n.type === 'image');
  if (!img) return null;

  const caption = node.content?.find((n: any) => n.type === 'figcaption');

  return {
    id: Date.now().toString() + Math.random(),
    type: 'image',
    url: img.attrs?.src || '',
    alt: img.attrs?.alt,
    caption: caption?.content?.[0]?.text,
    width: img.attrs?.width,
    importance: node.attrs?.['data-importance']
  };
}

/**
 * ImageNode를 ImageBlock으로 변환
 */
function imageNodeToImageBlock(node: any): ImageBlock | null {
  if (!node.attrs) return null;

  return {
    id: Date.now().toString() + Math.random(),
    type: 'image',
    url: node.attrs.src || '',
    alt: node.attrs.alt,
    caption: node.attrs.caption,
    width: node.attrs.width,
    importance: node.attrs.importance && node.attrs.importance !== 'none' ? node.attrs.importance : undefined
  };
}

/**
 * FileNode를 FileBlock으로 변환
 */
function fileNodeToFileBlock(node: any): FileBlock | null {
  if (!node.attrs) return null;

  return {
    id: Date.now().toString() + Math.random(),
    type: 'file',
    name: node.attrs.fileName || '',
    url: node.attrs.fileData || '',
    size: node.attrs.fileSize,
    type_info: node.attrs.fileType,
    importance: node.attrs.importance && node.attrs.importance !== 'none' ? node.attrs.importance : undefined
  };
}

/**
 * TextBlock 노드를 TextBlock으로 변환 (블록 레벨 importance 지원)
 */
function textBlockToTextBlock(node: any): TextBlock {
  let content = '';
  const importanceRanges: any[] = [];
  let currentPos = 0;

  if (node.content) {
    node.content.forEach((child: any) => {
      if (child.type === 'text') {
        const text = child.text || '';

        // mark에 importance가 있는지 확인
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

        content += text;
        currentPos += text.length;
      }
    });
  }

  return {
    id: node.attrs?.id || Date.now().toString() + Math.random(),
    type: 'text',
    content,
    importanceRanges: importanceRanges.length > 0 ? importanceRanges : undefined
  };
}

/**
 * HTML 이스케이프
 */
function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
