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
      const [statsRes, cohortRes] = await Promise.all([
        fetch(`/api/analytics/stats?days=${days}`),
        fetch(`/api/analytics/cohort?type=${cohortType}`),
      ]);

      const stats = await statsRes.json();
      const cohort = await cohortRes.json();

      setStatsData(stats);
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
  }, [days, cohortType]);

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
              <select
                value={cohortType}
                onChange={(e) => setCohortType(e.target.value as 'week' | 'day')}
                className={styles.cohortTypeSelector}
              >
                <option value="week">주간 분석</option>
                <option value="day">일간 분석</option>
              </select>
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
