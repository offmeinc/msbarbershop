import { format } from "date-fns";

export interface WorkingHourRule {
  id?: string;
  barberId: string;
  type?: "weekly" | "date";
  dayOfWeek?: number; // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  date?: string; // "YYYY-MM-DD" for date-specific overrides
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive?: boolean;
  note?: string;
  updatedAt?: any;
}

export interface EffectiveHours {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  isOpen: boolean;
  source: "date" | "weekly" | "default";
  isExtended: boolean;
  extendedEarly: boolean;
  extendedLate: boolean;
  openedClosedDay: boolean;
  note?: string;
}

export function timeToMinutes(timeStr: string | undefined | null, fallback = 540): number {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) return fallback;
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function shiftTimeString(
  timeStr: string,
  deltaMinutes: number,
  minTime = "05:00",
  maxTime = "23:30"
): string {
  const mins = timeToMinutes(timeStr);
  const minMins = timeToMinutes(minTime, 300);
  const maxMins = timeToMinutes(maxTime, 1410);
  const next = Math.max(minMins, Math.min(maxMins, mins + deltaMinutes));
  return minutesToTime(next);
}

export function getDefaultHoursForDay(dayOfWeek: number): {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  isOpen: boolean;
} {
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return {
      startTime: "09:00",
      endTime: "20:00",
      startMinutes: 9 * 60,
      endMinutes: 20 * 60,
      isOpen: true,
    };
  }
  if (dayOfWeek === 6) {
    return {
      startTime: "09:00",
      endTime: "19:30",
      startMinutes: 9 * 60,
      endMinutes: 19 * 60 + 30,
      isOpen: true,
    };
  }
  // Domingo
  return {
    startTime: "09:00",
    endTime: "18:00",
    startMinutes: 9 * 60,
    endMinutes: 18 * 60,
    isOpen: false,
  };
}

export function isExtendedHours(
  effective: Pick<EffectiveHours, "isOpen" | "startMinutes" | "endMinutes">,
  dayOfWeek: number
): boolean {
  if (!effective.isOpen) return false;
  const def = getDefaultHoursForDay(dayOfWeek);
  return (
    !def.isOpen ||
    effective.startMinutes < def.startMinutes ||
    effective.endMinutes > def.endMinutes
  );
}

function buildEffectiveHours(
  startTime: string,
  endTime: string,
  isOpen: boolean,
  dayOfWeek: number,
  source: "date" | "weekly" | "default",
  note?: string
): EffectiveHours {
  const def = getDefaultHoursForDay(dayOfWeek);
  const safeStart = startTime || def.startTime;
  const safeEnd = endTime || def.endTime;
  let startMinutes = timeToMinutes(safeStart, def.startMinutes);
  let endMinutes = timeToMinutes(safeEnd, def.endMinutes);

  if (isOpen && endMinutes <= startMinutes) {
    endMinutes = Math.min(23 * 60 + 30, startMinutes + 60);
  }

  const normalizedStart = minutesToTime(startMinutes);
  const normalizedEnd = minutesToTime(endMinutes);

  const extendedEarly = isOpen && startMinutes < def.startMinutes;
  const extendedLate = isOpen && endMinutes > def.endMinutes;
  const openedClosedDay = isOpen && !def.isOpen;
  const isExtended = extendedEarly || extendedLate || openedClosedDay;

  return {
    startTime: normalizedStart,
    endTime: normalizedEnd,
    startMinutes,
    endMinutes,
    isOpen,
    source,
    isExtended,
    extendedEarly,
    extendedLate,
    openedClosedDay,
    note,
  };
}

