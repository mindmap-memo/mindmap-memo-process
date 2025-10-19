import { Page, MemoBlock, CategoryBlock, QuickNavItem } from '../types';

// API base URL
const API_BASE = '/api';

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// ===== Pages API =====

export async function fetchPages(): Promise<Page[]> {
  const response = await fetch(`${API_BASE}/pages`);
  const data = await handleResponse<{ pages: any[] }>(response);

  return data.pages.map((p) => ({
    id: p.id,
    name: p.name,
    memos: [],
    categories: [],
  }));
}

export async function createPage(name: string): Promise<Page> {
  const response = await fetch(`${API_BASE}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await handleResponse<{ page: any }>(response);

  return {
    id: data.page.id,
    name: data.page.name,
    memos: [],
    categories: [],
  };
}

export async function updatePage(id: string, name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  await handleResponse(response);
}

export async function deletePage(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/pages/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

// ===== Memos API =====

export async function fetchMemos(pageId: string): Promise<MemoBlock[]> {
  const response = await fetch(`${API_BASE}/memos?pageId=${pageId}`);
  const data = await handleResponse<{ memos: any[] }>(response);

  return data.memos;
}

export async function createMemo(memo: Partial<MemoBlock> & { pageId: string }): Promise<MemoBlock> {
  const response = await fetch(`${API_BASE}/memos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memo),
  });
  const data = await handleResponse<{ memo: MemoBlock }>(response);

  return data.memo;
}

export async function updateMemo(id: string, updates: Partial<MemoBlock>): Promise<void> {
  const response = await fetch(`${API_BASE}/memos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await handleResponse(response);
}

export async function deleteMemo(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/memos/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

// ===== Categories API =====

export async function fetchCategories(pageId: string): Promise<CategoryBlock[]> {
  const response = await fetch(`${API_BASE}/categories?pageId=${pageId}`);
  const data = await handleResponse<{ categories: any[] }>(response);

  return data.categories;
}

export async function createCategory(category: Partial<CategoryBlock> & { pageId: string }): Promise<CategoryBlock> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  const data = await handleResponse<{ category: CategoryBlock }>(response);

  return data.category;
}

export async function updateCategory(id: string, updates: Partial<CategoryBlock>): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await handleResponse(response);
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

// ===== Quick Nav API =====

export async function fetchQuickNavItems(): Promise<QuickNavItem[]> {
  const response = await fetch(`${API_BASE}/quick-nav`);
  const data = await handleResponse<{ items: QuickNavItem[] }>(response);

  return data.items;
}

export async function createQuickNavItem(item: Omit<QuickNavItem, 'id'>): Promise<QuickNavItem> {
  const response = await fetch(`${API_BASE}/quick-nav`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await handleResponse<{ item: QuickNavItem }>(response);

  return data.item;
}

export async function deleteQuickNavItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/quick-nav/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(response);
}

// ===== Sync utility =====

/**
 * Load all data for a specific page from the database
 */
export async function loadPageData(pageId: string): Promise<{
  memos: MemoBlock[];
  categories: CategoryBlock[];
}> {
  const [memos, categories] = await Promise.all([
    fetchMemos(pageId),
    fetchCategories(pageId),
  ]);

  return { memos, categories };
}

/**
 * Initialize app with all pages and data
 */
export async function initializeApp(): Promise<{
  pages: Page[];
  quickNavItems: QuickNavItem[];
}> {
  const [pages, quickNavItems] = await Promise.all([
    fetchPages(),
    fetchQuickNavItems(),
  ]);

  return { pages, quickNavItems };
}
