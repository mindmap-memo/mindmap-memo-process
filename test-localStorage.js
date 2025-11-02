// 브라우저 콘솔에서 실행할 스크립트
// 로컬 스토리지에 테스트 데이터 추가

const testData = {
  pages: [
    {
      id: "test-page-1",
      name: "테스트 페이지",
      memos: [
        {
          id: "test-memo-1",
          title: "테스트",
          tags: ["테스트"],
          blocks: [
            {
              id: "test-block-1",
              type: "text",
              content: "테스트"
            }
          ],
          connections: [],
          position: { x: 100, y: 100 }
        },
        {
          id: "test-memo-2",
          title: "테스트",
          tags: ["테스트"],
          blocks: [
            {
              id: "test-block-2",
              type: "text",
              content: "테스트"
            }
          ],
          connections: [],
          position: { x: 300, y: 200 }
        },
        {
          id: "test-memo-3",
          title: "테스트",
          tags: ["테스트"],
          blocks: [
            {
              id: "test-block-3",
              type: "text",
              content: "테스트"
            }
          ],
          connections: [],
          position: { x: 500, y: 300 }
        }
      ],
      categories: []
    }
  ],
  selectedPageIndex: 0
};

// 로컬 스토리지에 저장
localStorage.setItem('mindmap-app-data', JSON.stringify(testData));

console.log('✅ 테스트 데이터가 로컬 스토리지에 추가되었습니다!');
console.log('데이터:', testData);
