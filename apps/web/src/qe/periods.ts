import { reportPeriods, shiftDay, type Period } from "./assistant";

export function reportDate(question: string, date: string): string {
  const match = question.match(/(\d{4})\s*[-年]\s*(\d{1,2})(?:\s*[-月]\s*(\d{1,2}))?/);
  if (!match) return date;
  const requested = `${match[1]}-${match[2].padStart(2, "0")}-${(match[3] ?? "1").padStart(2, "0")}`;
  const result = new Date(`${requested}T00:00:00Z`);
  return Number.isFinite(result.valueOf()) && result.toISOString().startsWith(requested) ? requested : date;
}

export function selectedPeriods(question: string, date: string, params: URLSearchParams): [Period, Period] {
  if (/昨[天日]/.test(question)) {
    const yesterday = shiftDay(date, -1);
    const prior = shiftDay(date, -2);
    return [{ start: yesterday, end: yesterday }, { start: prior, end: prior }];
  }
  const explicitDate = question.match(/\b\d{4}\s*[-年]\s*\d{1,2}(?:\s*[-月]\s*(\d{1,2}))?/);
  if (explicitDate && !/周/.test(question)) {
    if (explicitDate[1]) return [{ start: date, end: date }, { start: shiftDay(date, -1), end: shiftDay(date, -1) }];
    return reportPeriods(date, "month");
  }
  const start = params.get("from");
  const end = params.get("to");
  const pageYear = params.get("period");
  if (params.get("dimension") === "year" && pageYear && /^20\d{2}$/.test(pageYear) && !/周|月|昨日|昨天/.test(question)) {
    const prior = Number(pageYear) - 1;
    return [{ start: `${pageYear}-01-01`, end: `${pageYear}-12-31` }, { start: `${prior}-01-01`, end: `${prior}-12-31` }];
  }
  if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start <= end &&
    Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && !/本周|上周|本月|上月/.test(question)) {
    const duration = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
    return [{ start, end }, { start: shiftDay(start, -duration), end: shiftDay(start, -1) }];
  }
  if (params.get("dimension") === "day" && /^\d{4}-\d{2}-\d{2}$/.test(params.get("period") ?? "") && !/本周|上周|本月|上月/.test(question)) {
    const day = reportDate(params.get("period")!, date);
    const prior = shiftDay(day, -1);
    return [{ start: day, end: day }, { start: prior, end: prior }];
  }
  const monthly = /月/.test(question) || params.get("dimension") === "month";
  const anchor = !/本周|上周|本月|上月/.test(question) && monthly ? reportDate(params.get("period") ?? "", date) : date;
  return reportPeriods(anchor, monthly ? "month" : "week", /上周|上月/.test(question));
}
