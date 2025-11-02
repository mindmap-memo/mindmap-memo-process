UPDATE pages
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

UPDATE memos
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

UPDATE categories
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

UPDATE quick_nav_items
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;
