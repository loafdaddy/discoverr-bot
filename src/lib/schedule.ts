/**
 * Resolve the daily post schedule from env.
 *
 * Precedence:
 * 1. CRON_SCHEDULE (full cron expression)
 * 2. POST_TIME (HH:MM, 24-hour) → daily at that time
 * 3. POST_HOUR (+ optional POST_MINUTE) → daily at that time
 * 4. Default 09:00 → `0 9 * * *`
 */
export function resolveCronSchedule(env: NodeJS.ProcessEnv = process.env): string {
  const cron = env.CRON_SCHEDULE?.trim();
  if (cron) return cron;

  const postTime = env.POST_TIME?.trim();
  if (postTime) {
    return cronFromPostTime(postTime);
  }

  const hourRaw = env.POST_HOUR?.trim();
  if (hourRaw) {
    const hour = parseClockPart(hourRaw, "POST_HOUR", 0, 23);
    const minuteRaw = env.POST_MINUTE?.trim() || "0";
    const minute = parseClockPart(minuteRaw, "POST_MINUTE", 0, 59);
    return `${minute} ${hour} * * *`;
  }

  return "0 9 * * *";
}

export function cronFromPostTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid POST_TIME "${value}". Use 24-hour HH:MM, for example 09:00 or 18:30.`
    );
  }

  const hour = parseClockPart(match[1], "POST_TIME hour", 0, 23);
  const minute = parseClockPart(match[2], "POST_TIME minute", 0, 59);
  return `${minute} ${hour} * * *`;
}

function parseClockPart(raw: string, label: string, min: number, max: number): number {
  if (!/^\d{1,2}$/.test(raw)) {
    throw new Error(`Invalid ${label}: "${raw}" (expected an integer)`);
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${label}: ${raw} (expected ${min}-${max})`);
  }
  return value;
}

/** Human-readable summary for logs/docs, e.g. "09:00". */
export function describeDailyCron(cron: string): string | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dom, month, dow] = parts;
  if (dom !== "*" || month !== "*" || dow !== "*") return null;
  if (!/^\d{1,2}$/.test(minute) || !/^\d{1,2}$/.test(hour)) return null;
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}
