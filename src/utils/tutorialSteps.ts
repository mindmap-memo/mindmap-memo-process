import { TutorialStep } from '../types';

// 기본 기능 튜토리얼 (메모 작성 방법 - 먼저 배우기)
export const basicTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '환영합니다! 👋',
    description: '마인드맵 메모 앱에 오신 것을 환영합니다.\n\nNotion의 블록 시스템과 마인드맵의 시각화를 결합한 새로운 메모 앱입니다.\n\n먼저 기본 사용법부터 배워보겠습니다!',
    position: 'center',
    action: 'none',
    nextButtonText: '시작하기'
  },

  // === 캔버스 기본 ===
  {
    id: 'canvas-intro',
    title: '📍 캔버스 - 시각적 작업 공간',
    description: '중앙의 넓은 공간이 캔버스입니다.\n\n여기에서 메모 블록을 자유롭게 배치하고, 연결선으로 관계를 표현하며, 마인드맵을 시각적으로 구성합니다.',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'canvas-pan',
    title: '캔버스 이동하기',
    description: '넓은 캔버스를 자유롭게 이동할 수 있습니다.\n\n🎯 직접 해보세요!\nSpacebar를 누른 채로 마우스를 드래그하여 캔버스를 이동해보세요.\n\n(캔버스를 이동하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'drag',
    nextButtonText: '완료!'
  },
  {
    id: 'canvas-zoom',
    title: '캔버스 확대/축소',
    description: '캔버스를 확대하거나 축소할 수 있습니다.\n\n🎯 직접 해보세요!\nAlt 키를 누른 채로 마우스 휠을 스크롤하여 줌을 조절해보세요.\n\n• 위로 스크롤: 확대\n• 아래로 스크롤: 축소\n\n(줌을 조절하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none',
    nextButtonText: '완료!'
  },

  // === 메모 생성 및 이동 ===
  {
    id: 'add-memo',
    title: '메모 블록 생성',
    description: '캔버스에 새로운 메모 블록을 만들어봅시다.\n\n🎯 직접 해보세요!\n캔버스 하단의 "+ 메모 생성" 버튼을 클릭해보세요.\n\n(메모가 생성되면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="add-memo-btn"]',
    position: 'top',
    action: 'none',
    nextButtonText: '완료!'
  },
  {
    id: 'memo-drag',
    title: '메모 이동하기',
    description: '메모 블록을 원하는 위치로 배치할 수 있습니다.\n\n🎯 직접 해보세요!\n생성된 메모 블록을 드래그하여 다른 위치로 이동해보세요.\n\n(메모를 이동하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'drag',
    nextButtonText: '완료!'
  },

  // === 메모 연결 ===
  {
    id: 'connections',
    title: '메모 연결하기',
    description: '메모 블록 간의 관계를 연결선으로 표현할 수 있습니다.\n\n🎯 직접 해보세요!\n1. "+ 메모 생성" 버튼으로 메모 하나 더 생성\n2. 메모 블록 가장자리의 작은 원(연결점) 클릭 후 드래그\n3. 연결하고자 하는 메모에 마우스 놓기\n\n연결선이 생성되고 양방향으로 연결됩니다.',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none',
    subSteps: [
      {
        order: 1,
        description: '"+ 메모 생성" 버튼으로 메모 하나 더 생성',
        targetElement: '[data-tutorial="add-memo-btn"]',
        animationType: 'cursor-click',
        eventType: 'memo-created'
      },
      {
        order: 2,
        description: '메모 블록 가장자리의 작은 원(연결점) 클릭 후 드래그',
        targetElement: '.memo-connection-point', // 동적으로 찾을 것
        animationType: 'cursor-drag',
        eventType: 'connection-started'
      },
      {
        order: 3,
        description: '연결하고자 하는 메모에 마우스 놓기',
        targetElement: '.memo-block', // 동적으로 찾을 것
        animationType: 'cursor-hover',
        eventType: 'connection-completed'
      }
    ]
  },
  {
    id: 'disconnect-mode',
    title: '연결 해제하기',
    description: '불필요한 연결선을 제거할 수 있습니다.\n\n🎯 직접 해보세요!\n1. 캔버스 하단의 "연결 해제" 버튼 클릭\n2. 제거할 연결선을 클릭\n3. 다시 버튼을 클릭하여 해제 모드 종료',
    targetElement: '[data-tutorial="disconnect-btn"]',
    position: 'top',
    action: 'none'
  },

  // === 카테고리 ===
  {
    id: 'categories',
    title: '카테고리로 그룹화',
    description: '카테고리로 메모들을 그룹화할 수 있습니다.\n\n🎯 직접 해보세요!\n1. "카테고리 생성" 버튼 클릭\n2. Shift 키를 누른 채로 메모를 드래그하여 카테고리 영역에 추가\n\n카테고리는 메모를 시각적으로 그룹화하는 강력한 기능입니다.',
    targetElement: '[data-tutorial="add-category-btn"]',
    position: 'top',
    action: 'none'
  },
  {
    id: 'category-area',
    title: '카테고리 영역 조작',
    description: '카테고리 영역을 확장하고 이동할 수 있습니다.\n\n🎯 직접 해보세요!\n1. 메모뿐만 아니라 다른 카테고리도 Shift + 드래그로 삽입\n2. 좌측 상단 핸들을 드래그하여 영역 크기 조절\n3. 영역 안에 있는 요소를 움직이면 위치에 따라 자동으로 영역이 확장\n4. 영역을 이동하려면 영역에 마우스를 올리고 드래그',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },

  // === 실행 취소/다시 실행 ===
  {
    id: 'undo-redo',
    title: '실행 취소/다시 실행',
    description: '캔버스의 모든 작업을 되돌리거나 다시 실행할 수 있습니다.\n\n• Ctrl + Z: 실행 취소\n• Ctrl + Shift + Z: 다시 실행\n\n메모 생성, 삭제, 이동, 연결 등 모든 작업이 히스토리에 저장됩니다.',
    targetElement: '[data-tutorial="undo-redo-btns"]',
    position: 'bottom',
    action: 'none'
  },

  // === 페이지 관리 ===
  {
    id: 'page-management',
    title: '페이지 관리',
    description: '여러 페이지를 만들고 관리할 수 있습니다.\n\n🎯 직접 해보세요!\n• 페이지 추가: "페이지" 글자 우측 "+" 버튼 클릭\n• 페이지 전환: 페이지 이름 클릭\n• 페이지 이름 변경: 페이지 이름 더블클릭\n• 페이지 삭제: 페이지 우클릭 후 삭제\n\n각 페이지는 독립적인 마인드맵을 가집니다.',
    targetElement: '[data-tutorial="left-panel"]',
    position: 'right',
    action: 'none'
  },

  // === 메모 편집 ===
  {
    id: 'right-panel-intro',
    title: '우측 패널 - 메모 편집',
    description: '우측 패널에서 선택한 메모의 모든 내용을 편집할 수 있습니다.\n\n제목, 태그, 텍스트 입력, 파일 첨부 등 다양한 편집 기능을 제공합니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'select-memo',
    title: '메모 선택하기',
    description: '메모를 편집하려면 먼저 선택해야 합니다.\n\n🎯 직접 해보세요!\n캔버스의 메모 블록을 클릭하여 선택해보세요.\n\n선택된 메모가 우측 패널에 표시되고 편집할 수 있습니다.',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'memo-title-tags',
    title: '제목과 태그',
    description: '메모의 제목과 태그를 입력할 수 있습니다.\n\n🎯 직접 해보세요!\n우측 패널 상단에서:\n• 제목을 입력해보세요\n• 태그를 추가해보세요 (쉼표로 구분)\n\n제목과 태그는 검색할 때 사용됩니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'text-editing',
    title: '텍스트 입력',
    description: '메모 내용을 자유롭게 입력할 수 있습니다.\n\n🎯 직접 해보세요!\n텍스트 영역을 클릭하고 내용을 입력해보세요.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'file-attachment',
    title: '파일 첨부',
    description: '이미지와 파일을 메모에 첨부할 수 있습니다.\n\n🎯 직접 해보세요!\n우측 패널의 텍스트 영역에:\n• 이미지/파일을 드래그하여 놓거나\n• 복사한 이미지를 붙여넣기 (Ctrl+V)\n\n첨부된 파일은 메모에 표시됩니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'connection-navigation',
    title: '연결된 메모 탐색',
    description: '우측 패널 상단에서 연결된 메모를 확인할 수 있습니다.\n\n메모를 다른 메모와 연결하면, 여기에 "연결된 메모" 섹션이 표시됩니다.\n\n🎯 연결된 메모 이름을 클릭하면 해당 메모로 바로 이동합니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },

  // === 핵심 기능 안내 ===
  {
    id: 'core-features-intro',
    title: '✅ 기본 기능 완료!',
    description: '메모 작성 방법을 모두 배우셨습니다!\n\n이제 작성한 메모를 더 효율적으로 관리하는 핵심 기능들을 배워보시겠어요?\n\n핵심 기능 포함:\n• 빠른 탐색 (단축 이동)\n• 중요도 부여 및 필터링\n• 통합 검색',
    position: 'center',
    action: 'none',
    nextButtonText: '핵심 기능 배우기'
  }
];

