export interface MemoBlock {
  id: string;
  title: string;
  content: string;
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