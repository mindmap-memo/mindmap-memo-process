'use client';

import React, { useState, useEffect } from 'react';
import styles from './analytics.module.scss';

interface CohortData {
  cohort: string;
  totalUsers: number;
  retentionByPeriod: {
    period: number;
    activeUsers: number;
    newUsers: number;
    weekly2Days: number;
    weekly3Days: number;
    weekly4Plus: number;
    retentionRate: number;
  }[];
  type: 'week' | 'day';
}

interface DeviceStats {
  deviceType: string;
  userCount: number;
  sessionCount: number;
  avgDurationSeconds: number;
}

interface StatsData {
  overview: {
    totalUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    newUsers: number;
    weekly2Days: number;
    weekly3Days: number;
    weekly4Plus: number;
  };
  dailyActiveUsers: { date: string; users: number }[];
  dailyUserTypes: {
    date: string;
    newUsers: number;
    weekly2Days: number;
    weekly3Days: number;
    weekly4Plus: number;
  }[];
  eventCounts: { eventType: string; count: number; uniqueUsers: number }[];
  dailyEvents: { date: string; count: number }[];
  newUsers: { date: string; count: number }[];
  todayActiveUsers: { email: string; lastActive: string }[];
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
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [userFilter, setUserFilter] = useState<'all' | 'returning' | 'new'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'tablet' | 'desktop'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

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
      const [statsRes, cohortRes, devicesRes] = await Promise.all([
        fetch(`/api/analytics/stats?days=${days}`),
        fetch(`/api/analytics/cohort?type=day`),
        fetch(`/api/analytics/devices?days=${days}`),
      ]);

      const stats = await statsRes.json();
      const cohort = await cohortRes.json();
      const devices = await devicesRes.json();

