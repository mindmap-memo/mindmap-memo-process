import React from 'react';

interface UsePanelFileDropProps {
  onFileDrop: (file: File) => void;
  enabled: boolean;
}

export const usePanelFileDrop = ({ onFileDrop, enabled }: UsePanelFileDropProps) => {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    // 외부 파일만 허용 (내부 블록 드래그는 제외)
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasTipTapNode = e.dataTransfer.types.includes('application/x-tiptap-node-pos');

    if (hasFiles && !hasTipTapNode) {
      setIsDraggingOver(true);
    }
  }, [enabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    // 패널 밖으로 나갔을 때만 상태 변경
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingOver(false);
    }
  }, [enabled]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDraggingOver(false);

    // TipTap 내부 블록 드래그는 무시
    const hasTipTapNode = e.dataTransfer.types.includes('application/x-tiptap-node-pos');
    if (hasTipTapNode) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      files.forEach(file => onFileDrop(file));
    }
  }, [enabled, onFileDrop]);

  return {
    isDraggingOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
