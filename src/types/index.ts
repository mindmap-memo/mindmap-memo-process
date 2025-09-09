// Content Block Types
export type ContentBlockType = 
  | 'text'
  | 'callout'
  | 'checklist'
  | 'image'
  | 'file'
  | 'bookmark'
  | 'quote'
  | 'code'
  | 'table';

export interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
}

export interface TextBlock extends BaseContentBlock {
  type: 'text';
  content: string;
}

export interface CalloutBlock extends BaseContentBlock {
  type: 'callout';
  content: string;
  emoji?: string;
  color?: string;
}

export interface ChecklistBlock extends BaseContentBlock {
  type: 'checklist';
  items: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
}

export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  url: string;
  alt?: string;
  caption?: string;
}

export interface FileBlock extends BaseContentBlock {
  type: 'file';
  url: string;
  name: string;
  size?: number;
  type_info?: string;
}

export interface BookmarkBlock extends BaseContentBlock {
  type: 'bookmark';
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

export interface QuoteBlock extends BaseContentBlock {
  type: 'quote';
  content: string;
  author?: string;
}

export interface CodeBlock extends BaseContentBlock {
  type: 'code';
  content: string;
  language?: string;
}

export interface TableBlock extends BaseContentBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export type ContentBlock = 
  | TextBlock
  | CalloutBlock
  | ChecklistBlock
  | ImageBlock
  | FileBlock
  | BookmarkBlock
  | QuoteBlock
  | CodeBlock
  | TableBlock;

export interface MemoBlock {
  id: string;
  title: string;
  content: string; // 기존 호환성을 위해 유지
  blocks: ContentBlock[]; // 새로운 블록 기반 콘텐츠
  tags: string[];
  connections: string[];
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface Page {
  id: string;
  name: string;
  memos: MemoBlock[];
}

export interface AppState {
  pages: Page[];
  currentPageId: string;
  selectedMemoId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}