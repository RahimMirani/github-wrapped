function isNightOwl(date: Date): boolean {
  const hour = date.getUTCHours();
  return hour >= 0 && hour < 6; // 12am-6am UTC
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export function computeTemporalStats(timestamps: string[]) {
  if (!timestamps.length) return { nightOwlPct: 0, weekendPct: 0 };

  let night = 0;
  let weekend = 0;
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (isNightOwl(d)) night += 1;
    if (isWeekend(d)) weekend += 1;
  }
  const total = timestamps.length || 1;
  return {
    nightOwlPct: Math.round((night / total) * 100),
    weekendPct: Math.round((weekend / total) * 100),
  };
}

const DEFAULT_KEYWORDS = ["fix", "bug", "wip", "hack", "temp", "hotfix", "refactor"];

export function computeKeywordCounts(messages: string[], keywords = DEFAULT_KEYWORDS) {
  const counts = new Map<string, number>();
  const normalized = keywords.map((k) => k.toLowerCase());

  for (const msg of messages) {
    const lower = msg.toLowerCase();
    for (const kw of normalized) {
      if (lower.includes(kw)) {
        counts.set(kw, (counts.get(kw) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

