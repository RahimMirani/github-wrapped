import { ghGet } from "./client";

export interface EventStats {
  commitCount: number;
  prOpened: number;
  prMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  reviewsGiven: number;
  reposContributedTo: number;
  eventTimestamps: string[];
  commitMessages: string[];
}

interface GithubEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: any;
}

const EVENTS_PER_PAGE = 100;

export async function getUserEvents(username: string, year: number, maxPages = 5): Promise<EventStats> {
  const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime();
  const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime();

  let commitCount = 0;
  let prOpened = 0;
  let prMerged = 0;
  let issuesOpened = 0;
  let issuesClosed = 0;
  let reviewsGiven = 0;
  const repos = new Set<string>();
  const eventTimestamps: string[] = [];
  const commitMessages: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const events = await ghGet<GithubEvent[]>(
      `/users/${username}/events/public?per_page=${EVENTS_PER_PAGE}&page=${page}`
    );
    if (!events.length) break;

    for (const ev of events) {
      const ts = new Date(ev.created_at).getTime();
      if (ts < yearStart) {
        // Events are reverse chronological; we can stop early if before the year.
        return {
          commitCount,
          prOpened,
          prMerged,
          issuesOpened,
          issuesClosed,
          reviewsGiven,
          reposContributedTo: repos.size,
          eventTimestamps,
          commitMessages,
        };
      }
      if (ts > yearEnd) continue; // future-dated safety

      eventTimestamps.push(ev.created_at);
      if (ev.repo?.name) repos.add(ev.repo.name);

      switch (ev.type) {
        case "PushEvent": {
          const commits = Array.isArray(ev.payload?.commits) ? ev.payload.commits.length : 0;
          commitCount += commits;
          if (Array.isArray(ev.payload?.commits)) {
            for (const c of ev.payload.commits) {
              if (typeof c?.message === "string") commitMessages.push(c.message);
            }
          }
          break;
        }
        case "PullRequestEvent": {
          const action = ev.payload?.action;
          const pr = ev.payload?.pull_request;
          if (action === "opened") prOpened += 1;
          if (action === "closed" && pr?.merged) prMerged += 1;
          break;
        }
        case "IssuesEvent": {
          const action = ev.payload?.action;
          if (action === "opened") issuesOpened += 1;
          if (action === "closed") issuesClosed += 1;
          break;
        }
        case "PullRequestReviewEvent": {
          const action = ev.payload?.action;
          if (action === "submitted") reviewsGiven += 1;
          break;
        }
        case "PullRequestReviewCommentEvent": {
          reviewsGiven += 1;
          break;
        }
        default:
          break;
      }
    }
  }

  return {
    commitCount,
    prOpened,
    prMerged,
    issuesOpened,
    issuesClosed,
    reviewsGiven,
    reposContributedTo: repos.size,
    eventTimestamps,
    commitMessages,
  };
}

