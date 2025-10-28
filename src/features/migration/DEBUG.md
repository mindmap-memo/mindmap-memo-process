# 마이그레이션 디버깅 가이드

개발 중 마이그레이션 기능을 테스트하고 디버깅하는 방법입니다.

## 개발자 도구 사용법

개발 환경(`npm run dev`)에서 브라우저 콘솔을 열면 `window.migrationDebug` 객체를 사용할 수 있습니다.

### 📊 상태 확인

```javascript
// 현재 마이그레이션 상태 출력
migrationDebug.print()

// 출력 예시:
// 🔍 마이그레이션 상태
//   구버전 데이터 존재: ✅
//   마이그레이션 완료: ❌
//   데이터 크기: 12.34 KB
//   페이지 수: 3
//   총 메모: 15
//   총 카테고리: 5
//   총 단축 이동: 2
//   백업 개수: 1

// 상태 객체로 반환
const status = migrationDebug.status()
console.log(status)
```

### 🧪 테스트 데이터 생성

```javascript
// 샘플 데이터 생성 (localStorage에 저장)
migrationDebug.createTestData()

// 테스트 데이터 내용:
// - 1개 페이지
// - 2개 메모 (연결선 포함)
// - 1개 카테고리
// - 1개 단축 이동
```

### 🔄 마이그레이션 플래그 관리

```javascript
// 마이그레이션 완료 플래그 리셋 (프롬프트 다시 보기)
migrationDebug.resetFlag()

// 마이그레이션 완료 플래그 강제 설정
migrationDebug.setCompleted()
```

### 📦 localStorage 데이터 확인

```javascript
// 전체 localStorage 데이터 출력 (키와 크기)
migrationDebug.printAll()

// 특정 키 데이터 출력
migrationDebug.printKey('mindmap_pages')
migrationDebug.printKey('mindmap_migration_completed')
```

### 💾 백업 관리

```javascript
// 가장 최근 백업에서 복원
migrationDebug.restore()

// 특정 백업에서 복원
migrationDebug.restore('mindmap_pages_backup_2025-01-28T12-00-00-000Z')

// 모든 백업 삭제
migrationDebug.clearBackups()
```

### 🗑️ 데이터 초기화

```javascript
// 전체 마이그레이션 데이터 삭제 (확인 프롬프트 표시)
// ⚠️ 주의: 메인 데이터, 플래그, 모든 백업 삭제
migrationDebug.resetAll()
```

## 디버깅 시나리오

### 시나리오 1: 신규 사용자 테스트

```javascript
// 1. 모든 데이터 초기화
migrationDebug.resetAll()

// 2. 페이지 새로고침
// → 마이그레이션 프롬프트가 표시되지 않아야 함
```

### 시나리오 2: 구버전 사용자 (마이그레이션 필요)

```javascript
// 1. 테스트 데이터 생성
migrationDebug.createTestData()

// 2. 마이그레이션 플래그 리셋 (이미 완료한 경우)
migrationDebug.resetFlag()

// 3. 페이지 새로고침
// → 로그인 후 마이그레이션 프롬프트가 표시되어야 함

// 4. "데이터 이전하기" 클릭
// → 서버로 데이터 전송 및 성공 메시지 표시
```

### 시나리오 3: 마이그레이션 완료 사용자

```javascript
// 1. 테스트 데이터 생성
migrationDebug.createTestData()

// 2. 마이그레이션 완료 플래그 설정
migrationDebug.setCompleted()

// 3. 페이지 새로고침
// → 마이그레이션 프롬프트가 표시되지 않아야 함
```

### 시나리오 4: 마이그레이션 재시도

```javascript
// 1. 현재 상태 확인
migrationDebug.print()

// 2. 마이그레이션 플래그만 리셋
migrationDebug.resetFlag()

// 3. 페이지 새로고침
// → 같은 데이터로 마이그레이션 다시 시도 가능
// → 서버에서 중복 검사 후 이미 존재하는 데이터는 건너뜀
```

### 시나리오 5: 백업 복원 테스트

```javascript
// 1. 테스트 데이터 생성
migrationDebug.createTestData()

// 2. 마이그레이션 실행 (백업 자동 생성됨)
// 웹 UI에서 "데이터 이전하기" 클릭

// 3. 로컬 데이터 삭제
localStorage.removeItem('mindmap_pages')

// 4. 백업에서 복원
migrationDebug.restore()

// 5. 상태 확인
migrationDebug.print()
```

## API 엔드포인트 테스트

### curl로 직접 테스트

```bash
# 마이그레이션 API 호출
curl -X POST http://localhost:3000/api/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "pages": [
      {
        "id": "test-page",
        "name": "테스트 페이지",
        "memos": [],
        "categories": [],
        "quickNavItems": []
      }
    ]
  }'
```

