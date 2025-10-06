import React, { useState, useEffect } from 'react';
import { SheetsBlock as SheetsBlockType, ContentBlock } from '../../types';
import { 
  parseSheetUrl, 
  getSheetData, 
  convertSheetDataToTable, 
  checkSheetAccess,
  isUserSignedIn,
  startRangeDetection,
  detectRangeFromClipboard
} from '../../utils/googleSheetsAPI';

interface SheetsBlockProps {
  block: SheetsBlockType;
  onUpdate?: (updatedBlock: ContentBlock) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onCreateTableBlock?: (tableData: { 
    headers: string[], 
    rows: string[][], 
    columns?: any[], 
    cells?: any[] 
  }) => void;
  onCreateNewBlock?: (afterBlockId: string, content: string) => void;
}

const SheetsBlock: React.FC<SheetsBlockProps> = ({
  block,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  onCreateTableBlock,
  onCreateNewBlock
}) => {
  const [isEditing, setIsEditing] = useState(!block.url);
  const [tempUrl, setTempUrl] = useState(block.url);
  const [tempTitle, setTempTitle] = useState(block.title || '');
  const [isIframeFocused, setIsIframeFocused] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractRange, setExtractRange] = useState('A1:Z1000'); // 기본 범위
  const [showRangeInput, setShowRangeInput] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [rangeStart, setRangeStart] = useState<{row: number, col: number} | null>(null);
  const [rangeEnd, setRangeEnd] = useState<{row: number, col: number} | null>(null);
  const [isListeningForRange, setIsListeningForRange] = useState(false);
  const [rangeDetectionStop, setRangeDetectionStop] = useState<(() => void) | null>(null);
  const [showRangeBuilder, setShowRangeBuilder] = useState(false);
  const [rangeBuilder, setRangeBuilder] = useState({
    startCol: 'A',
    startRow: '1',
    endCol: 'C',
    endRow: '10',
    sheetName: ''
  });
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // 컴포넌트 언마운트 시 범위 감지 정리
  useEffect(() => {
    return () => {
      if (rangeDetectionStop) {
        rangeDetectionStop();
      }
    };
  }, [rangeDetectionStop]);

  const convertToEmbedUrl = (url: string): string => {
    // 구글 시트 URL을 embed용 URL로 변환
    if (url.includes('docs.google.com/spreadsheets')) {
      const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        return `https://docs.google.com/spreadsheets/d/${matches[1]}/edit?usp=sharing&rm=minimal&widget=true&headers=false&chrome=false&gridlines=false`;
      }
    }
    return url;
  };

  // 범위 빌더에서 범위 문자열 생성
  const buildRangeString = () => {
    const { startCol, startRow, endCol, endRow, sheetName } = rangeBuilder;
    const range = `${startCol}${startRow}:${endCol}${endRow}`;
    return sheetName ? `${sheetName}!${range}` : range;
  };

  // 범위 빌더 적용
  const applyBuiltRange = () => {
    const newRange = buildRangeString();
    setExtractRange(newRange);
    setShowRangeBuilder(false);
  };

  // 범위 감지 시작/중지
  const toggleRangeDetection = async () => {
    if (isListeningForRange) {
      // 감지 중지
      if (rangeDetectionStop) {
        rangeDetectionStop();
        setRangeDetectionStop(null);
      }
      setIsListeningForRange(false);
    } else {
      // 감지 시작
      const sheetId = parseSheetUrl(block.url);
      if (!sheetId) {
        alert('올바른 구글 시트 URL이 필요합니다.');
        return;
      }

      if (!isUserSignedIn()) {
        alert('구글 계정에 로그인이 필요합니다.');
        return;
      }

      setIsListeningForRange(true);
      
      try {
        // 클립보드 기반 범위 감지 시작
        const stopFunction = await startRangeDetection(
          sheetId,
          (detectedRange: string, detectedData?: string) => {
            setExtractRange(detectedRange);
            // 자동으로 감지 중지하지 않고 계속 감지
          },
          1500 // 1.5초마다 확인
        );
        
        setRangeDetectionStop(() => stopFunction);
        
        // 사용자에게 안내 메시지
        setTimeout(() => {
          if (isListeningForRange) {
          }
        }, 500);
        
      } catch (error) {
        console.error('범위 감지 시작 실패:', error);
        setIsListeningForRange(false);
        alert('범위 감지를 시작할 수 없습니다.');
      }
    }
  };

  const handleSave = () => {
    if (!tempUrl.trim()) return;
    
    const embedUrl = convertToEmbedUrl(tempUrl.trim());
    if (onUpdate) {
      onUpdate({
        ...block,
        url: embedUrl,
        title: tempTitle.trim() || '구글 시트',
        width: block.width || 800,
        height: block.height || 400,
        zoom: block.zoom || 100
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!block.url && onDelete) {
      onDelete();
    } else {
      setTempUrl(block.url);
      setTempTitle(block.title || '');
      setIsEditing(false);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    if (onUpdate) {
      onUpdate({
        ...block,
        width: newWidth
      });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    if (onUpdate) {
      onUpdate({
        ...block,
        height: newHeight
      });
    }
  };

  const handleExtractData = async () => {
    if (!isUserSignedIn()) {
      alert('구글 계정에 로그인이 필요합니다.');
      return;
    }

    if (!block.url) {
      alert('먼저 구글 시트 URL을 입력해주세요.');
      return;
    }

    const sheetId = parseSheetUrl(block.url);
    if (!sheetId) {
      alert('올바른 구글 시트 URL이 아닙니다.');
      return;
    }

    setIsExtracting(true);
    
    try {
      // 시트 접근 권한 확인
      await checkSheetAccess(sheetId);
      
      // 데이터 가져오기 (범위 지정)
      const sheetData = await getSheetData(sheetId, extractRange);
      
      if (!sheetData) {
        alert('시트 데이터를 가져올 수 없습니다.');
        return;
      }

      // 테이블 데이터로 변환
      const tableData = convertSheetDataToTable(sheetData);
      
      // 새 테이블 블록 생성
      if (onCreateTableBlock) {
        onCreateTableBlock(tableData);
        alert('시트 데이터가 테이블 블록으로 생성되었습니다!');
      }
      
    } catch (error: any) {
      console.error('데이터 추출 실패:', error);
      alert(error.message || '데이터 추출 중 오류가 발생했습니다.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractAsText = async () => {
    if (!isUserSignedIn()) {
      alert('구글 계정에 로그인이 필요합니다.');
      return;
    }

    if (!block.url) {
      alert('먼저 구글 시트 URL을 입력해주세요.');
      return;
    }

    const sheetId = parseSheetUrl(block.url);
    if (!sheetId) {
      alert('올바른 구글 시트 URL이 아닙니다.');
      return;
    }

    setIsExtracting(true);
    
    try {
      // 시트 접근 권한 확인
      await checkSheetAccess(sheetId);
      
      // 지정된 범위의 데이터 가져오기
      const sheetData = await getSheetData(sheetId, extractRange);
      
      if (!sheetData || !sheetData.values) {
        alert('지정된 범위에서 데이터를 가져올 수 없습니다.');
        return;
      }

      // 데이터를 텍스트로 변환
      const textContent = sheetData.values.map(row => row.join('\t')).join('\n');
      
      // 텍스트 블록 생성
      if (onCreateNewBlock) {
        onCreateNewBlock(block.id, textContent);
        alert(`범위 ${extractRange}의 데이터가 텍스트 블록으로 생성되었습니다!`);
        setShowRangeInput(false); // 패널 닫기
      }
      
    } catch (error: any) {
      console.error('텍스트 추출 실패:', error);
      alert(error.message || '데이터 추출 중 오류가 발생했습니다.');
    } finally {
      setIsExtracting(false);
    }
  };

  // iframe 포커스 상태에 따른 스크롤 방지
  React.useEffect(() => {
    const handleWheel = (e: Event) => {
      if (isIframeFocused) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const handleMouseOver = () => setIsIframeFocused(true);
    const handleMouseOut = () => setIsIframeFocused(false);

    const iframeElement = iframeRef.current;
    if (iframeElement) {
      const container = iframeElement.parentElement;
      if (container) {
        // 컨테이너와 상위 요소들에 이벤트 리스너 추가
        container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        container.addEventListener('mouseover', handleMouseOver);
        container.addEventListener('mouseout', handleMouseOut);

        // 더 상위 컨테이너에도 이벤트 리스너 추가 (RightPanel)
        const rightPanelElement = container.closest('[style*="overflow"]') || container.closest('.right-panel') || document.querySelector('.right-panel');
        if (rightPanelElement && rightPanelElement !== container) {
          rightPanelElement.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        }

        return () => {
          container.removeEventListener('wheel', handleWheel, { capture: true });
          container.removeEventListener('mouseover', handleMouseOver);
          container.removeEventListener('mouseout', handleMouseOut);
          
          if (rightPanelElement && rightPanelElement !== container) {
            rightPanelElement.removeEventListener('wheel', handleWheel, { capture: true });
          }
        };
      }
    }
  }, [isIframeFocused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div
        onClick={onSelect}
        style={{
          margin: '8px 0',
          padding: '16px',
          border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: isSelected ? '#f0f9ff' : 'white',
          cursor: 'pointer'
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="구글 시트 제목 (선택사항)"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '8px'
            }}
          />
          <input
            type="url"
            placeholder="구글 시트 URL을 입력하세요"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
          <button
            onClick={handleSave}
            disabled={!tempUrl.trim()}
            style={{
              padding: '6px 12px',
              backgroundColor: tempUrl.trim() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: tempUrl.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            저장
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '8px',
          lineHeight: '1.4'
        }}>
          💡 구글 시트 링크를 공유용으로 설정해야 합니다. (링크가 있는 모든 사용자)
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      style={{
        margin: '8px 0',
        border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: isSelected ? '#f0f9ff' : 'white',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
    >
      {block.title && (
        <div style={{
          padding: '12px 16px 8px',
          borderBottom: '1px solid #e5e7eb',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📋</span>
          {block.title}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRangeInput(!showRangeInput);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#16a34a',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              범위 설정
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExtractData();
              }}
              disabled={isExtracting}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: isExtracting ? '#9ca3af' : '#16a34a',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isExtracting ? 'not-allowed' : 'pointer'
              }}
            >
              {isExtracting ? '추출 중...' : '데이터 추출'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              편집
            </button>
          </div>
        </div>
      )}
      
      {/* 크기 조정 컨트롤 */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
            <span>너비:</span>
            <input
              type="range"
              min="300"
              max="2000"
              value={block.width || 800}
              onChange={handleWidthChange}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '40px', textAlign: 'right' }}>{block.width || 800}px</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
            <span>높이:</span>
            <input
              type="range"
              min="200"
              max="1200"
              value={block.height || 400}
              onChange={handleHeightChange}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '40px', textAlign: 'right' }}>{block.height || 400}px</span>
          </div>
        </div>
      </div>
      
      <div 
        style={{
          position: 'relative',
          width: `${block.width || 800}px`,
          height: `${block.height || 400}px`,
          backgroundColor: '#f9fafb',
          overflow: 'hidden'
        }}
        onMouseEnter={() => setIsIframeFocused(true)}
        onMouseLeave={() => setIsIframeFocused(false)}
        onWheel={(e) => {
          // 추가적인 스크롤 방지 (React 이벤트 레벨에서)
          if (isIframeFocused) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <iframe
          ref={iframeRef}
          src={block.url}
          title={block.title || '구글 시트'}
          width={`${block.width || 800}px`}
          height={`${block.height || 400}px`}
          style={{
            border: 'none',
            display: 'block'
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      
      {/* 범위 설정 패널 */}
      {showRangeInput && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
            📊 데이터 추출 범위 설정
          </div>
          
          {/* 빠른 범위 선택 버튼들 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>빠른 선택:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '전체 (A1:Z1000)', value: 'A1:Z1000' },
                { label: '상위 10행 (A1:Z10)', value: 'A1:Z10' },
                { label: '첫 번째 열 (A:A)', value: 'A:A' },
                { label: '헤더만 (A1:Z1)', value: 'A1:Z1' },
                { label: 'A-E 열 (A:E)', value: 'A:E' },
                { label: '100행까지 (A1:Z100)', value: 'A1:Z100' }
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExtractRange(preset.value);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    backgroundColor: extractRange === preset.value ? '#e3f2fd' : 'white',
                    color: extractRange === preset.value ? '#1976d2' : '#666',
                    border: extractRange === preset.value ? '1px solid #90caf9' : '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 사용자 정의 범위 입력 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>사용자 정의 범위:</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={extractRange}
                onChange={(e) => setExtractRange(e.target.value)}
                onKeyDown={(e) => {
                  // 이벤트 전파 방지로 블록 삭제 방지
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    handleExtractAsText();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="예: A1:C10 또는 Sheet1!A1:B5"
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  flex: 1,
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRangeBuilder(!showRangeBuilder);
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  backgroundColor: showRangeBuilder ? '#e3f2fd' : '#f8f9fa',
                  color: showRangeBuilder ? '#1976d2' : '#666',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🛠 범위빌더
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRangeDetection();
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  backgroundColor: isListeningForRange ? '#fef3c7' : '#f8f9fa',
                  color: isListeningForRange ? '#d97706' : '#666',
                  border: isListeningForRange ? '1px solid #fbbf24' : '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🎯 {isListeningForRange ? '감지중...' : '범위감지'}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const result = await detectRangeFromClipboard();
                    if (result) {
                      setExtractRange(result.range);
                      alert(`클립보드에서 범위를 감지했습니다: ${result.range}`);
                    } else {
                      alert('클립보드에서 유효한 시트 데이터를 찾을 수 없습니다.\n\n구글 시트에서 범위를 선택하고 복사(Ctrl+C) 한 후 다시 시도해주세요.');
                    }
                  } catch (error) {
                    console.error('수동 범위 감지 실패:', error);
                    alert('클립보드를 읽을 수 없습니다. 브라우저 설정을 확인해주세요.');
                  }
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  backgroundColor: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                📋 지금확인
              </button>
            </div>
          </div>
          
          {/* 시각적 범위 빌더 */}
          {showRangeBuilder && (
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #93c5fd',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '8px', color: '#1e40af' }}>🛠 시각적 범위 빌더</div>
              
              {/* 시트 이름 (선택사항) */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', color: '#374151' }}>시트 이름 (선택사항):</label>
                <input
                  type="text"
                  value={rangeBuilder.sheetName}
                  onChange={(e) => setRangeBuilder({...rangeBuilder, sheetName: e.target.value})}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Sheet1, 데이터 등..."
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                />
              </div>
              
              {/* 범위 선택 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#374151' }}>시작 셀:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={rangeBuilder.startCol}
                      onChange={(e) => setRangeBuilder({...rangeBuilder, startCol: e.target.value.toUpperCase()})}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="A"
                      style={{
                        width: '40px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}
                    />
                    <input
                      type="number"
                      value={rangeBuilder.startRow}
                      onChange={(e) => setRangeBuilder({...rangeBuilder, startRow: e.target.value})}
                      onKeyDown={(e) => e.stopPropagation()}
                      min="1"
                      placeholder="1"
                      style={{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', padding: '0 8px' }}>:</div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#374151' }}>끝 셀:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={rangeBuilder.endCol}
                      onChange={(e) => setRangeBuilder({...rangeBuilder, endCol: e.target.value.toUpperCase()})}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="C"
                      style={{
                        width: '40px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}
                    />
                    <input
                      type="number"
                      value={rangeBuilder.endRow}
                      onChange={(e) => setRangeBuilder({...rangeBuilder, endRow: e.target.value})}
                      onKeyDown={(e) => e.stopPropagation()}
                      min="1"
                      placeholder="10"
                      style={{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* 미리보기 */}
              <div style={{
                padding: '6px 8px',
                backgroundColor: '#e0f2fe',
                border: '1px solid #84d3ff',
                borderRadius: '4px',
                marginBottom: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#0c4a6e'
              }}>
                미리보기: <strong>{buildRangeString()}</strong>
              </div>
              
              {/* 버튼들 */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    applyBuiltRange();
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  적용
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRangeBuilder(false);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
          
          {/* 범위 감지 안내 */}
          {isListeningForRange && (
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '8px', color: '#d97706', fontSize: '12px' }}>
                🎯 스마트 범위 감지 활성화됨!
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: '500', marginBottom: '4px', color: '#b45309' }}>📋 사용 방법 (3단계):</div>
                <div style={{ paddingLeft: '12px', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{ fontWeight: '500', color: '#92400e' }}>1단계:</span> 구글 시트에서 원하는 셀 범위를 <strong>드래그</strong>하여 선택
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{ fontWeight: '500', color: '#92400e' }}>2단계:</span> <strong>Ctrl+C</strong> (Mac: Cmd+C)로 선택한 범위 복사
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{ fontWeight: '500', color: '#92400e' }}>3단계:</span> 자동으로 범위가 감지되어 위 입력창에 설정됩니다
                  </div>
                </div>
              </div>

              <div style={{ 
                marginBottom: '10px', 
                padding: '6px 8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fed7aa',
                borderRadius: '4px',
                fontSize: '10px'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '3px', color: '#ea580c' }}>✨ 지원하는 데이터 형태:</div>
                <div style={{ color: '#9a3412', paddingLeft: '8px' }}>
                  • 탭으로 구분된 표 데이터 (가장 정확)
                  • 줄바꿈으로 구분된 목록
                  • 쉼표로 구분된 CSV 데이터
                  • 단일 셀 데이터
                </div>
              </div>
              
              <div style={{ 
                marginBottom: '8px', 
                padding: '6px 8px',
                backgroundColor: '#e0f2fe',
                border: '1px solid #81d4fa',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#01579b'
              }}>
                💡 <strong>Pro 팁:</strong> 구글 시트의 행/열 번호를 클릭하여 전체 행/열을 선택한 후 복사하면 더 넓은 범위도 자동 감지됩니다!
              </div>
              
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRangeDetection();
                  }}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  🛑 감지 중지
                </button>
              </div>
            </div>
          )}
          
          {/* 액션 버튼들 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExtractData();
              }}
              disabled={isExtracting}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: isExtracting ? '#9ca3af' : '#16a34a',
                backgroundColor: isExtracting ? 'transparent' : '#f0f9ff',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isExtracting ? 'not-allowed' : 'pointer'
              }}
            >
              📋 테이블로 변환
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExtractAsText();
              }}
              disabled={isExtracting}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: isExtracting ? '#9ca3af' : '#2563eb',
                backgroundColor: isExtracting ? 'transparent' : '#f8f9fa',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isExtracting ? 'not-allowed' : 'pointer'
              }}
            >
              📝 텍스트로 추출
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRangeInput(false);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
          
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
            💡 범위 형식: A1:C10 (A1셀부터 C10셀까지), A:C (A열부터 C열 전체), Sheet1!A1:B5 (특정 시트의 범위)
          </div>
        </div>
      )}
      
      {!block.title && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          구글 시트
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExtractData();
              }}
              disabled={isExtracting}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: isExtracting ? '#9ca3af' : '#16a34a',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: isExtracting ? 'not-allowed' : 'pointer'
              }}
            >
              {isExtracting ? '추출 중...' : '데이터 추출'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              편집
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetsBlock;