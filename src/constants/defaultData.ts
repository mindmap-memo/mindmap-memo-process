import { Page, MemoBlock, MemoDisplaySize, ImportanceLevel, CategoryBlock } from '../types';

// localStorage 키 상수
export const STORAGE_KEYS = {
  PAGES: 'mindmap-memo-pages',
  CURRENT_PAGE_ID: 'mindmap-memo-current-page-id',
  PANEL_SETTINGS: 'mindmap-memo-panel-settings',
  QUICK_NAV_ITEMS: 'mindmap-memo-quick-nav-items'
};

// 기본 데이터
export const DEFAULT_PAGES: Page[] = (() => {
  // 고유한 페이지 ID 생성 (절대 '1'을 사용하지 않음)
  // 형식: page-[타임스탬프]-[랜덤4자리]
  const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  // 튜토리얼 메모들
  const tutorialMemos: MemoBlock[] = [
    // 1. 단축키 설명
    {
      id: `${pageId}-memo-shortcuts`,
      title: '⌨️ 단축키',
      content: '',
      blocks: [
        {
          id: `${pageId}-shortcuts-1`,
          type: 'text',
          content: 'Ctrl+Z\n실행취소'
        },
        {
          id: `${pageId}-shortcuts-2`,
          type: 'text',
          content: 'Ctrl+Shift+Z\n다시실행'
        },
        {
          id: `${pageId}-shortcuts-3`,
          type: 'text',
          content: 'Delete\n선택한 메모 삭제'
        },
        {
          id: `${pageId}-shortcuts-4`,
          type: 'text',
          content: 'Alt + 스크롤\n캔버스 확대/축소'
        },
        {
          id: `${pageId}-shortcuts-5`,
          type: 'text',
          content: 'Spacebar + 드래그\n캔버스 이동'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 150, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 2. 메모 블록과 카테고리 영역
    {
      id: `${pageId}-memo-canvas`,
      title: '📦 메모 블록과 카테고리',
      content: '',
      blocks: [
        {
          id: `${pageId}-canvas-1`,
          type: 'text',
          content: '메모 블록\n드래그로 이동하고, 테두리 모서리를 클릭하여 다른 메모와 연결선을 생성하세요'
        },
        {
          id: `${pageId}-canvas-2`,
          type: 'text',
          content: '카테고리 영역\n메모를 담는 컨테이너입니다. Shift+드래그로 메모를 카테고리에 추가하거나 제거하세요'
        },
        {
          id: `${pageId}-canvas-3`,
          type: 'text',
          content: '카테고리 중첩\n카테고리 안에 다른 카테고리를 넣어 계층 구조를 만들 수 있습니다'
        },
        {
          id: `${pageId}-canvas-4`,
          type: 'text',
          content: '카테고리 연결\n카테고리끼리도 연결선을 생성하여 관계를 표현할 수 있습니다'
        },
        {
          id: `${pageId}-canvas-5`,
          type: 'text',
          content: '카테고리 확장/축소\n카테고리 블록을 클릭하면 영역을 펼치거나 접을 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 450, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 3. 오른쪽 탭 (메모 편집)
    {
      id: `${pageId}-memo-rightpanel`,
      title: '📝 우측 패널 - 메모 편집',
      content: '',
      blocks: [
        {
          id: `${pageId}-right-1`,
          type: 'text',
          content: '텍스트 입력\n메모를 선택하면 우측 패널에서 제목과 내용을 편집할 수 있습니다'
        },
        {
          id: `${pageId}-right-2`,
          type: 'text',
          content: '파일 첨부\n이미지나 파일을 드래그앤드롭으로 업로드하거나 우클릭-파일첨부로 파일을 업로드하세요'
        },
        {
          id: `${pageId}-right-3`,
          type: 'text',
          content: '중요도 부여\n텍스트를 드래그하거나 파일, 이미지, URL을 우클릭해 중요도를 부여하여 분류하세요'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 750, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 4. 우측 패널 (카테고리 편집)
    {
      id: `${pageId}-memo-rightpanel-category`,
      title: '📂 우측 패널 - 카테고리 편집',
      content: '',
      blocks: [
        {
          id: `${pageId}-right-cat-1`,
          type: 'text',
          content: '제목 수정\n카테고리를 선택하면 우측 패널에서 카테고리 제목을 편집할 수 있습니다'
        },
        {
          id: `${pageId}-right-cat-2`,
          type: 'text',
          content: '하위 메모 목록\n카테고리에 포함된 모든 하위 메모 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
        },
        {
          id: `${pageId}-right-cat-3`,
          type: 'text',
          content: '연결된 카테고리\n연결선으로 연결된 다른 카테고리 목록이 표시되며, 클릭하여 빠르게 이동할 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 1050, y: 150 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 5. 왼쪽 탭 (페이지와 검색)
    {
      id: `${pageId}-memo-leftpanel`,
      title: '🔍 좌측 패널 - 페이지와 검색',
      content: '',
      blocks: [
        {
          id: `${pageId}-left-1`,
          type: 'text',
          content: '페이지 관리\n좌측 패널에서 페이지를 추가하거나 삭제하세요. 각 페이지는 독립적인 캔버스입니다'
        },
        {
          id: `${pageId}-left-2`,
          type: 'text',
          content: '통합 검색\n좌측 상단 돋보기 아이콘으로 모든 페이지의 메모와 카테고리를 검색할 수 있습니다'
        },
        {
          id: `${pageId}-left-3`,
          type: 'text',
          content: '검색 필터\n검색 결과를 메모 또는 카테고리로 필터링하여 원하는 항목만 표시할 수 있습니다'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 150, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 6. 캔버스 뷰 기능
    {
      id: `${pageId}-memo-canvasview`,
      title: '🎨 캔버스 뷰 기능',
      content: '',
      blocks: [
        {
          id: `${pageId}-view-1`,
          type: 'text',
          content: '즐겨찾기\n메모나 카테고리를 우클릭하여 즐겨찾기 목록에 추가하고, 우측 상단의 즐겨찾기 버튼을 클릭해 빠르게 이동하세요'
        },
        {
          id: `${pageId}-view-2`,
          type: 'text',
          content: '중요도 필터\n캔버스 좌측 상단의 중요도 필터를 통해 특정 중요도의 메모만 표시할 수 있습니다'
        },
        {
          id: `${pageId}-view-3`,
          type: 'text',
          content: '줌과 팬\n마우스 휠로 확대/축소하고, 빈 공간을 드래그하여 캔버스를 이동하세요'
        },
        {
          id: `${pageId}-view-4`,
          type: 'text',
          content: '메모 생성\n캔버스 하단의 "메모 추가" 버튼으로 새로운 메모 블록을 생성하세요'
        },
        {
          id: `${pageId}-view-5`,
          type: 'text',
          content: '카테고리 생성\n캔버스 하단의 "카테고리 추가" 버튼으로 새로운 카테고리 영역을 생성하세요'
        },
        {
          id: `${pageId}-view-6`,
          type: 'text',
          content: '연결 해제\n캔버스 하단의 "연결 해제" 버튼을 켜고 연결선을 클릭하여 메모 간 연결을 제거하세요'
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 450, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    },
    // 7. 기타 사항
    {
      id: `${pageId}-memo-etc`,
      title: '📢 기타 사항',
      content: '',
      blocks: [
        {
          id: `${pageId}-etc-1`,
          type: 'text',
          content: '아직 프로토타입이므로 기기 브라우저에 저장되는 방식이며 시크릿 모드를 사용하시면 저장이 되지 않습니다.\n또 다른 기기로 이용하시면 내용이 기존 기기에 적은 내용이 공유되지 않으니 유의하시기 바랍니다.'
        },
        {
          id: `${pageId}-etc-2`,
          type: 'text',
          content: '추후 이용자가 늘면 로그인 기능을 추가해 어떤 기기에서든 내용이 공유되도록 추가하겠습니다.'
        },
        {
          id: `${pageId}-etc-3`,
          type: 'text',
          content: '앱을 사용하시며 불편한 점이나 의견 있으신 경우 @movee.diary로 DM주시면 감사하겠습니다!',
          importanceRanges: [{
            start: 0,
            end: 55,
            level: 'critical' as ImportanceLevel
          }]
        }
      ],
      tags: ['튜토리얼'],
      connections: [],
      position: { x: 750, y: 450 },
      displaySize: 'medium' as MemoDisplaySize,
      parentId: `${pageId}-tutorial-category`
    }
  ];

  // 튜토리얼 카테고리 생성
  const tutorialCategory: CategoryBlock = {
    id: `${pageId}-tutorial-category`,
    title: '📖 사용 방법',
    tags: [],
    connections: [],
    position: { x: 100, y: 100 },
    size: { width: 1300, height: 700 },
    children: tutorialMemos.map(memo => memo.id),
    parentId: undefined,
    isExpanded: true
  };

  return [
    {
      id: pageId,
      name: '페이지 1',
      memos: tutorialMemos,
      categories: [tutorialCategory],
      quickNavItems: [] // 빈 즐겨찾기 목록으로 초기화
    }
  ];
})();
