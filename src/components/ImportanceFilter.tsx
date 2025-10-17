import React from 'react';
import { ImportanceLevel } from '../types';

// 중요도 레벨별 형광펜 스타일 정의
const getImportanceStyle = (level: ImportanceLevel) => {
  switch (level) {
    case 'critical':
      return { backgroundColor: '#ffcdd2', color: '#000' };
    case 'important':
      return { backgroundColor: '#ffcc80', color: '#000' };
    case 'opinion':
      return { backgroundColor: '#e1bee7', color: '#000' };
    case 'reference':
      return { backgroundColor: '#81d4fa', color: '#000' };
    case 'question':
      return { backgroundColor: '#fff59d', color: '#000' };
    case 'idea':
      return { backgroundColor: '#c8e6c9', color: '#000' };
    case 'data':
      return { backgroundColor: '#bdbdbd', color: '#000' };
    default:
      return {};
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
}

const ImportanceFilter: React.FC<ImportanceFilterProps> = ({
  activeFilters,
  onToggleFilter,
  showGeneralContent,
  onToggleGeneralContent
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const importanceLevels: Exclude<ImportanceLevel, 'none'>[] = [
    'critical', 'important', 'opinion', 'reference', 'question', 'idea', 'data'
  ];

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
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        minWidth: isCollapsed ? 'auto' : '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: isCollapsed ? '0' : '8px',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>중요도 필터</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
          style={{
            padding: '2px 6px',
            fontSize: '12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
        {importanceLevels.map(level => {
          const isActive = activeFilters.has(level);
          const style = getImportanceStyle(level);

          return (
            <label
              key={level}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => onToggleFilter(level)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                fontSize: '13px',
                color: '#4b5563'
              }}>
                {IMPORTANCE_LABELS[level]}
              </span>
              <div style={{
                width: '20px',
                height: '12px',
                backgroundColor: style.backgroundColor,
                borderRadius: '2px',
                border: '1px solid #e5e7eb'
              }} />
            </label>
          );
        })}

        {/* 일반 내용 필터 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
            backgroundColor: showGeneralContent ? '#f3f4f6' : 'transparent',
            transition: 'background-color 0.2s',
            borderTop: '1px solid #e5e7eb',
            marginTop: '8px',
            paddingTop: '8px'
          }}
          onMouseEnter={(e) => {
            if (!showGeneralContent) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            if (!showGeneralContent) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <input
            type="checkbox"
            checked={showGeneralContent}
            onChange={onToggleGeneralContent}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          <span style={{
            fontSize: '13px',
            color: '#4b5563'
          }}>
            ⚪ 일반 내용
          </span>
          <div style={{
            width: '20px',
            height: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '2px',
            border: '1px solid #e5e7eb'
          }} />
        </label>
      </div>

      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onClick={() => {
            importanceLevels.forEach(level => {
              if (!activeFilters.has(level)) {
                onToggleFilter(level);
              }
            });
          }}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          전체 선택
        </button>
        <button
          onClick={() => {
            importanceLevels.forEach(level => {
              if (activeFilters.has(level)) {
                onToggleFilter(level);
              }
            });
          }}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151'
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