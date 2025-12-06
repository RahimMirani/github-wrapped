export interface ResponseMeta {
  cacheAgeSeconds?: number;
  fromCache: boolean;
  year: number;
}

export interface LanguageStat {
  name: string;
  percent: number;
}

export interface StreakStat {
  length: number;
  start: string | null;
  end: string | null;
}

export interface BasicStats {
  totalContributions: number;
  commitCount: number;
  prOpened: number;
  prMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  reviewsGiven: number;
  reposContributedTo: number;
  starsEarned: number;
  topLanguages: LanguageStat[];
  longestStreak: StreakStat;
}

export interface FlexStats {
  percentile: number;
  fameScore: number;
  eliteBadges: string[];
  forksReceived: number;
  collabCount: number;
}

export interface KeywordCount {
  word: string;
  count: number;
}

export interface RoastStats {
  nightOwlPct: number;
  weekendPct: number;
  commitMessageWords: KeywordCount[];
  mergeConflictSurvivor: number;
  refactorRatio: number;
}

export interface DayActivity {
  date: string;
  count: number;
}

export interface MonthlyLanguage {
  month: string;
  languages: LanguageStat[];
}

export interface Timeline {
  activityByDay: DayActivity[];
  languageByMonth: MonthlyLanguage[];
}

export interface WrappedResponse {
  username: string;
  generatedAt: string;
  meta: ResponseMeta;
  basicStats: BasicStats;
  flexStats: FlexStats;
  roastStats: RoastStats;
  timeline: Timeline;
  notes: string[];
}

