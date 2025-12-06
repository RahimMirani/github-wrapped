import { setTimeout as sleep } from "timers/promises";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const DEFAULT_USER_AGENT = "github-wrapped-app";

interface RequestOptions extends RequestInit {
  retry?: number;
  retryDelayMs?: number;
}

async function withRetries<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await sleep(delayMs * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleRateLimits(resp: Response) {
  if (resp.status === 403) {
    const reset = resp.headers.get("x-ratelimit-reset");
    const message = `GitHub rate limit reached${reset ? `; resets at ${new Date(Number(reset) * 1000).toISOString()}` : ""}`;
    throw new Error(message);
  }
}

export async function ghGet<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_URL}${path}`;
  const retry = opts.retry ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 500;

  return withRetries<T>(
    async () => {
      const resp = await fetch(url, {
        method: "GET",
        headers: { ...authHeaders(), ...(opts.headers as Record<string, string> | undefined) },
      });
      await handleRateLimits(resp);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`GitHub GET failed ${resp.status}: ${text}`);
      }
      return (await resp.json()) as T;
    },
    retry,
    retryDelayMs
  );
}

export async function ghGraphQL<T>(query: string, variables: Record<string, unknown> = {}, opts: RequestOptions = {}): Promise<T> {
  const retry = opts.retry ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 500;

  return withRetries<T>(
    async () => {
      const resp = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({ query, variables }),
      });
      await handleRateLimits(resp);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`GitHub GraphQL failed ${resp.status}: ${text}`);
      }
      const json = (await resp.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) {
        const messages = json.errors.map((e) => e.message).join("; ");
        throw new Error(`GitHub GraphQL errors: ${messages}`);
      }
      if (!json.data) {
        throw new Error("GitHub GraphQL: no data in response");
      }
      return json.data;
    },
    retry,
    retryDelayMs
  );
}

