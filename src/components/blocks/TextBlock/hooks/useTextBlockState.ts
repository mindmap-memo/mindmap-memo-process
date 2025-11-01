import { useState, useRef } from 'react';
import { ImportanceRange } from '../../../../types';

export const useTextBlockState = (initialContent: string, initialImportanceRanges?: ImportanceRange[]) => {
  const [content, setContent] = useState(initialContent);
  const [importanceRanges, setImportanceRanges] = useState<ImportanceRange[]>(initialImportanceRanges || []);
  const [isFocused, setIsFocused] = useState(false);
  const [showImportanceMenu, setShowImportanceMenu] = useState(false);
  const [importanceMenuPosition, setImportanceMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [backgroundKey, setBackgroundKey] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const readModeRef = useRef<HTMLDivElement>(null);
  const backgroundLayerRef = useRef<HTMLDivElement>(null);

  return {
    content,
    setContent,
    importanceRanges,
    setImportanceRanges,
    isFocused,
    setIsFocused,
    showImportanceMenu,
    setShowImportanceMenu,
    importanceMenuPosition,
    setImportanceMenuPosition,
    selectedRange,
    setSelectedRange,
    backgroundKey,
    setBackgroundKey,
    textareaRef,
    menuRef,
    readModeRef,
    backgroundLayerRef
  };
};
