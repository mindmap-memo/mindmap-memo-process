-- 기존 app_data를 평탄한 구조로 재구성

UPDATE users
SET app_data = (
  SELECT jsonb_build_object(
    'pages', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name
          )
        )
        FROM pages p
        WHERE p.user_id = users.id OR p.user_id IS NULL
      ),
      '[]'::jsonb
    ),
    'memos', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'pageId', m.page_id,
            'title', m.title,
            'content', '',
            'blocks', m.blocks,
            'tags', m.tags,
            'connections', m.connections,
            'position', jsonb_build_object('x', m.position_x, 'y', m.position_y),
            'size', CASE
              WHEN m.width IS NOT NULL AND m.height IS NOT NULL
              THEN jsonb_build_object('width', m.width, 'height', m.height)
              ELSE NULL
            END,
            'displaySize', COALESCE(m.display_size, 'medium'),
            'importance', m.importance,
            'parentId', m.parent_id
          )
        )
        FROM memos m
        WHERE m.user_id = users.id OR m.user_id IS NULL
      ),
      '[]'::jsonb
    ),
    'categories', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'pageId', c.page_id,
            'title', c.title,
            'tags', c.tags,
            'connections', c.connections,
            'position', jsonb_build_object('x', c.position_x, 'y', c.position_y),
            'originalPosition', CASE
              WHEN c.original_position_x IS NOT NULL AND c.original_position_y IS NOT NULL
              THEN jsonb_build_object('x', c.original_position_x, 'y', c.original_position_y)
              ELSE NULL
            END,
            'size', CASE
              WHEN c.width IS NOT NULL AND c.height IS NOT NULL
              THEN jsonb_build_object('width', c.width, 'height', c.height)
              ELSE NULL
            END,
            'isExpanded', COALESCE(c.is_expanded, true),
            'children', c.children,
            'parentId', c.parent_id
          )
        )
        FROM categories c
        WHERE c.user_id = users.id OR c.user_id IS NULL
      ),
      '[]'::jsonb
    ),
    'quickNavItems', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', q.id,
            'name', q.title,
            'targetId', q.target_id,
            'targetType', q.type,
            'pageId', q.page_id
          )
        )
        FROM quick_nav_items q
        WHERE q.user_id = users.id OR q.user_id IS NULL
      ),
      '[]'::jsonb
    )
  )
)
WHERE EXISTS (
  SELECT 1 FROM pages WHERE user_id = users.id OR user_id IS NULL
);