// 핵심 기능 튜토리얼 (메모 관리 효율화 - 나중에 배우기)
export const coreTutorialSteps: TutorialStep[] = [
  {
    id: 'core-intro',
    title: '🌟 핵심 기능 튜토리얼',
    description: '이제 작성한 메모를 더 효율적으로 관리하는 방법을 배워보겠습니다!\n\n많은 메모를 빠르게 찾고, 중요한 내용을 강조하고, 필터링하는 방법을 알아봅시다.',
    position: 'center',
    action: 'none',
    nextButtonText: '시작하기'
  },

  // === 핵심 1: 단축 이동 ===
  {
    id: 'core-quick-nav',
    title: '🌟 핵심 1: 빠른 탐색',
    description: '자주 사용하는 메모나 카테고리를 즐겨찾기하여 빠르게 이동할 수 있습니다.\n\n🎯 지금 바로 해보세요!\n1. 튜토리얼 페이지의 메모를 우클릭\n2. "빠른 탐색에 추가" 선택\n3. 우측 하단의 ⭐ 버튼 클릭\n\n페이지가 달라도 즉시 이동할 수 있어 편리합니다.',
    targetElement: '[data-tutorial="quick-nav-btn"]',
    position: 'left',
    action: 'none'
  },

  // === 핵심 2: 중요도 부여 및 필터 ===
  {
    id: 'core-importance',
    title: '🌟 핵심 2: 중요도 부여',
    description: '텍스트에 중요도를 부여하여 내용을 분류하고 강조할 수 있습니다.\n\n🎯 지금 바로 해보세요!\n1. 튜토리얼 페이지의 메모를 클릭하여 선택\n2. 우측 패널에서 텍스트를 드래그\n3. 나타나는 메뉴에서 중요도 선택\n\n7가지 레벨: 매우중요(빨강), 중요(주황), 의견(보라), 참고(파랑), 질문(노랑), 아이디어(초록), 데이터(회색)',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'core-importance-filter',
    title: '🌟 핵심 3: 중요도 필터',
    description: '중요도 필터로 원하는 내용만 선택적으로 볼 수 있습니다.\n\n🎯 지금 바로 해보세요!\n1. 캔버스 좌측 상단의 필터 아이콘 클릭\n2. 특정 중요도 레벨을 클릭하여 켜고 끄기\n3. 비활성화된 중요도의 내용은 캔버스에서 숨겨집니다\n\n필터를 드래그하여 원하는 위치로 이동할 수 있습니다.',
    targetElement: '[data-tutorial="importance-filter"]',
    position: 'bottom',
    action: 'none'
  },

  // === 핵심 4: 검색 ===
  {
    id: 'core-search',
    title: '🌟 핵심 4: 통합 검색',
    description: '모든 페이지의 메모와 카테고리를 빠르게 검색할 수 있습니다.\n\n🎯 지금 바로 해보세요!\n1. 좌측 상단의 검색창 클릭\n2. 검색어 입력 (예: "단축키")\n3. 검색 결과 클릭하면 해당 항목으로 이동\n\n• 전체 검색: 제목, 태그, 내용 모두\n• 필터: 메모/카테고리 선택 가능',
    targetElement: '[data-tutorial="search"]',
    position: 'bottom',
    action: 'none'
  },

  // === 완료 ===
  {
    id: 'complete',
    title: '튜토리얼 완료! 🎉',
    description: '모든 기능을 체험해보셨습니다!\n\n이제 자유롭게 마인드맵 메모 앱을 사용해보세요.\n\n✅ 기본 기능: 캔버스 조작, 메모/카테고리 생성, 편집\n✅ 핵심 기능: 단축 이동, 중요도 필터, 검색\n\n언제든지 좌측 상단의 "?" 버튼으로 튜토리얼을 다시 볼 수 있습니다.',
    position: 'center',
    action: 'none',
    nextButtonText: '시작하기'
  }
];

// 전체 튜토리얼 (하위 호환성을 위해 유지)
export const tutorialSteps: TutorialStep[] = [
  ...basicTutorialSteps,
  ...coreTutorialSteps.slice(1) // 핵심 기능 인트로 제외하고 추가
];
