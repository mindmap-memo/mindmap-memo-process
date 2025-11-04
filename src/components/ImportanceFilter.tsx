import React from 'react';
import { ImportanceLevel } from '../types';
import styles from '../scss/components/ImportanceFilter.module.scss';

// 중요도 레벨별 형광펜 스타일 정의
const getImportanceStyle = (level: ImportanceLevel) => {
  switch (level) {
    case 'critical':
      return '#ffcdd2';
    case 'important':
      return '#ffcc80';
    case 'opinion':
      return '#e1bee7';
    case 'reference':
      return '#81d4fa';
    case 'question':
      return '#fff59d';
    case 'idea':
      return '#c8e6c9';
    case 'data':
      return '#bdbdbd';
    default:
      return '#f3f4f6';
  }
};

const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  critical: '🔴 매우중요',
  important: '🟠 중요',
  opinion: '🟣 의견',
  reference: '🔵 참고',
  question: '🟡 질문',
  idea: '🟢 아이디어',
  data: '⚫ 데이터',
  none: '없음'
};

interface ImportanceFilterProps {
  activeFilters: Set<ImportanceLevel>;
  onToggleFilter: (level: ImportanceLevel) => void;
  showGeneralContent: boolean;
  onToggleGeneralContent: () => void;
  isMobile?: boolean;
}

const ImportanceFilter: React.FC<ImportanceFilterProps> = ({
  activeFilters,
  onToggleFilter,
  showGeneralContent,
  onToggleGeneralContent,
  isMobile = false
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const importanceLevels: Exclude<ImportanceLevel, 'none'>[] = [
    'critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'
  ];

  // 모바일에서는 드래그 기능 비활성화
  if (isMobile) {
    return (
      <div className={styles.mobileFilter}>
        <div className={styles.mobileHeader}>
          <span>중요도 필터</span>
        </div>

        <div className={styles.mobileContent}>
          {importanceLevels.map(level => {
            const isActive = activeFilters?.has(level) || false;
            const bgColor = getImportanceStyle(level);
            const label = IMPORTANCE_LABELS[level].replace(/^.{2}\s/, ''); // 이모지 제거

            return (
              <div
                key={level}
                className={styles.mobileItem}
                onClick={() => onToggleFilter(level)}
                style={{
                  backgroundColor: isActive ? bgColor : 'transparent',
                  opacity: isActive ? 0.9 : 1,
                }}
              >
                <span style={{ color: isActive ? '#000' : '#374151' }}>{label}</span>
                <div
                  className={styles.mobileColorSwatch}
                  style={{ backgroundColor: bgColor }}
                />
              </div>
            );
          })}

          {/* 일반 내용 필터 */}
          <div
            className={styles.mobileItem}
            onClick={onToggleGeneralContent}
            style={{
              backgroundColor: showGeneralContent ? '#f3f4f6' : 'transparent',
              opacity: showGeneralContent ? 0.9 : 1,
            }}
          >
            <span style={{ color: showGeneralContent ? '#000' : '#374151' }}>일반 내용</span>
            <div
              className={styles.mobileColorSwatch}
              style={{ backgroundColor: '#f3f4f6' }}
            />
          </div>
        </div>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // 체크박스나 버튼 클릭 시에는 드래그하지 않음
    if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div
      data-tutorial="importance-filter"
      onMouseDown={handleMouseDown}
      className={`${styles.filter} ${isDragging ? styles.dragging : ''} ${isCollapsed ? styles.collapsed : ''}`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`
      }}
    >
      <div className={styles.header}>
        <span>중요도 필터</span>
        <button
          className={styles.toggleButton}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className={styles.content}>
        {importanceLevels.map(level => {
          const isActive = activeFilters?.has(level) || false;
          const bgColor = getImportanceStyle(level);

          return (
            <label
              key={level}
              className={`${styles.item} ${isActive ? styles.active : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => onToggleFilter(level)}
              />
              <span>
                {IMPORTANCE_LABELS[level]}
              </span>
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: bgColor }}
              />
            </label>
          );
        })}

        {/* 일반 내용 필터 */}
        <label
          className={`${styles.item} ${styles.generalItem} ${showGeneralContent ? styles.active : ''}`}
        >
          <input
            type="checkbox"
            checked={showGeneralContent}
            onChange={onToggleGeneralContent}
          />
          <span>
            ⚪ 일반 내용
          </span>
          <div
            className={styles.colorSwatch}
            style={{ backgroundColor: '#f3f4f6' }}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => {
            importanceLevels.forEach(level => {
              if (!activeFilters.has(level)) {
                onToggleFilter(level);
              }
            });
          }}
        >
          전체 선택
        </button>
        <button
          className={styles.actionButton}
          onClick={() => {
            importanceLevels.forEach(level => {
              if (activeFilters.has(level)) {
                onToggleFilter(level);
              }
            });
          }}
        >
          전체 해제
        </button>
      </div>
        </>
      )}
    </div>
  );
};

export default ImportanceFilter;