      setStatsData(stats);
      setCohortData(cohort.cohorts || []);
      setDeviceStats(devices.devices || []);
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
  }, [days]);

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
            {/* 필터 */}
            <div className={styles.filterContainer}>
              {/* 사용자 타입 필터 */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className={`${styles.filterButton} ${userFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setUserFilter('all')}
                >
                  전체 사용자
                </button>
                <button
                  className={`${styles.filterButton} ${userFilter === 'returning' ? styles.active : ''}`}
                  onClick={() => setUserFilter('returning')}
                >
                  재방문자
                </button>
                <button
                  className={`${styles.filterButton} ${userFilter === 'new' ? styles.active : ''}`}
                  onClick={() => setUserFilter('new')}
                >
                  신규 사용자
                </button>
              </div>

              {/* 기기 필터 */}
              <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setDeviceFilter('all')}
                >
                  전체 기기
                </button>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'mobile' ? styles.active : ''}`}
                  onClick={() => setDeviceFilter('mobile')}
                >
                  📱 모바일
                </button>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'tablet' ? styles.active : ''}`}
                  onClick={() => setDeviceFilter('tablet')}
                >
                  💻 태블릿
                </button>
                <button
                  className={`${styles.filterButton} ${deviceFilter === 'desktop' ? styles.active : ''}`}
                  onClick={() => setDeviceFilter('desktop')}
                >
                  🖥️ PC
                </button>
              </div>
            </div>

            {/* 전체 통계 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>총 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.totalUsers || 0}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>신규 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.newUsers || 0}</div>
                <div className={styles.statSubtext} style={{ color: '#10b981' }}>
                  최근 7일
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>주 2일 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.weekly2Days || 0}</div>
                <div className={styles.statSubtext} style={{ color: '#fbbf24' }}>
                  최근 7일
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>주 3일 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.weekly3Days || 0}</div>
                <div className={styles.statSubtext} style={{ color: '#f97316' }}>
                  최근 7일
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>주 4일+ 사용자</div>
                <div className={styles.statValue}>{statsData?.overview.weekly4Plus || 0}</div>
                <div className={styles.statSubtext} style={{ color: '#8b5cf6' }}>
                  최근 7일 (최고 리텐션)
                </div>
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
              <h2>기기별 사용 통계</h2>
              <div className={styles.statsGrid}>
                {deviceStats.map((device) => {
                  const deviceEmoji = device.deviceType === 'mobile' ? '📱' : device.deviceType === 'tablet' ? '💻' : '🖥️';
                  const deviceName = device.deviceType === 'mobile' ? '모바일' : device.deviceType === 'tablet' ? '태블릿' : 'PC';

                  return (
                    <div key={device.deviceType} className={styles.statCard}>
                      <div className={styles.statLabel}>{deviceEmoji} {deviceName}</div>
                      <div className={styles.statValue}>{device.userCount}명</div>
                      <div className={styles.statSubtext}>
                        {device.sessionCount}회 세션 · 평균 {Math.floor(device.avgDurationSeconds / 60)}분
                      </div>
                    </div>
                  );
                })}
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
              {userFilter === 'all' ? (
                <div className={styles.chartContainer}>
                  {statsData?.dailyUserTypes.slice(0, 14).reverse().map((day) => {
                    const maxUsers = Math.max(...(statsData?.dailyUserTypes.map(d =>
                      d.newUsers + d.weekly2Days + d.weekly3Days + d.weekly4Plus
                    ) || [1]));
                    const totalUsers = day.newUsers + day.weekly2Days + day.weekly3Days + day.weekly4Plus;
                    const newPercent = totalUsers > 0 ? (day.newUsers / totalUsers) * 100 : 0;
                    const week2Percent = totalUsers > 0 ? (day.weekly2Days / totalUsers) * 100 : 0;
                    const week3Percent = totalUsers > 0 ? (day.weekly3Days / totalUsers) * 100 : 0;
                    const week4Percent = totalUsers > 0 ? (day.weekly4Plus / totalUsers) * 100 : 0;

                    return (
                      <div key={day.date} className={styles.barItem}>
                        <div className={styles.barLabel}>{day.date.slice(5)}</div>
                        <div className={styles.barContainer}>
                          <div className={styles.stackedBar} style={{ width: `${(totalUsers / maxUsers) * 100}%` }}>
                            {day.newUsers > 0 && (
                              <div
                                className={styles.stackedBarSegment}
                                style={{
                                  width: `${newPercent}%`,
                                  backgroundColor: '#10b981',
                                  position: 'relative'
                                }}
                                title={`신규: ${day.newUsers}`}
                              >
                                <span className={styles.segmentLabel}>{day.newUsers}</span>
                              </div>
                            )}
                            {day.weekly2Days > 0 && (
                              <div
                                className={styles.stackedBarSegment}
                                style={{
                                  width: `${week2Percent}%`,
                                  backgroundColor: '#fbbf24',
                                  position: 'relative'
                                }}
                                title={`주 2일: ${day.weekly2Days}`}
                              >
                                <span className={styles.segmentLabel}>{day.weekly2Days}</span>
                              </div>
                            )}
                            {day.weekly3Days > 0 && (
                              <div
                                className={styles.stackedBarSegment}
                                style={{
                                  width: `${week3Percent}%`,
                                  backgroundColor: '#f97316',
                                  position: 'relative'
                                }}
                                title={`주 3일: ${day.weekly3Days}`}
                              >
                                <span className={styles.segmentLabel}>{day.weekly3Days}</span>
                              </div>
                            )}
                            {day.weekly4Plus > 0 && (
                              <div
                                className={styles.stackedBarSegment}
                                style={{
                                  width: `${week4Percent}%`,
                                  backgroundColor: '#8b5cf6',
                                  position: 'relative'
                                }}
                                title={`주 4일+: ${day.weekly4Plus}`}
                              >
                                <span className={styles.segmentLabel}>{day.weekly4Plus}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : userFilter === 'returning' ? (
                <div className={styles.chartContainer}>
                  {statsData?.dailyUserTypes.slice(0, 14).reverse().map((day) => {
                    const returningUsers = day.weekly2Days + day.weekly3Days + day.weekly4Plus;
                    const maxUsers = Math.max(...(statsData?.dailyUserTypes.map(d =>
                      d.weekly2Days + d.weekly3Days + d.weekly4Plus
                    ) || [1]));
                    return (
                      <div key={day.date} className={styles.barItem}>
                        <div className={styles.barLabel}>{day.date.slice(5)}</div>
                        <div className={styles.barContainer}>
                          <div
                            className={styles.bar}
                            style={{
                              width: `${(returningUsers / maxUsers) * 100}%`,
                              backgroundColor: '#8b5cf6'
                            }}
                          >
                            {returningUsers}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.chartContainer}>
                  {statsData?.dailyUserTypes.slice(0, 14).reverse().map((day) => {
                    const maxUsers = Math.max(...(statsData?.dailyUserTypes.map(d => d.newUsers) || [1]));
                    return (
                      <div key={day.date} className={styles.barItem}>
                        <div className={styles.barLabel}>{day.date.slice(5)}</div>
                        <div className={styles.barContainer}>
                          <div
                            className={styles.bar}
                            style={{
                              width: `${(day.newUsers / maxUsers) * 100}%`,
                              backgroundColor: '#10b981'
                            }}
                          >
                            {day.newUsers}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={styles.legend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }} />
                  <span>신규 사용자</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#fbbf24' }} />
                  <span>주 2일 사용자</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#f97316' }} />
                  <span>주 3일 사용자</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#8b5cf6' }} />
                  <span>주 4일+ 사용자</span>
                </div>
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

            {/* 당일 활성 사용자 */}
            <section className={styles.section}>
              <h2>당일 활성 사용자 ({statsData?.todayActiveUsers?.length || 0}명)</h2>
              <div className={styles.userList}>
                {statsData?.todayActiveUsers && statsData.todayActiveUsers.length > 0 ? (
                  statsData.todayActiveUsers.map((user) => (
                    <div key={user.email} className={styles.userItem}>
                      <div className={styles.userEmail}>{user.email}</div>
                      <div className={styles.userLastActive}>
                        {new Date(user.lastActive).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.noData}>당일 활성 사용자가 없습니다.</p>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.cohortHeader}>
              <h2>코호트 리텐션 분석</h2>
            </div>
            {cohortData.length === 0 ? (
              <p className={styles.noData}>데이터가 없습니다. 사용자가 앱을 사용하면 데이터가 수집됩니다.</p>
            ) : (
              <div className={styles.cohortChart}>
                {/* 꺾은선 그래프 - 통합 평균 리텐션 */}
                <div className={styles.lineChartContainer} style={{ position: 'relative' }}>
                  <svg className={styles.lineChart} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                    {/* 그리드 라인 */}
                    {[0, 20, 40, 60, 80, 100].map((percent) => (
                      <g key={percent}>
                        <line
                          x1="60"
                          y1={340 - (percent * 2.8)}
                          x2="780"
                          y2={340 - (percent * 2.8)}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                        />
                        <text
                          x="45"
                          y={340 - (percent * 2.8) + 5}
                          fontSize="12"
                          fill="#6b7280"
                          textAnchor="end"
                        >
                          {percent}%
                        </text>
                      </g>
                    ))}

                    {/* X축 라벨 및 평균 리텐션 계산 */}
                    {(() => {
                      // 오늘 날짜 (KST 기준)
                      const today = new Date();
                      today.setHours(today.getHours() + 9); // UTC -> KST
                      const todayStr = today.toISOString().split('T')[0];

                      // 각 Day별 평균 리텐션 계산 (실제 데이터가 있는 Day만)
                      const maxPeriod = Math.max(...cohortData.map(c => c.retentionByPeriod.length));
                      const avgRetentionByDay = [];

                      for (let dayIdx = 0; dayIdx < maxPeriod; dayIdx++) {
                        // 이 Day에 유효한 코호트들만 필터링 (목표 날짜가 오늘 이전)
                        const validCohorts = cohortData.filter(cohort => {
                          if (!cohort.retentionByPeriod[dayIdx]) return false;

                          // 코호트 시작일 + dayIdx = 목표 날짜
                          const cohortDate = new Date(cohort.cohort);
                          cohortDate.setHours(cohortDate.getHours() + 9); // UTC -> KST
                          cohortDate.setDate(cohortDate.getDate() + dayIdx);
                          const targetDateStr = cohortDate.toISOString().split('T')[0];

                          // 목표 날짜가 오늘 이전이거나 같으면 유효
                          return targetDateStr <= todayStr;
                        });

                        // 유효한 코호트가 하나도 없으면 미래 데이터이므로 건너뛰기
                        if (validCohorts.length === 0) continue;

                        // 유효한 코호트들의 리텐션 평균 계산 (0%도 포함)
                        const retentionsForDay = validCohorts.map(c => c.retentionByPeriod[dayIdx].retentionRate);
                        const avgRetention = retentionsForDay.reduce((sum, val) => sum + val, 0) / retentionsForDay.length;

                        avgRetentionByDay.push({
                          period: dayIdx,
                          avgRetention: Math.round(avgRetention * 10) / 10,
                          cohortCount: validCohorts.length
                        });
                      }

                      if (avgRetentionByDay.length === 0) {
                        return <text x="400" y="200" fontSize="14" fill="#6b7280" textAnchor="middle">데이터가 충분하지 않습니다</text>;
                      }

                      const color = '#8b5cf6';
                      const points = avgRetentionByDay.map((day, idx) => {
                        const x = 60 + (idx * (720 / (avgRetentionByDay.length - 1)));
                        const y = 340 - (day.avgRetention * 2.8);
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <>
                          {/* X축 라벨 */}
                          {avgRetentionByDay.map((day, idx) => {
                            const x = 60 + (idx * (720 / (avgRetentionByDay.length - 1)));
                            return (
                              <text
                                key={day.period}
                                x={x}
                                y="370"
                                fontSize="12"
                                fill="#6b7280"
                                textAnchor="middle"
                              >
                                Day {day.period}
                              </text>
                            );
                          })}

                          {/* 평균 리텐션 선 */}
                          <g>
                            <polyline
                              points={points}
                              fill="none"
                              stroke={color}
                              strokeWidth="3"
                            />
                            {avgRetentionByDay.map((day, idx) => {
                              const x = 60 + (idx * (720 / (avgRetentionByDay.length - 1)));
                              const y = 340 - (day.avgRetention * 2.8);
                              const isHovered = hoveredPoint === idx;

                              return (
                                <circle
                                  key={day.period}
                                  cx={x}
                                  cy={y}
                                  r={isHovered ? 7 : 5}
                                  fill={color}
                                  style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                                  onMouseEnter={() => setHoveredPoint(idx)}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                              );
                            })}
                          </g>
                        </>
                      );
                    })()}
                  </svg>

                  {/* HTML 툴팁 (SVG 외부) */}
                  {hoveredPoint !== null && (() => {
                    const today = new Date();
                    today.setHours(today.getHours() + 9);
                    const todayStr = today.toISOString().split('T')[0];

                    const maxPeriod = Math.max(...cohortData.map(c => c.retentionByPeriod.length));
                    const avgRetentionByDay = [];

                    for (let dayIdx = 0; dayIdx < maxPeriod; dayIdx++) {
                      const validCohorts = cohortData.filter(cohort => {
                        if (!cohort.retentionByPeriod[dayIdx]) return false;
                        const cohortDate = new Date(cohort.cohort);
                        cohortDate.setHours(cohortDate.getHours() + 9);
                        cohortDate.setDate(cohortDate.getDate() + dayIdx);
                        const targetDateStr = cohortDate.toISOString().split('T')[0];
                        return targetDateStr <= todayStr;
                      });

                      if (validCohorts.length === 0) continue;

                      const retentionsForDay = validCohorts.map(c => c.retentionByPeriod[dayIdx].retentionRate);
                      const avgRetention = retentionsForDay.reduce((sum, val) => sum + val, 0) / retentionsForDay.length;

                      avgRetentionByDay.push({
                        period: dayIdx,
                        avgRetention: Math.round(avgRetention * 10) / 10,
                        cohortCount: validCohorts.length
                      });
                    }

                    if (!avgRetentionByDay[hoveredPoint]) return null;

                    const day = avgRetentionByDay[hoveredPoint];
                    const svgRect = document.querySelector(`.${styles.lineChart}`)?.getBoundingClientRect();
                    if (!svgRect) return null;

                    const x = 60 + (hoveredPoint * (720 / (avgRetentionByDay.length - 1)));
                    const y = 340 - (day.avgRetention * 2.8);

                    // viewBox (800x400) 기준으로 실제 픽셀 위치 계산
                    const xPercent = x / 800;
                    const yPercent = y / 400;
                    const pixelX = svgRect.left + (svgRect.width * xPercent);
                    const pixelY = svgRect.top + (svgRect.height * yPercent);

                    return (
                      <div
                        style={{
                          position: 'fixed',
                          left: `${pixelX}px`,
                          top: `${pixelY - 70}px`,
                          transform: 'translateX(-50%)',
                          background: 'rgba(0, 0, 0, 0.9)',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          pointerEvents: 'none',
                          zIndex: 1000,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                          Day {day.period}
                        </div>
                        <div style={{ fontSize: '18px', color: '#a78bfa' }}>
                          {day.avgRetention}%
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                          {day.cohortCount}개 코호트 평균
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 통합 리텐션 범례 */}
                <div className={styles.cohortLegend}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ backgroundColor: '#8b5cf6' }} />
                    <span>평균 리텐션 (전체 코호트 통합)</span>
                  </div>
                </div>

                {/* 리텐션 테이블 */}
                <div className={styles.retentionHeatmap}>
                  <table>
                    <thead>
                      <tr>
                        <th>코호트</th>
                        <th>사용자</th>
                        {cohortData[0]?.retentionByPeriod.map((period) => (
                          <th key={period.period}>
                            Day {period.period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((cohort) => {
                        // 날짜 형식을 "11/1" 형태로 변환
                        const formatDate = (dateStr: string) => {
                          const date = new Date(dateStr);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        };

                        return (
                        <tr key={cohort.cohort}>
                          <td className={styles.cohortLabel}>{formatDate(cohort.cohort)}</td>
                          <td className={styles.volumeCell}>{cohort.totalUsers.toLocaleString()}</td>
                          {cohort.retentionByPeriod.map((period) => {
                            const opacity = Math.min(period.retentionRate / 100, 1);
                            return (
                              <td
                                key={period.period}
                                className={styles.retentionHeatCell}
                                style={{
                                  backgroundColor: `rgba(59, 130, 246, ${opacity * 0.6})`,
                                  color: opacity > 0.5 ? 'white' : '#1f2937'
                                }}
                              >
                                <div className={styles.cellPercent}>{period.retentionRate.toFixed(1)}%</div>
                                <div className={styles.cellCount}>{period.activeUsers.toLocaleString()}</div>
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
