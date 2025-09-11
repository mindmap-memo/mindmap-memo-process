import React from 'react';
import { Page } from '../types';
import MemoBlock from './MemoBlock';

interface CanvasProps {
  currentPage: Page | undefined;
  selectedMemoId: string | null;
  selectedMemoIds: string[];
  onMemoSelect: (memoId: string, isShiftClick?: boolean) => void;
  onAddMemo: (position?: { x: number; y: number }) => void;
  onDeleteMemo: () => void;
  onDisconnectMemo: () => void;
  onMemoPositionChange: (memoId: string, position: { x: number; y: number }) => void;
  onMemoSizeChange: (memoId: string, size: { width: number; height: number }) => void;
  isConnecting: boolean;
  isDisconnectMode: boolean;
  connectingFromId: string | null;
  dragLineEnd: { x: number; y: number } | null;
  onStartConnection: (memoId: string) => void;
  onConnectMemos: (fromId: string, toId: string) => void;
  onCancelConnection: () => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
  onUpdateDragLine: (mousePos: { x: number; y: number }) => void;
  isDragSelecting: boolean;
  dragSelectStart: { x: number; y: number } | null;
  dragSelectEnd: { x: number; y: number } | null;
  dragHoveredMemoIds: string[];
  onDragSelectStart: (position: { x: number; y: number }, isShiftPressed: boolean) => void;
  onDragSelectMove: (position: { x: number; y: number }) => void;
  onDragSelectEnd: () => void;
}

