import { ghGraphQL } from "./client";
import type { LanguageStat } from "../types";

interface RepoNode {
  name: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string } | null;
  languages: {
    edges: Array<{
      size: number;
      node: { name: string };
    }>;
  };
}

interface ReposResponse {
  user: {
    repositories: {
      nodes: RepoNode[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
}

const REPOS_PER_PAGE = 50;

export interface RepoAggregates {
  topLanguages: LanguageStat[];
  reposAnalyzed: number;
  starsEarned: number;
  forksReceived: number;
}

export async function getUserReposWithLanguages(username: string, maxPages = 4): Promise<RepoAggregates> {
  let hasNext = true;
  let cursor: string | null = null;
  const languageTotals = new Map<string, number>();
  let stars = 0;
  let forks = 0;
  let repoCount = 0;

  while (hasNext && repoCount < REPOS_PER_PAGE * maxPages) {
    const query = `
      query($username: String!, $after: String) {
        user(login: $username) {
          repositories(first: ${REPOS_PER_PAGE}, after: $after, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
            nodes {
              name
              stargazerCount
              forkCount
              primaryLanguage { name }
              languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node { name }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    const data = await ghGraphQL<ReposResponse>(query, { username, after: cursor });
    if (!data.user) throw new Error("User not found");

    const repos = data.user.repositories.nodes;
    repoCount += repos.length;
    for (const repo of repos) {
      stars += repo.stargazerCount;
      forks += repo.forkCount;
      for (const edge of repo.languages.edges) {
        const name = edge.node.name;
        const size = edge.size;
        languageTotals.set(name, (languageTotals.get(name) ?? 0) + size);
      }
    }

    hasNext = data.user.repositories.pageInfo.hasNextPage;
    cursor = data.user.repositories.pageInfo.endCursor;
  }

  const totalSize = Array.from(languageTotals.values()).reduce((sum, n) => sum + n, 0) || 1;
  const topLanguages = Array.from(languageTotals.entries())
    .map(([name, size]) => ({ name, percent: Math.round((size / totalSize) * 1000) / 10 })) // one decimal
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  return {
    topLanguages,
    reposAnalyzed: repoCount,
    starsEarned: stars,
    forksReceived: forks,
  };
}

