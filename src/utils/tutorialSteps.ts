import { TutorialStep } from '../types';

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '환영합니다! 👋',
    description: '마인드맵 메모 앱에 오신 것을 환영합니다.\n\n이 앱은 Notion의 블록 시스템과 마인드맵의 시각화를 결합한 새로운 메모 앱입니다.\n\n지금부터 주요 기능을 직접 체험해보겠습니다!',
    position: 'center',
    action: 'none',
    nextButtonText: '시작하기'
  },

  // === 캔버스 섹션 ===
  {
    id: 'canvas-intro',
    title: '📍 캔버스 - 시각적 작업 공간',
    description: '중앙의 넓은 공간이 캔버스입니다.\n\n여기에서 메모 블록을 자유롭게 배치하고, 연결선으로 관계를 표현하며, 마인드맵을 시각적으로 구성합니다.\n\n캔버스의 모든 기능을 하나씩 체험해봅시다!',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'canvas-pan',
    title: '1️⃣ 캔버스 이동하기',
    description: '넓은 캔버스를 자유롭게 이동할 수 있습니다.\n\n🎯 직접 해보세요!\nSpacebar를 누른 채로 마우스를 드래그하여 캔버스를 이동해보세요.\n\n(캔버스를 이동하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'drag',
    nextButtonText: '완료!'
  },
  {
    id: 'canvas-zoom',
    title: '2️⃣ 캔버스 확대/축소',
    description: '캔버스를 확대하거나 축소할 수 있습니다.\n\n🎯 직접 해보세요!\nAlt 키를 누른 채로 마우스 휠을 스크롤하여 줌을 조절해보세요.\n\n• 위로 스크롤: 확대\n• 아래로 스크롤: 축소\n\n(줌을 조절하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none',
    nextButtonText: '완료!'
  },
  {
    id: 'add-memo',
    title: '3️⃣ 메모 블록 생성',
    description: '캔버스에 새로운 메모 블록을 만들어봅시다.\n\n🎯 직접 해보세요!\n캔버스 하단의 "+ 블록 생성" 버튼을 클릭해보세요.\n\n(메모가 생성되면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none',
    nextButtonText: '완료!'
  },
  {
    id: 'memo-drag',
    title: '4️⃣ 메모 이동하기',
    description: '메모 블록을 원하는 위치로 배치할 수 있습니다.\n\n🎯 직접 해보세요!\n생성된 메모 블록을 드래그하여 다른 위치로 이동해보세요.\n\n(메모를 이동하면 다음 단계로 진행됩니다)',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'drag',
    nextButtonText: '완료!'
  },
  {
    id: 'connections',
    title: '5️⃣ 메모 연결하기',
    description: '메모 블록 간의 관계를 연결선으로 표현할 수 있습니다.\n\n먼저 메모를 하나 더 만들어주세요.\n\n🎯 직접 해보세요!\n1. "+ 블록 생성" 버튼으로 메모 하나 더 생성\n2. 첫 번째 메모 블록 가장자리의 작은 원(연결점) 클릭 후 드래그\n3. 연결하고자 하는 메모에 마우스 놓기\n\n연결선이 생성되고 양방향으로 연결됩니다.',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'disconnect-mode',
    title: '6️⃣ 연결 해제하기',
    description: '불필요한 연결선을 제거할 수 있습니다.\n\n🎯 직접 해보세요!\n1. 캔버스 하단의 "연결 해제" 버튼 클릭 (활성화)\n2. 제거할 연결선을 클릭\n3. 다시 버튼을 클릭하여 해제 모드 종료',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'categories',
    title: '7️⃣ 카테고리로 그룹화',
    description: '카테고리로 메모들을 그룹화할 수 있습니다.\n\n🎯 직접 해보세요!\n1. "카테고리 생성" 버튼 클릭\n2. Shift + 드래그로 영역에 메모를 올려놔 추가/제거',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'category-area',
    title: '7️⃣-2 카테고리 영역 확장/이동',
    description: '카테고리 영역을 확장하고 이동할 수 있습니다.\n\n• 메모 뿐만 아니라 다른 카테고리들도 Shift + 드래그로 삽입\n• 좌측 상단 태그를 움직여 영역의 크기를 조절\n• 영역 안 하위 요소를 움직일 시 빠져나가지 못하도록 자동으로 영역이 늘어납니다\n• 영역을 이동하려면 영역에 마우스를 올리고 드래그',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },
  {
    id: 'undo-redo',
    title: '8️⃣ 실행 취소/다시 실행',
    description: '캔버스의 모든 작업을 되돌리거나 다시 실행할 수 있습니다.\n\n• Ctrl + Z: 실행 취소\n• Ctrl + Shift + Z: 다시 실행\n\n메모 생성, 삭제, 이동, 연결 등 모든 작업이 히스토리에 저장됩니다.',
    targetElement: '[data-tutorial="canvas"]',
    position: 'center',
    action: 'none'
  },

  // === 좌측 패널 섹션 ===
  {
    id: 'left-panel-intro',
    title: '📂 좌측 패널 - 페이지와 검색',
    description: '좌측 패널에서 페이지를 관리하고 메모를 검색할 수 있습니다.\n\n여러 페이지를 만들어 주제별로 마인드맵을 분리하고, 강력한 검색 기능으로 원하는 내용을 빠르게 찾을 수 있습니다.',
    targetElement: '[data-tutorial="left-panel"]',
    position: 'right',
    action: 'none'
  },
  {
    id: 'page-management',
    title: '9️⃣ 페이지 관리',
    description: '여러 페이지를 만들고 관리할 수 있습니다.\n\n🎯 직접 해보세요!\n• 페이지 추가: 페이지 글자 우측 "+" 버튼 클릭\n• 페이지 전환: 페이지 이름 더블 클릭 or 페이지 이름 우측 편집 아이콘 클릭\n• 페이지 삭제: 페이지 이름 우측 휴지통 아이콘 클릭\n\n각 페이지는 독립적인 마인드맵을 가집니다.',
    targetElement: '[data-tutorial="left-panel"]',
    position: 'right',
    action: 'none'
  },
  {
    id: 'search',
    title: '🔟 검색 기능',
    description: '좌측 상단의 검색창에서 메모와 카테고리를 검색할 수 있습니다.\n\n🎯 직접 해보세요!\n검색창을 클릭하고 검색어를 입력해보세요.\n\n• 전체 검색\n• 제목만 검색\n• 태그만 검색\n• 내용 검색\n\n검색 결과를 클릭하면 해당 항목으로 바로 이동합니다.',
    targetElement: '[data-tutorial="search"]',
    position: 'bottom',
    action: 'none'
  },

  // === 우측 패널 섹션 ===
  {
    id: 'right-panel-intro',
    title: '✏️ 우측 패널 - 메모 편집',
    description: '우측 패널에서 선택한 메모의 모든 내용을 편집할 수 있습니다.\n\n제목, 태그, 텍스트 입력, 파일 첨부, 중요도 부여 등 다양한 편집 기능을 제공합니다.\n\n지금부터 하나씩 사용해봅시다!',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'select-memo',
    title: '1️⃣1️⃣ 메모 선택하기',
    description: '메모를 편집하려면 먼저 선택해야 합니다.\n\n🎯 직접 해보세요!\n캔버스의 메모 블록을 클릭하여 선택해보세요.\n\n선택된 메모가 우측 패널에 표시되고 편집할 수 있습니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'memo-title-tags',
    title: '1️⃣2️⃣ 제목과 태그',
    description: '메모의 제목과 태그를 입력할 수 있습니다.\n\n🎯 직접 해보세요!\n우측 패널 상단에서:\n• 제목을 입력해보세요\n• 태그를 추가해보세요 (쉼표로 구분)\n\n제목과 태그는 검색할 때 사용됩니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'text-editing',
    title: '1️⃣3️⃣ 텍스트 입력',
    description: '메모 내용을 자유롭게 입력할 수 있습니다.\n\n🎯 직접 해보세요!\n텍스트 영역을 클릭하고 내용을 입력해보세요.\n\n• Enter: 새 줄 추가\n• Shift + Enter: 줄바꿈\n• Backspace (빈 줄): 이전 줄과 병합',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'file-attachment',
    title: '1️⃣4️⃣ 파일 첨부',
    description: '이미지와 파일을 메모에 첨부할 수 있습니다.\n\n🎯 직접 해보세요!\n우측 패널의 텍스트 영역에:\n• 이미지/파일을 드래그하여 놓거나\n• 복사한 이미지를 붙여넣기 (Ctrl+V)\n\n첨부된 파일은 메모에 표시됩니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'importance-marking',
    title: '1️⃣5️⃣ 중요도 부여',
    description: '텍스트에 중요도를 부여하여 형광펜 효과를 줄 수 있습니다.\n\n🎯 직접 해보세요!\n1. 입력한 텍스트를 드래그하여 선택\n2. 나타나는 메뉴에서 중요도 레벨 선택\n\n7가지 레벨: 매우중요(빨강), 중요(주황), 의견(보라), 참고(파랑), 질문(노랑), 아이디어(초록), 일반',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },
  {
    id: 'connection-navigation',
    title: '1️⃣6️⃣ 연결된 메모 탐색',
    description: '우측 패널 하단에서 연결된 메모를 확인할 수 있습니다.\n\n메모를 다른 메모와 연결하면, 여기에 "연결된 메모" 섹션이 표시됩니다.\n\n🎯 연결된 메모 이름을 클릭하면 해당 메모로 바로 이동합니다.',
    targetElement: '[data-tutorial="right-panel"]',
    position: 'left',
    action: 'none'
  },

  // === 추가 기능 섹션 ===
  {
    id: 'importance-filter',
    title: '1️⃣7️⃣ 중요도 필터',
    description: '캔버스에 표시되는 중요도 필터로 내용을 선택적으로 볼 수 있습니다.\n\n🎯 직접 해보세요!\n필터 UI에서 중요도 레벨을 클릭하여:\n• 활성화: 해당 레벨 표시\n• 비활성화: 해당 레벨 숨김\n\n필터를 드래그하여 원하는 위치로 이동할 수 있습니다.',
    targetElement: '[data-tutorial="importance-filter"]',
    position: 'bottom',
    action: 'none'
  },
  {
    id: 'quick-nav',
    title: '1️⃣8️⃣ 빠른 탐색',
    description: '자주 사용하는 메모나 카테고리를 즐겨찾기할 수 있습니다.\n\n🎯 직접 해보세요!\n1. 메모나 카테고리를 우클릭\n2. "빠른 탐색에 추가" 선택\n3. 우측 하단의 버튼으로 즐겨찾기 목록 열기\n\n페이지가 달라도 바로 이동할 수 있습니다.',
    targetElement: '[data-tutorial="quick-nav-btn"]',
    position: 'left',
    action: 'none'
  },

  // === 완료 ===
  {
    id: 'complete',
    title: '튜토리얼 완료! 🎉',
    description: '모든 주요 기능을 체험해보셨습니다!\n\n이제 자유롭게 마인드맵 메모 앱을 사용해보세요.\n\n✅ 캔버스: 이동, 줌, 메모 배치, 연결\n✅ 좌측 패널: 페이지 관리, 검색\n✅ 우측 패널: 제목, 태그, 텍스트, 파일, 중요도\n\n언제든지 좌측 상단의 "?" 버튼으로 튜토리얼을 다시 볼 수 있습니다.',
    position: 'center',
    action: 'none',
    nextButtonText: '시작하기'
  }
];
