-- 레거시 테이블 삭제 스크립트
-- 이 테이블들은 memos와 categories 테이블의 JSONB 컬럼으로 통합되었습니다.

-- 1. 현재 존재하는 모든 테이블 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. 불필요한 테이블 삭제
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS memo_tags CASCADE;
DROP TABLE IF EXISTS memo_connections CASCADE;
DROP TABLE IF EXISTS category_tags CASCADE;
DROP TABLE IF EXISTS category_connections CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;

-- 3. 삭제 후 다시 확인 (남아야 할 테이블: pages, memos, categories, quick_nav_items, analytics_*)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
