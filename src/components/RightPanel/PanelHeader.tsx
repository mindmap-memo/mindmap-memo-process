import React from 'react';
import { X, Maximize2, ChevronRight, ChevronLeft } from 'lucide-react';
import { ImportanceLevel } from '../../types';
import { isDefaultFilterState } from './utils/blockUtils';

interface PanelHeaderProps {
  isFullscreen: boolean;
  onToggleFullscreen?: () => void;
  activeImportanceFilters?: Set<ImportanceLevel>;
  showGeneralContent?: boolean;
  onResetFilters?: () => void;
  onClose?: () => void;
  isTablet?: boolean;
  isTabletCollapsed?: boolean;
  onToggleTabletCollapse?: () => void;
}

/**
 * RightPanel 헤더 컴포넌트
 *
 * 메모 편집 제목, 필터링 해제 버튼, 전체화면 토글 버튼을 표시합니다.
 */
const PanelHeader: React.FC<PanelHeaderProps> = ({
  isFullscreen,
  onToggleFullscreen,
  activeImportanceFilters,
  showGeneralContent,
  onResetFilters,
  onClose,
  isTablet = false,
  isTabletCollapsed = false,
  onToggleTabletCollapse
}) => {
  return (
    <div style={{
      padding: '16px',
      borderBottom: '1px solid #e1e5e9',
      backgroundColor: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            title="닫기"
          >
            <X size={20} />
          </button>
        )}
        <h2 style={{
          margin: '0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          메모 편집
        </h2>

        {/* 필터링 해제 버튼 - 기본 상태가 아닐 때만 표시 */}
        {!isDefaultFilterState(activeImportanceFilters, showGeneralContent) && (
          <button
            onClick={() => onResetFilters && onResetFilters()}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            📝 필터링 해제 후 편집
          </button>
        )}
      </div>

      {/* 태블릿 모드 버튼들 */}
      {isTablet && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 전체화면 버튼 */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              style={{
                padding: '8px',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="전체화면"
            >
              <Maximize2 size={16} />
            </button>
          )}

          {/* 접기/펼치기 버튼 */}
          {onToggleTabletCollapse && (
            <button
              onClick={onToggleTabletCollapse}
              style={{
                padding: '8px',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#6b7280';
              }}
              title={isTabletCollapsed ? "패널 펼치기" : "패널 접기"}
            >
              {isTabletCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      )}

      {/* PC 모드 전체화면 버튼 - 모바일/태블릿에서는 숨김 */}
      {onToggleFullscreen && !onClose && !isTablet && (
        <button
          onClick={onToggleFullscreen}
          style={{
            padding: '8px',
            border: '1px solid #e1e5e9',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#6b7280',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.color = '#6b7280';
          }}
          title={isFullscreen ? "전체화면 종료" : "전체화면"}
        >
          {isFullscreen ? '◧' : '⛶'}
        </button>
      )}
    </div>
  );
};

export default PanelHeader;
