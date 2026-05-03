import { toZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

const TZ = "America/Sao_Paulo";

export function nowSP(): Date {
  return toZonedTime(new Date(), TZ);
}

export function todayRange(): { start: Date; end: Date } {
  const now = nowSP();
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function monthRange(): { start: Date; end: Date } {
  const now = nowSP();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
