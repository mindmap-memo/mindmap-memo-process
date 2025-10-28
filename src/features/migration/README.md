# 로컬 데이터 마이그레이션 기능

기존 React 버전에서 브라우저 localStorage에 저장된 데이터를 Next.js + PostgreSQL 서버로 자동 마이그레이션하는 기능입니다.

## 폴더 구조

```
src/features/migration/
├── components/
│   └── MigrationPrompt.tsx      # 마이그레이션 UI 컴포넌트
├── hooks/
│   └── useMigration.ts          # 마이그레이션 로직 훅
├── utils/
│   ├── migrationUtils.ts        # 마이그레이션 유틸 함수
│   └── debugUtils.ts            # 디버깅 도구 (개발 환경 전용)
├── README.md                     # 이 파일
└── DEBUG.md                      # 디버깅 가이드

src/app/api/migrate/
└── route.ts                      # 마이그레이션 API 엔드포인트

src/scss/features/migration/
└── MigrationPrompt.module.scss   # 마이그레이션 UI 스타일
```

## 🐛 디버깅

개발 환경에서 브라우저 콘솔을 열고 `window.migrationDebug` 객체를 사용하여 테스트할 수 있습니다.

```javascript
// 현재 상태 확인
migrationDebug.print()

// 테스트 데이터 생성
migrationDebug.createTestData()

// 마이그레이션 플래그 리셋 (프롬프트 다시 보기)
migrationDebug.resetFlag()

// 더 많은 명령어는 DEBUG.md 참조
```

자세한 디버깅 방법은 [DEBUG.md](./DEBUG.md)를 참조하세요.

## 작동 방식

### 1. 자동 감지
- 앱 시작 시 `useMigration` 훅이 localStorage에서 구버전 데이터 확인
- `STORAGE_KEYS.PAGES` 키에 데이터가 있으면 마이그레이션 필요로 판단

### 2. 사용자 인증
- 마이그레이션은 **로그인한 사용자만** 가능
- 로그인하지 않은 상태에서는 마이그레이션 프롬프트가 표시되지 않음

### 3. 마이그레이션 프롬프트
사용자에게 다음 옵션 제공:
- **데이터 이전하기**: localStorage 데이터를 서버로 업로드
- **나중에 하기**: 마이그레이션을 건너뛰고 다음에 다시 시도

### 4. 데이터 전송
1. localStorage에서 모든 페이지 데이터 로드
2. 자동으로 백업 생성 (`mindmap_pages_backup_[timestamp]`)
3. `/api/migrate` POST 요청으로 서버에 전송
4. 서버에서 중복 검사 후 데이터 저장

### 5. 마이그레이션 완료
- 성공 시 마이그레이션 결과 표시 (페이지, 메모, 카테고리, 단축 이동 개수)
- 마이그레이션 완료 플래그 설정 (`mindmap_migration_completed`)
- 선택적으로 로컬 데이터 삭제 가능

## API 엔드포인트

### POST /api/migrate

**요청 본문:**
```json
{
  "pages": [
    {
      "id": "page-id",
      "name": "페이지 이름",
      "memos": [...],
      "categories": [...],
      "quickNavItems": [...]
    }
  ]
}
```

**응답:**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "results": {
    "pages": 3,
    "memos": 15,
    "categories": 5,
    "quickNavItems": 2
  }
}
```

## 주요 함수

### migrationUtils.ts

- `hasLegacyData()`: localStorage에 구버전 데이터가 있는지 확인
- `isMigrationCompleted()`: 마이그레이션이 이미 완료되었는지 확인
- `loadLegacyData()`: localStorage에서 데이터 로드 및 정규화
- `backupLegacyData()`: 원본 데이터 백업 생성
- `clearLegacyData()`: localStorage에서 구버전 데이터 삭제
- `setMigrationCompleted()`: 마이그레이션 완료 플래그 설정

### useMigration.ts

**반환값:**
- `status`: 현재 마이그레이션 상태 (`'idle' | 'pending' | 'migrating' | 'success' | 'error'`)
- `needsMigration`: 마이그레이션이 필요한지 여부
- `error`: 에러 메시지 (있는 경우)
- `result`: 마이그레이션 결과 (성공 시)
- `migrate()`: 마이그레이션 실행 함수
- `skipMigration()`: 마이그레이션 건너뛰기
- `deleteLegacyData()`: 로컬 데이터 삭제

## 사용 예시

```tsx
// App.tsx에서 사용
const migration = useMigration(!!session);

return (
  <div>
    {/* 메인 UI */}

    {/* 마이그레이션 프롬프트 */}
    {migration.needsMigration && session && (
      <MigrationPrompt
        status={migration.status}
        error={migration.error}
        result={migration.result}
        onMigrate={migration.migrate}
        onSkip={migration.skipMigration}
        onDeleteLegacy={migration.deleteLegacyData}
        onClose={() => {
          if (migration.status === 'success') {
            migration.skipMigration();
          }
        }}
      />
    )}
  </div>
);
```

## 데이터 안전성

1. **백업 생성**: 마이그레이션 전 자동으로 백업 생성
2. **중복 방지**: 서버에서 기존 데이터 확인 후 중복 없이 저장
3. **원자성**: 트랜잭션 단위로 저장 (일부 실패 시 전체 롤백)
4. **선택적 삭제**: 사용자가 원할 때만 로컬 데이터 삭제

## 에러 처리

- 네트워크 오류: 재시도 옵션 제공
- 인증 오류: 로그인 유도
- 데이터 형식 오류: 사용자에게 에러 메시지 표시
- 모든 에러는 콘솔에 로깅

## 테스트 시나리오

### 1. 신규 사용자
- localStorage에 데이터 없음
- 마이그레이션 프롬프트 표시 안 됨

### 2. 구버전 사용자 (로그인)
- localStorage에 데이터 있음
- 로그인 후 마이그레이션 프롬프트 표시
- 마이그레이션 실행 또는 건너뛰기 가능

### 3. 마이그레이션 완료 사용자
- localStorage에 데이터 있음
- 마이그레이션 완료 플래그 있음
- 프롬프트 표시 안 됨

### 4. 로그인하지 않은 구버전 사용자
- localStorage에 데이터 있음
- 로그인하지 않음
- 프롬프트 표시 안 됨 (로그인 후 표시됨)

## 향후 개선 사항

- [ ] 마이그레이션 진행률 표시
- [ ] 부분 마이그레이션 지원 (선택적으로 페이지만 이전)
- [ ] 마이그레이션 히스토리 관리
- [ ] 대용량 데이터 처리 최적화 (청크 단위 업로드)
