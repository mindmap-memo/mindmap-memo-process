import { useCallback } from 'react';

/**
 * usePanelHandlers
 *
 * 패널 리사이즈 및 전체화면 토글 핸들러
 */

interface UsePanelHandlersProps {
  leftPanelWidth: number;
  setLeftPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  rightPanelWidth: number;
  setRightPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  isRightPanelFullscreen: boolean;
  setIsRightPanelFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const usePanelHandlers = (props: UsePanelHandlersProps) => {
  const {
    leftPanelWidth,
    setLeftPanelWidth,
    rightPanelWidth,
    setRightPanelWidth,
    isRightPanelFullscreen,
    setIsRightPanelFullscreen
  } = props;

  const handleLeftPanelResize = useCallback((deltaX: number) => {
    setLeftPanelWidth(prev => Math.max(200, Math.min(500, prev + deltaX)));
  }, [setLeftPanelWidth]);

  const handleRightPanelResize = useCallback((deltaX: number) => {
    setRightPanelWidth(prev => Math.max(250, Math.min(1200, prev + deltaX)));
  }, [setRightPanelWidth]);

  const toggleRightPanelFullscreen = useCallback(() => {
    setIsRightPanelFullscreen(prev => !prev);
  }, [setIsRightPanelFullscreen]);

  return {
    handleLeftPanelResize,
    handleRightPanelResize,
    toggleRightPanelFullscreen
  };
};
