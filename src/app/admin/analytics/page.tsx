'use client';

import { useState, useEffect } from 'react';
import styles from './analytics.module.scss';

interface CohortData {
  cohort: string;
  totalUsers: number;
  retentionByPeriod: {
    period: number;
    activeUsers: number;
    retentionRate: number;
  }[];
  type: 'week' | 'day';
}

interface DeviceStats {
  deviceType: string;
  sessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  percentage: number;
}

interface BrowserStats {
  browser: string;
  sessions: number;
  uniqueUsers: number;
  percentage: number;
}

interface OSStats {
  os: string;
  sessions: number;
  uniqueUsers: number;
  percentage: number;
}

interface StatsData {
  overview: {
    totalUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
  };
  dailyActiveUsers: { date: string; users: number }[];
  eventCounts: { eventType: string; count: number; uniqueUsers: number }[];
  dailyEvents: { date: string; count: number }[];
  newUsers: { date: string; count: number }[];
  deviceStats?: DeviceStats[];
  browserStats?: BrowserStats[];
  osStats?: OSStats[];
}

const EVENT_NAMES: Record<string, string> = {
  memo_created: '메모 생성',
  connection_created: '연결선 생성',
  category_created: '카테고리 생성',
  page_created: '페이지 생성',
  search_performed: '검색',
  importance_assigned: '중요도 부여',
  importance_filter_used: '중요도 필터 사용',
  quick_nav_created: '단축 이동 생성',
  quick_nav_used: '단축 이동 사용',
  tag_created: '태그 생성',
  tutorial_started: '튜토리얼 시작',
  tutorial_completed: '튜토리얼 완료',
  tutorial_step: '튜토리얼 단계',
  tutorial_abandoned: '튜토리얼 이탈',
};

