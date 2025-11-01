/**
 * Analytics 타입 정의
 */

export type AnalyticsEventType =
  | 'session_start'
  | 'session_end'
  | 'memo_created'
  | 'memo_title_edited'
  | 'memo_content_edited'
  | 'file_attached'
  | 'connection_created'
  | 'category_created'
  | 'category_title_edited'
  | 'category_child_added'
  | 'page_created'
  | 'page_switched'
  | 'search_performed'
  | 'importance_assigned'
  | 'importance_filter_used'
  | 'quick_nav_created'
  | 'quick_nav_used'
  | 'tag_created'
  | 'tutorial_started'
  | 'tutorial_completed'
  | 'tutorial_step'
  | 'tutorial_abandoned';

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  userEmail: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
  createdAt: string;
}

export interface AnalyticsSession {
  id: string;
  userEmail: string;
  sessionStart: string;
  sessionEnd?: string;
  durationSeconds?: number;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenResolution?: string;
  createdAt: string;
}

export interface UserCohort {
  userEmail: string;
  firstLogin: string;
  cohortWeek: string;  // 'YYYY-WW'
  cohortMonth: string; // 'YYYY-MM'
  createdAt: string;
}

// 코호트 분석용 타입
export interface CohortRetention {
  cohort: string;
  totalUsers: number;
  retentionByWeek: {
    week: number;
    activeUsers: number;
    retentionRate: number;
  }[];
}

export interface EventStats {
  eventType: AnalyticsEventType;
  count: number;
  uniqueUsers: number;
}

export interface DailyStats {
  date: string;
  sessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  events: Record<AnalyticsEventType, number>;
}

export interface DeviceStats {
  deviceType: string;
  sessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  percentage: number;
}

export interface BrowserStats {
  browser: string;
  sessions: number;
  uniqueUsers: number;
  percentage: number;
}

export interface OSStats {
  os: string;
  sessions: number;
  uniqueUsers: number;
  percentage: number;
}
