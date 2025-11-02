'use client';

import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Plus, Image as ImageIcon, Link as LinkIcon, Paperclip } from 'lucide-react';

interface MediaToolbarProps {
  editor: Editor;
}

export default function MediaToolbar({ editor }: MediaToolbarProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeInput, setActiveInput] = useState<'image' | 'link' | 'file' | null>(null);
  const [inputValue, setInputValue] = useState('');

  React.useEffect(() => {
    const updatePosition = () => {
      const { state } = editor;
      const { from, to } = state.selection;

      // 커서가 있는 위치 (선택이 없을 때)
      if (from === to) {
        const coords = editor.view.coordsAtPos(from);
        setPosition({
          top: coords.bottom + 5,
          left: coords.left,
        });
      } else {
        setShow(false);
      }
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      if (url) {
        // 새로운 imageNode 블록 삽입
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // 현재 블록이 textBlock인지 확인
        if ($from.parent.type.name === 'textBlock') {
          const insertPos = $from.after();
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, {
              type: 'imageNode',
              attrs: { src: url },
            })
            .focus(insertPos + 1)
            .run();
        } else {
          // 문서 끝에 삽입
          const endPos = state.doc.content.size;
          editor
            .chain()
            .focus()
            .insertContentAt(endPos, {
              type: 'imageNode',
              attrs: { src: url },
            })
            .run();
        }

        setShow(false);
        setActiveInput(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = () => {
    if (inputValue) {
      // 새로운 imageNode 블록 삽입
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 현재 블록이 textBlock인지 확인
      if ($from.parent.type.name === 'textBlock') {
        const insertPos = $from.after();
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'imageNode',
            attrs: { src: inputValue },
          })
          .focus(insertPos + 1)
          .run();
      } else {
        // 문서 끝에 삽입
        const endPos = state.doc.content.size;
        editor
          .chain()
          .focus()
          .insertContentAt(endPos, {
            type: 'imageNode',
            attrs: { src: inputValue },
          })
          .run();
      }

      setInputValue('');
      setShow(false);
      setActiveInput(null);
    }
  };

  const handleLinkUrl = () => {
    if (inputValue) {
      // 새로운 textBlock 생성 후 링크 삽입
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 현재 블록이 textBlock인지 확인
      if ($from.parent.type.name === 'textBlock') {
        const insertPos = $from.after();
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'textBlock',
            attrs: { id: Date.now().toString() },
            content: [
              {
                type: 'text',
                text: inputValue,
                marks: [
                  {
                    type: 'link',
                    attrs: { href: inputValue },
                  },
                ],
              },
            ],
          })
          .focus(insertPos + 1)
          .run();
      } else {
        // 문서 끝에 삽입
        const endPos = state.doc.content.size;
        editor
          .chain()
          .focus()
          .insertContentAt(endPos, {
            type: 'textBlock',
            attrs: { id: Date.now().toString() },
            content: [
              {
                type: 'text',
                text: inputValue,
                marks: [
                  {
                    type: 'link',
                    attrs: { href: inputValue },
                  },
                ],
              },
            ],
          })
          .run();
      }

      setInputValue('');
      setShow(false);
      setActiveInput(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      if (fileData) {
        // 새로운 fileNode 블록 삽입
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // 현재 블록이 textBlock인지 확인
        if ($from.parent.type.name === 'textBlock') {
          const insertPos = $from.after();
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, {
              type: 'fileNode',
              attrs: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData,
              },
            })
            .focus(insertPos + 1)
            .run();
        } else {
          // 문서 끝에 삽입
          const endPos = state.doc.content.size;
          editor
            .chain()
            .focus()
            .insertContentAt(endPos, {
              type: 'fileNode',
              attrs: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                fileData: fileData,
              },
            })
            .run();
        }

        setShow(false);
        setActiveInput(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShow(!show)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
        }}
      >
        <Plus size={20} />
      </button>

      {/* Media menu */}
      {show && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            zIndex: 1001,
            minWidth: '200px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Image buttons */}
            {!activeInput && (
              <>
                <button
                  onClick={() => setActiveInput('image')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ImageIcon size={16} />
                  이미지
                </button>

                <button
                  onClick={() => setActiveInput('link')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LinkIcon size={16} />
                  링크
                </button>

                <label
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Paperclip size={16} />
                  파일
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </>
            )}

            {/* Image input */}
            {activeInput === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="이미지 URL 입력"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImageUrl();
                    if (e.key === 'Escape') {
                      setActiveInput(null);
                      setInputValue('');
                    }
                  }}
                  autoFocus
                  style={{
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={handleImageUrl}
                    style={{
                      flex: 1,
                      padding: '6px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    확인
                  </button>
                  <label
                    style={{
                      flex: 1,
                      padding: '6px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    업로드
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setActiveInput(null);
                      setInputValue('');
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* Link input */}
            {activeInput === 'link' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="URL 입력"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkUrl();
                    if (e.key === 'Escape') {
                      setActiveInput(null);
                      setInputValue('');
                    }
                  }}
                  autoFocus
                  style={{
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={handleLinkUrl}
                    style={{
                      flex: 1,
                      padding: '6px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    확인
                  </button>
                  <button
                    onClick={() => {
                      setActiveInput(null);
                      setInputValue('');
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
