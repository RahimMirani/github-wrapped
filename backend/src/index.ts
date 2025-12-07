import express from "express";
import { getContributionCalendar } from "./github/contributions";
import { getUserEvents } from "./github/events";
import { getUserReposWithLanguages } from "./github/repos";
import { WrappedResponse } from "./types";
import { computeTemporalStats, computeKeywordCounts } from "./github/stats";

const app = express();
app.use(express.json());

const DEFAULT_YEAR = 2025;
function computeFameScore(stars: number, forks: number, totalContributions: number) {
  const score = Math.log10(1 + stars * 2 + forks * 3 + totalContributions) * 20;
  return Math.min(100, Math.round(score));
}

app.get("/", (_req, res) => {
  res.json({ status: "Backend is running" });
});

app.get("/api/wrapped/:username", async (req, res) => {
  const { username } = req.params;
  const year = DEFAULT_YEAR;

  try {
    const [contrib, events, repos] = await Promise.all([
      getContributionCalendar(username, year),
      getUserEvents(username, year),
      getUserReposWithLanguages(username),
    ]);

    const temporal = computeTemporalStats(events.eventTimestamps);
    const keywords = computeKeywordCounts(events.commitMessages);
    const totalContributions = contrib.totalContributions;
    const fameScore = computeFameScore(repos.starsEarned, repos.forksReceived, totalContributions);
    const response: WrappedResponse = {
      username,
      generatedAt: new Date().toISOString(),
      meta: { fromCache: false, year },
      basicStats: {
        totalContributions,
        commitCount: events.commitCount,
        prOpened: events.prOpened,
        prMerged: events.prMerged,
        issuesOpened: events.issuesOpened,
        issuesClosed: events.issuesClosed,
        reviewsGiven: events.reviewsGiven,
        reposContributedTo: events.reposContributedTo,
        starsEarned: repos.starsEarned,
        topLanguages: repos.topLanguages,
        longestStreak: contrib.longestStreak,
      },
      flexStats: {
        percentile: 0,
        fameScore: repos.starsEarned, // placeholder heuristic
        eliteBadges: [],
        forksReceived: repos.forksReceived,
        collabCount: 0,
        eliteBadges: repos.eliteRepos.map((name) => `Elite repo: ${name}`),
      },
      roastStats: {
        nightOwlPct: temporal.nightOwlPct,
        weekendPct: temporal.weekendPct,
        commitMessageWords: keywords,
        mergeConflictSurvivor: 0,
        refactorRatio: 0,
      },
      timeline: {
        activityByDay: contrib.activityByDay,
        languageByMonth: [],
      },
      notes: [],
    };

    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

