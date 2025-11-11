import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from '../scss/components/QuickNavModal.module.scss';

interface QuickNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  initialName?: string;
}

const QuickNavModal: React.FC<QuickNavModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialName = ''
}) => {
  const [name, setName] = useState(initialName);

  // initialName이 변경될 때마다 name 업데이트
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Portal을 사용하여 document.body에 직접 렌더링
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          minWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          즐겨찾기 설정
        </h3>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="즐겨찾기 이름을 입력하세요"
          autoFocus
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: name.trim() ? '#8b5cf6' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = '#7c3aed';
              }
            }}
            onMouseOut={(e) => {
              if (name.trim()) {
                e.currentTarget.style.backgroundColor = '#8b5cf6';
              }
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickNavModal;
