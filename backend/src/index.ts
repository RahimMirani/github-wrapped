import express from "express";
import { getContributionCalendar } from "./github/contributions";
import { WrappedResponse } from "./types";

const app = express();
app.use(express.json());

const DEFAULT_YEAR = 2025;

app.get("/", (_req, res) => {
  res.json({ status: "Backend is running" });
});

app.get("/api/wrapped/:username", async (req, res) => {
  const { username } = req.params;
  const year = DEFAULT_YEAR;

  try {
    const contrib = await getContributionCalendar(username, year);

    const response: WrappedResponse = {
      username,
      generatedAt: new Date().toISOString(),
      meta: { fromCache: false, year },
      basicStats: {
        totalContributions: contrib.totalContributions,
        commitCount: contrib.totalContributions, // placeholder mapping
        prOpened: 0,
        prMerged: 0,
        issuesOpened: 0,
        issuesClosed: 0,
        reviewsGiven: 0,
        reposContributedTo: 0,
        starsEarned: 0,
        topLanguages: [],
        longestStreak: contrib.longestStreak,
      },
      flexStats: {
        percentile: 0,
        fameScore: 0,
        eliteBadges: [],
        forksReceived: 0,
        collabCount: 0,
      },
      roastStats: {
        nightOwlPct: 0,
        weekendPct: 0,
        commitMessageWords: [],
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