export default function AnalyticsPage() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cohort'>('dashboard');
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [cohortType, setCohortType] = useState<'week' | 'day'>('week');
  const [cohortDeviceFilter, setCohortDeviceFilter] = useState<string>('');
  const [cohortBrowserFilter, setCohortBrowserFilter] = useState<string>('');
  const [cohortOSFilter, setCohortOSFilter] = useState<string>('');

  const handleLogin = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'admin123') {
      setIsAuthorized(true);
      localStorage.setItem('analytics_auth', 'true');
      fetchData();
    } else {
      alert('비밀번호가 틀렸습니다');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 날짜 범위 계산
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // 코호트 필터 쿼리 파라미터 구성
      const cohortParams = new URLSearchParams({ type: cohortType });
      if (cohortDeviceFilter) cohortParams.append('deviceType', cohortDeviceFilter);
      if (cohortBrowserFilter) cohortParams.append('browser', cohortBrowserFilter);
      if (cohortOSFilter) cohortParams.append('os', cohortOSFilter);

      const [statsRes, cohortRes, deviceRes] = await Promise.all([
        fetch(`/api/analytics/stats?days=${days}`),
        fetch(`/api/analytics/cohort?${cohortParams.toString()}`),
        fetch(`/api/analytics/device-stats?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const stats = await statsRes.json();
      const cohort = await cohortRes.json();
      const device = await deviceRes.json();

      setStatsData({
        ...stats,
        deviceStats: device.deviceStats,
        browserStats: device.browserStats,
        osStats: device.osStats
      });
      setCohortData(cohort.cohorts || []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('analytics_auth');
    if (auth === 'true') {
      setIsAuthorized(true);
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [days, cohortType, cohortDeviceFilter, cohortBrowserFilter, cohortOSFilter]);

  if (!isAuthorized) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1>Analytics Admin</h1>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className={styles.passwordInput}
          />
          <button onClick={handleLogin} className={styles.loginButton}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Mindmap Memo Analytics</h1>
        <div className={styles.headerActions}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={styles.daySelector}
          >
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
          <button
            onClick={() => {
              setIsAuthorized(false);
              localStorage.removeItem('analytics_auth');
            }}
            className={styles.logoutButton}
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          대시보드
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cohort' ? styles.active : ''}`}
          onClick={() => setActiveTab('cohort')}
        >
          코호트 분석
        </button>
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : activeTab === 'dashboard' ? (
          <>
            {/* 전체 통계 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>총 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.totalUsers || 0}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>총 세션</div>
                <div className={styles.statValue}>{statsData?.overview.totalSessions || 0}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>평균 세션 시간</div>
                <div className={styles.statValue}>
                  {Math.floor((statsData?.overview.avgSessionDuration || 0) / 60)}분{' '}
                  {(statsData?.overview.avgSessionDuration || 0) % 60}초
                </div>
              </div>
            </div>

            {/* 기기별 통계 */}
            <section className={styles.section}>
              <h2>기기별 통계</h2>
              <div className={styles.deviceStatsGrid}>
                {/* 기기 타입 */}
                <div className={styles.deviceCard}>
                  <h3>기기 타입</h3>
                  {statsData?.deviceStats && statsData.deviceStats.length > 0 ? (
                    <div className={styles.deviceList}>
                      {statsData.deviceStats.map((device) => (
                        <div key={device.deviceType} className={styles.deviceItem}>
                          <div className={styles.deviceInfo}>
                            <span className={styles.deviceType}>{device.deviceType}</span>
                            <span className={styles.devicePercentage}>{device.percentage}%</span>
                          </div>
                          <div className={styles.deviceBar}>
                            <div
                              className={styles.deviceBarFill}
                              style={{ width: `${device.percentage}%` }}
                            />
                          </div>
                          <div className={styles.deviceDetails}>
                            세션: {device.sessions} | 사용자: {device.uniqueUsers} | 평균 시간:{' '}
                            {Math.floor(device.avgSessionDuration / 60)}분
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noData}>데이터 없음</p>
                  )}
                </div>

                {/* 브라우저 */}
                <div className={styles.deviceCard}>
                  <h3>브라우저</h3>
                  {statsData?.browserStats && statsData.browserStats.length > 0 ? (
                    <div className={styles.deviceList}>
                      {statsData.browserStats.map((browser) => (
                        <div key={browser.browser} className={styles.deviceItem}>
                          <div className={styles.deviceInfo}>
                            <span className={styles.deviceType}>{browser.browser}</span>
                            <span className={styles.devicePercentage}>{browser.percentage}%</span>
                          </div>
                          <div className={styles.deviceBar}>
                            <div
                              className={styles.deviceBarFill}
                              style={{ width: `${browser.percentage}%`, backgroundColor: '#10b981' }}
                            />
                          </div>
                          <div className={styles.deviceDetails}>
                            세션: {browser.sessions} | 사용자: {browser.uniqueUsers}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noData}>데이터 없음</p>
                  )}
                </div>

                {/* 운영체제 */}
                <div className={styles.deviceCard}>
                  <h3>운영체제</h3>
                  {statsData?.osStats && statsData.osStats.length > 0 ? (
                    <div className={styles.deviceList}>
                      {statsData.osStats.map((os) => (
                        <div key={os.os} className={styles.deviceItem}>
                          <div className={styles.deviceInfo}>
                            <span className={styles.deviceType}>{os.os}</span>
                            <span className={styles.devicePercentage}>{os.percentage}%</span>
                          </div>
                          <div className={styles.deviceBar}>
                            <div
                              className={styles.deviceBarFill}
                              style={{ width: `${os.percentage}%`, backgroundColor: '#f59e0b' }}
                            />
                          </div>
                          <div className={styles.deviceDetails}>
                            세션: {os.sessions} | 사용자: {os.uniqueUsers}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noData}>데이터 없음</p>
                  )}
                </div>
              </div>
            </section>

            {/* 이벤트 통계 */}
            <section className={styles.section}>
              <h2>이벤트 통계</h2>
              <div className={styles.eventGrid}>
                {statsData?.eventCounts.map((event) => (
                  <div key={event.eventType} className={styles.eventCard}>
                    <div className={styles.eventName}>
                      {EVENT_NAMES[event.eventType] || event.eventType}
                    </div>
                    <div className={styles.eventCount}>{event.count}회</div>
                    <div className={styles.eventUsers}>{event.uniqueUsers}명 사용</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 일별 활성 사용자 */}
            <section className={styles.section}>
              <h2>일별 활성 사용자 (DAU)</h2>
              <div className={styles.chartContainer}>
                {statsData?.dailyActiveUsers.slice(0, 14).reverse().map((day) => (
                  <div key={day.date} className={styles.barItem}>
                    <div className={styles.barLabel}>{day.date.slice(5)}</div>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.bar}
                        style={{ width: `${(day.users / Math.max(...(statsData?.dailyActiveUsers.map(d => d.users) || [1]))) * 100}%` }}
                      >
                        {day.users}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 신규 가입자 */}
            <section className={styles.section}>
              <h2>신규 가입자</h2>
              <div className={styles.chartContainer}>
                {statsData?.newUsers.slice(0, 14).reverse().map((day) => (
                  <div key={day.date} className={styles.barItem}>
                    <div className={styles.barLabel}>{day.date.slice(5)}</div>
                    <div className={styles.barContainer}>
                      <div
                        className={styles.bar}
                        style={{
                          width: `${(day.count / Math.max(...(statsData?.newUsers.map(d => d.count) || [1]))) * 100}%`,
                          backgroundColor: '#10b981'
                        }}
                      >
                        {day.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.cohortHeader}>
              <h2>코호트 리텐션 분석</h2>
              <div className={styles.cohortFilters}>
                <select
                  value={cohortType}
                  onChange={(e) => setCohortType(e.target.value as 'week' | 'day')}
                  className={styles.cohortTypeSelector}
                >
                  <option value="week">주간 분석</option>
                  <option value="day">일간 분석</option>
                </select>

                <select
                  value={cohortDeviceFilter}
                  onChange={(e) => setCohortDeviceFilter(e.target.value)}
                  className={styles.cohortFilterSelector}
                >
                  <option value="">전체 기기</option>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                </select>

                <select
                  value={cohortBrowserFilter}
                  onChange={(e) => setCohortBrowserFilter(e.target.value)}
                  className={styles.cohortFilterSelector}
                >
                  <option value="">전체 브라우저</option>
                  <option value="Chrome">Chrome</option>
                  <option value="Safari">Safari</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Edge">Edge</option>
                </select>

                <select
                  value={cohortOSFilter}
                  onChange={(e) => setCohortOSFilter(e.target.value)}
                  className={styles.cohortFilterSelector}
                >
                  <option value="">전체 OS</option>
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="iOS">iOS</option>
                  <option value="Android">Android</option>
                  <option value="Linux">Linux</option>
                </select>

                {(cohortDeviceFilter || cohortBrowserFilter || cohortOSFilter) && (
                  <button
                    onClick={() => {
                      setCohortDeviceFilter('');
                      setCohortBrowserFilter('');
                      setCohortOSFilter('');
                    }}
                    className={styles.clearFilterButton}
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            </div>
            {cohortData.length === 0 ? (
              <p className={styles.noData}>데이터가 없습니다. 사용자가 앱을 사용하면 데이터가 수집됩니다.</p>
            ) : (
              <div className={styles.cohortTable}>
                <table>
                  <thead>
                    <tr>
                      <th>코호트</th>
                      <th>총 사용자</th>
                      {cohortData[0]?.retentionByPeriod.map((period) => (
                        <th key={period.period}>
                          {cohortType === 'week' ? `Week ${period.period}` : `Day ${period.period}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohortData.map((cohort) => (
                      <tr key={cohort.cohort}>
                        <td>{cohort.cohort}</td>
                        <td>{cohort.totalUsers}</td>
                        {cohort.retentionByPeriod.map((period) => (
                          <td
                            key={period.period}
                            className={styles.retentionCell}
                            style={{
                              backgroundColor: `rgba(139, 92, 246, ${period.retentionRate / 100})`,
                            }}
                          >
                            {period.retentionRate.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