export function getEffectiveHoursForBarberDate(
  rules: WorkingHourRule[],
  barberId: string | undefined | null,
  date: Date
): EffectiveHours {
  const dayOfWeek = date.getDay();
  const dateStr = format(date, "yyyy-MM-dd");
  const monthDay = format(date, "MM-dd");
  const def = getDefaultHoursForDay(dayOfWeek);

  // 1. Specific date override for this barber
  const dateRule = rules.find(
    (r) =>
      (!barberId || r.barberId === barberId) &&
      (r.type === "date" || Boolean(r.date)) &&
      r.date === dateStr
  );

  if (dateRule) {
    const isOpen = dateRule.isActive !== false && Boolean(dateRule.startTime) && Boolean(dateRule.endTime);
    return buildEffectiveHours(
      dateRule.startTime || def.startTime,
      dateRule.endTime || def.endTime,
      isOpen,
      dayOfWeek,
      "date",
      dateRule.note
    );
  }

  // Default national holidays: Dec 25 (Christmas) & Jan 1 (New Year) are closed
  if (monthDay === "12-25") {
    return buildEffectiveHours(def.startTime, def.endTime, false, dayOfWeek, "date", "Fechado — Feriado de Natal (25/12)");
  }
  if (monthDay === "01-01") {
    return buildEffectiveHours(def.startTime, def.endTime, false, dayOfWeek, "date", "Fechado — Feriado de Ano Novo (01/01)");
  }

  if (!barberId) {
    return buildEffectiveHours(def.startTime, def.endTime, def.isOpen, dayOfWeek, "default");
  }

  // 2. Weekly schedule rule for this barber
  const weeklyRule = rules.find(
    (r) =>
      r.barberId === barberId &&
      !r.date &&
      r.type !== "date" &&
      Number(r.dayOfWeek) === dayOfWeek
  );

  if (weeklyRule) {
    // Backwards compatibility: if an older doc has empty startTime/endTime on Sunday, treat as closed
    const hasTimes = Boolean(weeklyRule.startTime) && Boolean(weeklyRule.endTime);
    const isOpen = weeklyRule.isActive !== undefined ? Boolean(weeklyRule.isActive) && hasTimes : hasTimes && (dayOfWeek !== 0 || Boolean(weeklyRule.startTime));
    return buildEffectiveHours(
      weeklyRule.startTime || def.startTime,
      weeklyRule.endTime || def.endTime,
      isOpen,
      dayOfWeek,
      "weekly",
      weeklyRule.note
    );
  }

  // 3. Default shop hours
  return buildEffectiveHours(def.startTime, def.endTime, def.isOpen, dayOfWeek, "default");
}

export function getEffectiveHoursForDayScope(
  rules: WorkingHourRule[],
  barberId: string | "all" | undefined | null,
  date: Date,
  allBarberIds: string[] = []
): EffectiveHours {
  if (barberId && barberId !== "all") {
    return getEffectiveHoursForBarberDate(rules, barberId, date);
  }

  const dayOfWeek = date.getDay();
  const dateStr = format(date, "yyyy-MM-dd");

  const candidateIds = new Set<string>(allBarberIds);
  rules.forEach((r) => {
    if (r.barberId) candidateIds.add(r.barberId);
  });

  if (candidateIds.size === 0) {
    return getEffectiveHoursForBarberDate(rules, null, date);
  }

  const openList: EffectiveHours[] = [];
  candidateIds.forEach((id) => {
    const eff = getEffectiveHoursForBarberDate(rules, id, date);
    if (eff.isOpen) openList.push(eff);
  });

  if (openList.length === 0) {
    const def = getDefaultHoursForDay(dayOfWeek);
    // Check if there is any note on date rules for that day
    const anyDateRule = rules.find((r) => r.date === dateStr);
    return buildEffectiveHours(def.startTime, def.endTime, false, dayOfWeek, anyDateRule ? "date" : "default", anyDateRule?.note);
  }

  const minStart = Math.min(...openList.map((e) => e.startMinutes));
  const maxEnd = Math.max(...openList.map((e) => e.endMinutes));
  const anyDateSource = openList.some((e) => e.source === "date");
  const anyWeeklySource = openList.some((e) => e.source === "weekly");
  const note = openList.find((e) => e.note)?.note;

  return buildEffectiveHours(
    minutesToTime(minStart),
    minutesToTime(maxEnd),
    true,
    dayOfWeek,
    anyDateSource ? "date" : anyWeeklySource ? "weekly" : "default",
    note
  );
}
