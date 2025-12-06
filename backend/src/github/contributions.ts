import { ghGraphQL } from "./client";
import { DayActivity, StreakStat } from "../types";

interface ContributionDay {
  contributionCount: number;
  date: string;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionsCollection {
  contributionCalendar: {
    weeks: ContributionWeek[];
  };
}

interface ContributionResponse {
  user: {
    contributionsCollection: ContributionsCollection;
  } | null;
}

function computeStreak(days: ContributionDay[]): StreakStat {
  let longest = 0;
  let current = 0;
  let longestStart: string | null = null;
  let longestEnd: string | null = null;
  let currentStart: string | null = null;

  for (const day of days) {
    if (day.contributionCount > 0) {
      if (current === 0) currentStart = day.date;
      current += 1;
      if (current > longest) {
        longest = current;
        longestStart = currentStart;
        longestEnd = day.date;
      }
    } else {
      current = 0;
      currentStart = null;
    }
  }

  return { length: longest, start: longestStart, end: longestEnd };
}

export async function getContributionCalendar(username: string, year: number) {
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const data = await ghGraphQL<ContributionResponse>(query, { username, from, to });
  if (!data.user) {
    throw new Error("User not found");
  }

  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const days: DayActivity[] = weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
  );

  const longestStreak = computeStreak(
    days
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ contributionCount: d.count, date: d.date }))
  );

  const total = days.reduce((sum, d) => sum + d.count, 0);

  return {
    activityByDay: days,
    longestStreak,
    totalContributions: total,
  };
}