const Canvas: React.FC<CanvasProps> = ({
  currentPage,
  selectedMemoId,
  selectedMemoIds,
  onMemoSelect,
  onAddMemo,
  onDeleteMemo,
  onDisconnectMemo,
  onMemoPositionChange,
  onMemoSizeChange,
  isConnecting,
  isDisconnectMode,
  connectingFromId,
  dragLineEnd,
  onStartConnection,
  onConnectMemos,
  onCancelConnection,
  onRemoveConnection,
  onUpdateDragLine,
  isDragSelecting,
  dragSelectStart,
  dragSelectEnd,
  dragHoveredMemoIds,
  onDragSelectStart,
  onDragSelectMove,
  onDragSelectEnd
}) => {
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = React.useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = React.useState(1);
  const [currentTool, setCurrentTool] = React.useState<'select' | 'pan' | 'zoom'>('select');
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isAltPressed, setIsAltPressed] = React.useState(false);
  const [baseTool, setBaseTool] = React.useState<'select' | 'pan' | 'zoom'>('select');
  const [isMouseOverCanvas, setIsMouseOverCanvas] = React.useState(false);
  
  // 캔버스 최대 영역 (15000x15000px, SVG와 동일)
  const CANVAS_BOUNDS = { width: 15000, height: 15000, offsetX: -5000, offsetY: -5000 };

  // 메모 블록이 경계를 벗어나지 않도록 제한하는 함수
  const constrainToBounds = (position: { x: number; y: number }, memoSize: { width: number; height: number }) => {
    const { width, height, offsetX, offsetY } = CANVAS_BOUNDS;
    const memoWidth = memoSize.width || 200;
    const memoHeight = memoSize.height || 95;
    
    return {
      x: Math.max(offsetX, Math.min(position.x, offsetX + width - memoWidth)),
      y: Math.max(offsetY, Math.min(position.y, offsetY + height - memoHeight))
    };
  };

  // 경계 체크를 포함한 메모 위치 변경 핸들러
  const handleMemoPositionChange = (memoId: string, position: { x: number; y: number }) => {
    const memo = currentPage?.memos.find(m => m.id === memoId);
    if (memo) {
      const constrainedPosition = constrainToBounds(position, memo.size || { width: 200, height: 95 });
      onMemoPositionChange(memoId, constrainedPosition);
    } else {
      onMemoPositionChange(memoId, position);
    }
  };

  const getConnectionPoints = (memo: any) => {
    // 실제 메모 블록의 크기를 가져오기 (동적 크기 반영)
    const width = memo.size?.width || 200;
    const height = memo.size?.height || 95;
    
    // SVG가 overflow:visible이므로 오프셋 없이 원본 좌표 사용
    const points = {
      top: { 
        x: memo.position.x + width / 2,  // 가로 중앙
        y: memo.position.y  // 메모 블록 상단 경계
      },
      bottom: { 
        x: memo.position.x + width / 2,  // 가로 중앙
        y: memo.position.y + height  // 메모 블록 하단 경계
      },
      left: { 
        x: memo.position.x,  // 메모 블록 좌측 경계
        y: memo.position.y + height / 2  // 세로 중앙
      },
      right: { 
        x: memo.position.x + width,  // 메모 블록 우측 경계
        y: memo.position.y + height / 2  // 세로 중앙
      }
    };
    
    // 디버그: 연결점 위치 출력
    if (memo.id.includes('1')) {  // 첫 번째 메모만 출력
      console.log(`Memo ${memo.id} connection points:`, {
        position: memo.position,
        size: { width, height },
        points
      });
    }
    
    return points;
  };

  const renderConnectionLines = () => {
    if (!currentPage) return null;
    
    const lines: any[] = [];
    
    // 기존 연결선들
    currentPage.memos.forEach(memo => {
      memo.connections.forEach(connId => {
        const connectedMemo = currentPage.memos.find(m => m.id === connId);
        if (!connectedMemo || memo.id >= connId) return;
        
        // 최신 크기 정보로 연결점 계산
        const fromPoints = getConnectionPoints(memo);
        const toPoints = getConnectionPoints(connectedMemo);
        
        const fromWidth = memo.size?.width || 200;
        const fromHeight = memo.size?.height || 95;
        const toWidth = connectedMemo.size?.width || 200;
        const toHeight = connectedMemo.size?.height || 95;
        
        // 원본 메모 좌표로 중심점 계산
        const centerFrom = { 
          x: memo.position.x + fromWidth / 2, 
          y: memo.position.y + fromHeight / 2 
        };
        const centerTo = { 
          x: connectedMemo.position.x + toWidth / 2, 
          y: connectedMemo.position.y + toHeight / 2 
        };
        
        const dx = centerTo.x - centerFrom.x;
        const dy = centerTo.y - centerFrom.y;
        
        let fromPoint, toPoint;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            fromPoint = fromPoints.right;
            toPoint = toPoints.left;
          } else {
            fromPoint = fromPoints.left;
            toPoint = toPoints.right;
          }
        } else {
          if (dy > 0) {
            fromPoint = fromPoints.bottom;
            toPoint = toPoints.top;
          } else {
            fromPoint = fromPoints.top;
            toPoint = toPoints.bottom;
          }
        }
        
        lines.push(
          <g key={`${memo.id}-${connId}`}>
            {/* 투명한 넓은 클릭 영역 */}
            {isDisconnectMode && (
              <line
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{ 
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Removing connection:', memo.id, 'to', connId);
                  onRemoveConnection(memo.id, connId);
                }}
              />
            )}
            {/* 실제 보이는 연결선 */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isDisconnectMode ? "#ef4444" : "#9ca3af"}
              strokeWidth={isDisconnectMode ? "4" : "2"}
              style={{ 
                strokeDasharray: isDisconnectMode ? '5,5' : '4,4',
                pointerEvents: 'none'
              }}
            />
          </g>
        );
      });
    });

    // 드래그 중인 라인 추가
    if (isConnecting && connectingFromId && dragLineEnd) {
      const connectingMemo = currentPage.memos.find(m => m.id === connectingFromId);
      if (connectingMemo) {
        const fromPoints = getConnectionPoints(connectingMemo);
        
        const connectingWidth = connectingMemo.size?.width || 200;
        const connectingHeight = connectingMemo.size?.height || 95;
        
        // 원본 메모 좌표로 중심점 계산
        const centerFrom = { 
          x: connectingMemo.position.x + connectingWidth / 2, 
          y: connectingMemo.position.y + connectingHeight / 2 
        };
        // dragLineEnd를 원본 좌표로 변환
        const dx = dragLineEnd.x - centerFrom.x;
        const dy = dragLineEnd.y - centerFrom.y;
        
        let fromPoint;
        if (Math.abs(dx) > Math.abs(dy)) {
          fromPoint = dx > 0 ? fromPoints.right : fromPoints.left;
        } else {
          fromPoint = dy > 0 ? fromPoints.bottom : fromPoints.top;
        }
        
        const dragLine = (
          <line
            key="drag-line"
            x1={fromPoint.x}
            y1={fromPoint.y}
            x2={dragLineEnd.x}
            y2={dragLineEnd.y}
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="6,4"
            style={{
              animation: 'dash 1s linear infinite'
            }}
          />
        );
        lines.push(dragLine);
      }
    }

    return lines;
  };
  // 전역 드래그 선택을 위한 상태
  const [globalDragSelecting, setGlobalDragSelecting] = React.useState(false);
  const [globalDragStart, setGlobalDragStart] = React.useState({ x: 0, y: 0 });
  const [globalDragWithShift, setGlobalDragWithShift] = React.useState(false);
  const [dragThresholdMet, setDragThresholdMet] = React.useState(false);
  const [justFinishedDragSelection, setJustFinishedDragSelection] = React.useState(false);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    console.log('Canvas mouse down:', { 
      isSpacePressed, 
      currentTool, 
      target: e.target,
      currentTarget: e.currentTarget,
      targetTagName: (e.target as Element).tagName,
      isConnecting 
    });
    
    const target = e.target as Element;
    
    // 스페이스바가 눌린 상태에서는 항상 팬 모드 (메모 블록 위에서도)
    if (isSpacePressed && !isConnecting) {
      console.log('Starting pan mode (space key priority)');
      setIsPanning(true);
      setPanStart({
        x: e.clientX - canvasOffset.x,
        y: e.clientY - canvasOffset.y
      });
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // 캔버스 배경 영역에서만 팬 도구 활성화
    const isCanvasBackground = target.hasAttribute('data-canvas') ||
                              target.tagName === 'svg' ||
                              target.tagName === 'line' ||
                              (target.tagName === 'DIV' && !target.closest('[data-memo-block="true"]') && !target.closest('button'));
    
    if (isCanvasBackground && !isConnecting) {
      if (currentTool === 'pan') {
        console.log('Starting pan mode (tool selected)');
        setIsPanning(true);
        setPanStart({
          x: e.clientX - canvasOffset.x,
          y: e.clientY - canvasOffset.y
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    
    // 선택 도구이고 연결 모드가 아닐 때 전역 드래그 선택 시작 준비 (캔버스 배경에서만)
    if (currentTool === 'select' && !isConnecting && !isPanning && isCanvasBackground) {
      console.log('Setting up global drag selection');
      setGlobalDragSelecting(true);
      setGlobalDragStart({ x: e.clientX, y: e.clientY });
      setGlobalDragWithShift(e.shiftKey);
      setDragThresholdMet(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    console.log('Wheel event:', { altKey: e.altKey, currentTool, deltaY: e.deltaY });
    
    // Alt + 휠 또는 줌 도구 선택 시 확대/축소
    if (e.altKey || currentTool === 'zoom') {
      console.log('Zooming...', { canvasScale, deltaY: e.deltaY });
      e.preventDefault();
      e.stopPropagation();
      
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // 줌 델타 계산 (휠 방향에 따라)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, canvasScale * zoomFactor));
      
      if (newScale !== canvasScale) {
        // 마우스 위치를 기준으로 줌
        const scaleDiff = newScale - canvasScale;
        const newOffsetX = canvasOffset.x - (mouseX - canvasOffset.x) * (scaleDiff / canvasScale);
        const newOffsetY = canvasOffset.y - (mouseY - canvasOffset.y) * (scaleDiff / canvasScale);
        
        console.log('Scale changing from', canvasScale, 'to', newScale);
        console.log('Offset changing from', canvasOffset, 'to', { x: newOffsetX, y: newOffsetY });
        
        setCanvasScale(newScale);
        setCanvasOffset({ x: newOffsetX, y: newOffsetY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isConnecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      // 화면 좌표를 원본 좌표로 변환 (SVG가 동일한 transform을 사용하므로)
      const mouseX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
      const mouseY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
      onUpdateDragLine({ x: mouseX, y: mouseY });
    }
    
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setCanvasOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  React.useEffect(() => {
    if (isPanning) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const newOffset = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        };
        setCanvasOffset(newOffset);
      };

      const handleGlobalMouseUp = () => {
        console.log('Pan ended');
        setIsPanning(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, panStart, isSpacePressed, currentTool]);

  // 전역 드래그 선택을 위한 이벤트 리스너
  React.useEffect(() => {
    if (globalDragSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = Math.abs(e.clientX - globalDragStart.x);
        const deltaY = Math.abs(e.clientY - globalDragStart.y);
        
        // 충분히 드래그되었고 아직 드래그 선택이 시작되지 않았다면 시작
        if ((deltaX > 5 || deltaY > 5) && !isDragSelecting && !dragThresholdMet) {
          console.log('Starting global drag selection - threshold met');
          setDragThresholdMet(true);
          const canvasElement = document.querySelector('[data-canvas="true"]');
          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const localStartX = globalDragStart.x - rect.left;
            const localStartY = globalDragStart.y - rect.top;
            const worldStartX = (localStartX - canvasOffset.x) / canvasScale;
            const worldStartY = (localStartY - canvasOffset.y) / canvasScale;
            console.log('Global drag start coords:', { worldStartX, worldStartY });
            onDragSelectStart({ x: worldStartX, y: worldStartY }, globalDragWithShift);
          }
        }
        
        // 드래그 선택이 진행중이면 업데이트
        if (isDragSelecting && dragThresholdMet) {
          const canvasElement = document.querySelector('[data-canvas="true"]');
          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            const worldX = (localX - canvasOffset.x) / canvasScale;
            const worldY = (localY - canvasOffset.y) / canvasScale;
            onDragSelectMove({ x: worldX, y: worldY });
          }
        }
      };

      const handleGlobalMouseUp = () => {
        console.log('Global mouse up - ending drag selection');
        const wasSelecting = isDragSelecting && dragThresholdMet;
        setGlobalDragSelecting(false);
        setGlobalDragWithShift(false);
        setDragThresholdMet(false);
        if (wasSelecting) {
          setJustFinishedDragSelection(true);
          onDragSelectEnd();
          // 짧은 지연 후 플래그 해제
          setTimeout(() => setJustFinishedDragSelection(false), 50);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [globalDragSelecting, globalDragStart, isDragSelecting, dragThresholdMet, canvasOffset, canvasScale, globalDragWithShift, onDragSelectStart, onDragSelectMove, onDragSelectEnd]);

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        console.log('Space pressed, base tool:', baseTool);
        setIsSpacePressed(true);
        setCurrentTool('pan');
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && !isAltPressed) {
        console.log('Alt pressed, base tool:', baseTool);
        setIsAltPressed(true);
        setCurrentTool('zoom');
      }
      if (e.code === 'Escape') {
        console.log('Escape pressed - clearing selection');
        // 모든 선택 해제
        onMemoSelect('', false); // 빈 문자열로 호출해서 선택 해제
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        console.log('Space released, restoring to base tool:', baseTool);
        setIsSpacePressed(false);
        // Alt가 눌려있으면 zoom, 아니면 baseTool로
        if (isAltPressed) {
          setCurrentTool('zoom');
        } else {
          setCurrentTool(baseTool);
        }
        e.preventDefault();
      }
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && isAltPressed) {
        console.log('Alt released, restoring to base tool:', baseTool);
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsAltPressed(false);
        // Space가 눌려있으면 pan, 아니면 baseTool로
        if (isSpacePressed) {
          setCurrentTool('pan');
        } else {
          setCurrentTool(baseTool);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      document.removeEventListener('keyup', handleKeyUp, { capture: true } as any);
    };
  }, [baseTool, isSpacePressed, isAltPressed, isMouseOverCanvas]);

  return (
    <div 
      data-canvas="true"
      tabIndex={0}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#ffffff',
        cursor: isPanning ? 'grabbing' : 
                (isSpacePressed || currentTool === 'pan') ? 'grab' :
                currentTool === 'zoom' ? 'crosshair' : 'default'
      }}
      onClick={(e) => {
        const target = e.target as Element;
        const isCanvasBackground = target.hasAttribute('data-canvas') ||
                                  target.tagName === 'svg' ||
                                  (target.tagName === 'DIV' && !target.closest('[data-memo-block="true"]') && !target.closest('button'));
        
        if (isCanvasBackground) {
          if (isConnecting) {
            onCancelConnection();
          } else if (!isDragSelecting && !isSpacePressed && currentTool !== 'pan' && !justFinishedDragSelection) {
            // 캔버스 배경 클릭 시 모든 선택 해제 (드래그 선택 중이 아니고, 방금 드래그 선택을 끝내지 않았고, 스페이스바가 안 눌려있고, 팬 모드가 아닐 때만)
            onMemoSelect('', false);
          }
        }
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsMouseOverCanvas(true)}
      onMouseLeave={() => setIsMouseOverCanvas(false)}
      onWheel={handleWheel}
    >
      {/* 메모 블록들과 연결선 */}
      <div style={{
        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        pointerEvents: 'auto'
      }}>
        {/* SVG로 연결선 그리기 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: isDisconnectMode ? 'auto' : 'none',
            zIndex: isDisconnectMode ? 1 : 0
          }}
        >
          <defs>
            <style>
              {`
                @keyframes dash {
                  to {
                    stroke-dashoffset: -24;
                  }
                }
              `}
            </style>
          </defs>
          {renderConnectionLines()}
        </svg>

        {currentPage?.memos.map(memo => (
          <MemoBlock
            key={memo.id}
            memo={memo}
            isSelected={selectedMemoId === memo.id || selectedMemoIds.includes(memo.id)}
            isDragHovered={dragHoveredMemoIds.includes(memo.id)}
            onClick={(isShiftClick) => onMemoSelect(memo.id, isShiftClick)}
            onPositionChange={onMemoPositionChange}
            onSizeChange={onMemoSizeChange}
            isConnecting={isConnecting}
            connectingFromId={connectingFromId}
            onStartConnection={onStartConnection}
            onConnectMemos={onConnectMemos}
            canvasScale={canvasScale}
            canvasOffset={canvasOffset}
          />
        ))}

        {/* 드래그 선택 영역 - 메모 블록과 같은 transform 공간 안에 위치 */}
        {isDragSelecting && dragSelectStart && dragSelectEnd && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(dragSelectStart.x, dragSelectEnd.x)}px`,
              top: `${Math.min(dragSelectStart.y, dragSelectEnd.y)}px`,
              width: `${Math.abs(dragSelectEnd.x - dragSelectStart.x)}px`,
              height: `${Math.abs(dragSelectEnd.y - dragSelectStart.y)}px`,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.6)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </div>


      {/* 하단 도구 버튼들 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '8px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e1e5e9',
        zIndex: 1000
      }}>
        {/* 도구 버튼들 */}
        <button
          onClick={() => {
            setCurrentTool('select');
            setBaseTool('select');
          }}
          style={{
            backgroundColor: currentTool === 'select' ? '#8b5cf6' : 'white',
            color: currentTool === 'select' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
          title="선택 도구"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </button>
        <button
          onClick={() => {
            setCurrentTool('pan');
            setBaseTool('pan');
          }}
          style={{
            backgroundColor: currentTool === 'pan' ? '#8b5cf6' : 'white',
            color: currentTool === 'pan' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
          title="화면 이동 도구 (Space)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3 3-3 3M2 12l3-3 3 3M12 22l-3-3 3-3M22 12l-3 3-3-3"/>
          </svg>
        </button>
        <button
          onClick={() => {
            setCurrentTool('zoom');
            setBaseTool('zoom');
          }}
          style={{
            backgroundColor: currentTool === 'zoom' ? '#8b5cf6' : 'white',
            color: currentTool === 'zoom' ? 'white' : '#6b7280',
            border: '1px solid #d1d5db',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px'
          }}
          title="확대/축소 도구 (Alt + Scroll)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        
        <div style={{ width: '1px', height: '44px', backgroundColor: '#e5e7eb', margin: '0 4px' }}></div>
        
        {/* 기능 버튼들 */}
        <button
          onClick={() => {
            const canvas = document.querySelector('[data-canvas="true"]') as HTMLElement;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const centerX = (rect.width / 2 - canvasOffset.x) / canvasScale;
              const centerY = (rect.height / 2 - canvasOffset.y) / canvasScale;
              onAddMemo({ x: centerX - 100, y: centerY - 50 });
            } else {
              onAddMemo();
            }
          }}
          style={{
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          + 블록 생성
        </button>
        <button
          onClick={onDisconnectMemo}
          style={{
            backgroundColor: isDisconnectMode ? '#fee2e2' : 'white',
            color: isDisconnectMode ? '#dc2626' : '#6b7280',
            border: `1px solid ${isDisconnectMode ? '#fca5a5' : '#d1d5db'}`,
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          {isDisconnectMode ? '연결 해제 모드' : '연결 해제'}
        </button>
        <button
          onClick={onDeleteMemo}
          disabled={!selectedMemoId}
          style={{
            backgroundColor: 'white',
            color: selectedMemoId ? '#ef4444' : '#9ca3af',
            border: '1px solid #d1d5db',
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: selectedMemoId ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
};

export default Canvas;