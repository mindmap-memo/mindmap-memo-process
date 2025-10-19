import React, { useState } from 'react';
import styles from '../scss/components/Resizer.module.scss';

interface ResizerProps {
  onResize: (deltaX: number) => void;
  direction: 'left' | 'right';
}

const Resizer: React.FC<ResizerProps> = ({ onResize, direction }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = direction === 'left' ? e.movementX : -e.movementX;
      onResize(deltaX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [direction === 'left' ? 'right' : 'left']: -2,
        width: 4,
        cursor: 'col-resize',
        backgroundColor: 'transparent',
        zIndex: 1000
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    />
  );
};

export default Resizer;