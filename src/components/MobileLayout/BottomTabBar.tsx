'use client';

import { FileText, Map, Edit3 } from 'lucide-react';
import { MobileView } from './hooks/useMobileLayout';
import styles from '../../scss/components/MobileLayout/BottomTabBar.module.scss';

interface BottomTabBarProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
}

/**
 * BottomTabBar
 *
 * 모바일 하단 탭 네비게이션 컴포넌트
 * - Pages, Canvas, Editor 뷰 전환
 * - 최소 터치 영역 44px 확보
 */
export const BottomTabBar = ({ activeView, onViewChange }: BottomTabBarProps) => {
  return (
    <nav className={styles.bottomTabBar}>
      <button
        className={`${styles.tab} ${activeView === 'pages' ? styles.active : ''}`}
        onClick={() => onViewChange('pages')}
        aria-label="Pages"
      >
        <FileText size={24} />
        <span>Pages</span>
      </button>

      <button
        className={`${styles.tab} ${activeView === 'canvas' ? styles.active : ''}`}
        onClick={() => onViewChange('canvas')}
        aria-label="Canvas"
      >
        <Map size={24} />
        <span>Canvas</span>
      </button>

      <button
        className={`${styles.tab} ${activeView === 'editor' ? styles.active : ''}`}
        onClick={() => onViewChange('editor')}
        aria-label="Editor"
      >
        <Edit3 size={24} />
        <span>Edit</span>
      </button>
    </nav>
  );
};
