/**
 * 애널리틱스에서 제외할 이메일 목록
 * 개발자 및 테스트 계정
 */
export const EXCLUDED_EMAILS = [
  'movevibecom@gmail.com',
  'ghpjhjh@gmail.com',
];

/**
 * 이메일이 애널리틱스 추적에서 제외되어야 하는지 확인
 */
export const isEmailExcluded = (email?: string | null): boolean => {
  if (!email) return true;
  return EXCLUDED_EMAILS.includes(email.toLowerCase());
};