### 브라우저 콘솔에서 fetch 사용

```javascript
// 현재 localStorage 데이터로 마이그레이션 테스트
const testMigration = async () => {
  const status = migrationDebug.status()

  if (!status.legacyData) {
    console.error('테스트 데이터가 없습니다. migrationDebug.createTestData() 실행')
    return
  }

  const response = await fetch('/api/migrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pages: status.legacyData }),
  })

  const result = await response.json()
  console.log('마이그레이션 결과:', result)
}

// 실행
testMigration()
```

## 네트워크 탭에서 확인

1. 브라우저 개발자 도구 → Network 탭 열기
2. "데이터 이전하기" 버튼 클릭
3. `/api/migrate` 요청 확인:
   - Request Payload: 전송된 데이터
   - Response: 서버 응답 (성공/실패, 결과)
   - Status Code: 200 (성공), 400/500 (에러)

## 로그 확인

### 클라이언트 로그

브라우저 콘솔에서 다음 로그 확인:
- `Migration error:` - 마이그레이션 에러
- `Migration completed` - 마이그레이션 성공
- `localStorage 로드 오류` - 데이터 로드 에러

### 서버 로그

터미널에서 다음 로그 확인:
```
Migration error: [에러 메시지]
POST /api/migrate 200 (성공)
POST /api/migrate 500 (서버 에러)
```

## 일반적인 문제 해결

### 1. 프롬프트가 표시되지 않음

```javascript
// 원인 확인
migrationDebug.print()

// 체크리스트:
// - 구버전 데이터 존재: ✅ 여야 함
// - 마이그레이션 완료: ❌ 여야 함
// - 로그인 상태 확인

// 해결:
migrationDebug.createTestData()  // 데이터 생성
migrationDebug.resetFlag()       // 플래그 리셋
```

### 2. 마이그레이션이 실패함

```javascript
// 1. 네트워크 탭에서 에러 확인
// 2. 콘솔에서 에러 메시지 확인
// 3. 데이터 검증
const status = migrationDebug.status()
console.log('전송할 데이터:', status.legacyData)
```

### 3. 중복 데이터가 생성됨

서버에서 중복 검사를 하지만, 만약 중복이 발생하면:

```sql
-- 데이터베이스에서 직접 확인
SELECT id, title FROM memos WHERE user_id = '[사용자ID]';

-- 중복 삭제 (주의!)
DELETE FROM memos WHERE id IN ('[중복ID1]', '[중복ID2]');
```

### 4. 백업 복원이 안 됨

```javascript
// 백업 목록 확인
const status = migrationDebug.status()
console.log('백업 목록:', status.backups)

// 특정 백업 복원
migrationDebug.restore('mindmap_pages_backup_[timestamp]')
```

## 개발 팁

1. **테스트 전 항상 백업**: 실제 데이터가 있다면 먼저 백업
   ```javascript
   const backup = localStorage.getItem('mindmap_pages')
   console.log('백업:', backup)
   ```

2. **단계별 테스트**: 각 시나리오를 순서대로 테스트

3. **상태 자주 확인**: 각 단계마다 `migrationDebug.print()` 실행

4. **네트워크 에러 시뮬레이션**: 개발자 도구 → Network → Offline 설정

5. **데이터 크기 테스트**: 대용량 데이터 생성해서 성능 확인
   ```javascript
   // TODO: 대용량 테스트 데이터 생성 함수 추가
   ```

## 체크리스트

마이그레이션 기능 배포 전 확인사항:

- [ ] 신규 사용자: 프롬프트 표시 안 됨
- [ ] 구버전 사용자 (로그인): 프롬프트 표시됨
- [ ] 구버전 사용자 (비로그인): 프롬프트 표시 안 됨
- [ ] 마이그레이션 성공: 데이터 서버에 저장됨
- [ ] 마이그레이션 성공: 플래그 설정됨
- [ ] 마이그레이션 실패: 에러 메시지 표시
- [ ] 마이그레이션 실패: 재시도 가능
- [ ] 백업 생성: 마이그레이션 전 자동 백업
- [ ] 중복 방지: 같은 데이터 여러 번 마이그레이션해도 중복 안 됨
- [ ] 로컬 데이터 삭제: 사용자 선택 시 삭제됨
- [ ] "나중에 하기": 플래그 설정, 프롬프트 닫힘

## 추가 리소스

- [README.md](./README.md) - 마이그레이션 기능 전체 문서
- [migrationUtils.ts](./utils/migrationUtils.ts) - 유틸 함수 코드
- [useMigration.ts](./hooks/useMigration.ts) - 훅 코드
- [API route.ts](../../../app/api/migrate/route.ts) - API 코드
