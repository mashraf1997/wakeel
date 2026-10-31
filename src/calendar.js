// Booking availability from working hours, existing Wakeel bookings, and
// optionally a calendar's secret iCal address (Google Calendar, Outlook, Apple).

const ICS_TTL = 5 * 60_000;
const icsCache = new Map(); // url -> { at, events }

// ---------- time zone helpers (no libraries) ----------
function tzOffsetMs(ts, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ts))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

export function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - tzOffsetMs(guess, tz);
  ts = guess - tzOffsetMs(ts, tz); // second pass handles DST edges
  return ts;
}

export function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const pad = (n) => String(n).padStart(2, '0');
const parseHm = (s) => {
  const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// ---------- iCal parsing ----------
function parseIcsDate(value, params, fallbackTz) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h) return { ts: zonedToUtc(+y, +mo, +d, 0, 0, fallbackTz), allDay: true };
  if (z) return { ts: Date.UTC(+y, +mo - 1, +d, +h, +mi), allDay: false };
  const tz = params.TZID || fallbackTz;
  try {
    return { ts: zonedToUtc(+y, +mo, +d, +h, +mi, tz), allDay: false };
  } catch {
    return { ts: zonedToUtc(+y, +mo, +d, +h, +mi, fallbackTz), allDay: false };
  }
}

export function parseIcs(text, fallbackTz = 'UTC') {
  const lines = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = { exdates: [] }; continue; }
    if (line === 'END:VEVENT') {
      if (ev.start && ev.status !== 'CANCELLED' && ev.transp !== 'TRANSPARENT') {
        if (!ev.end) ev.end = ev.start.allDay ? { ts: ev.start.ts + 864e5, allDay: true } : { ts: ev.start.ts + 3600e3 };
        events.push(ev);
      }
      ev = null;
      continue;
    }
    if (!ev) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const [name, ...paramParts] = line.slice(0, idx).split(';');
    const params = Object.fromEntries(paramParts.map((p) => p.split('=')));
    const value = line.slice(idx + 1);
    if (name === 'DTSTART') ev.start = parseIcsDate(value, params, fallbackTz);
    else if (name === 'DTEND') ev.end = parseIcsDate(value, params, fallbackTz);
    else if (name === 'STATUS') ev.status = value.trim();
    else if (name === 'TRANSP') ev.transp = value.trim();
    else if (name === 'RRULE') ev.rrule = Object.fromEntries(value.split(';').map((p) => p.split('=')));
    else if (name === 'EXDATE') for (const v of value.split(',')) { const d = parseIcsDate(v, params, fallbackTz); if (d) ev.exdates.push(d.ts); }
  }
  return events;
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Busy intervals for one local day [dayStart, dayEnd) in ms, expanding simple
// DAILY / WEEKLY recurrences.
export function busyIntervals(events, dayStart, dayEnd) {
  const out = [];
  for (const ev of events) {
    const dur = ev.end.ts - ev.start.ts;
    if (!ev.rrule) {
      if (ev.start.ts < dayEnd && ev.end.ts > dayStart) out.push([ev.start.ts, ev.end.ts]);
      continue;
    }
    const freq = ev.rrule.FREQ;
    if (freq !== 'DAILY' && freq !== 'WEEKLY') continue;
    const interval = Number(ev.rrule.INTERVAL || 1);
    const until = ev.rrule.UNTIL ? parseIcsDate(ev.rrule.UNTIL, {}, 'UTC')?.ts : Infinity;
    // candidate occurrence: same time of day as the original, on this day (or the day before for overnight events)
    for (const shift of [0, -864e5]) {
      const dayOffset = Math.round((dayStart + shift - ev.start.ts) / 864e5);
      if (dayOffset < 0) continue;
      const occ = ev.start.ts + dayOffset * 864e5;
      if (occ > until || ev.exdates.includes(occ)) continue;
      if (freq === 'DAILY' && dayOffset % interval !== 0) continue;
      if (freq === 'WEEKLY') {
        const weeks = Math.floor(dayOffset / 7);
        const weekday = DAY_CODES[new Date(occ).getUTCDay()];
        const byDay = ev.rrule.BYDAY ? ev.rrule.BYDAY.split(',').map((d) => d.slice(-2)) : [DAY_CODES[new Date(ev.start.ts).getUTCDay()]];
        if (!byDay.includes(weekday) || weeks % interval !== 0) continue;
      }
      if (occ < dayEnd && occ + dur > dayStart) out.push([occ, occ + dur]);
    }
  }
  return out;
}

async function loadIcs(url, tz) {
  const hit = icsCache.get(url);
  if (hit && Date.now() - hit.at < ICS_TTL) return hit.events;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Calendar answered HTTP ${res.status}`);
  const events = parseIcs(await res.text(), tz);
  icsCache.set(url, { at: Date.now(), events });
  return events;
}

/**
 * Free start times on a date.
 * @returns {Promise<{date, open: boolean, slots: string[], reason?: string}>}
 */
export async function availability(store, date) {
  const cfg = store.data.settings.calendar;
  const tz = cfg.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('date must be YYYY-MM-DD');
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  if ((cfg.closedDays || []).map(Number).includes(weekday)) return { date, open: false, slots: [], reason: 'closed that day' };
  if (date < todayIn(tz)) return { date, open: false, slots: [], reason: 'date is in the past' };

  const open = parseHm(cfg.open) ?? 600;
  let close = parseHm(cfg.close) ?? 1320;
  if (close <= open) close += 1440; // closes after midnight
  const step = Math.max(10, Number(cfg.slotMinutes) || 30);

  const dayStart = zonedToUtc(y, mo, d, 0, 0, tz);
  const windowEnd = dayStart + (close + 60) * 60_000;
  let busy = [];
  if (cfg.icsUrl) busy = busyIntervals(await loadIcs(cfg.icsUrl, tz), dayStart, windowEnd);
  for (const r of store.data.requests) {
    if (r.type !== 'booking' || r.date !== date || !['pending', 'confirmed'].includes(r.status)) continue;
    const t = parseHm(r.time);
    if (t == null) continue;
    const s = zonedToUtc(y, mo, d, Math.floor(t / 60), t % 60, tz);
    busy.push([s, s + step * 60_000]);
  }

  const now = Date.now();
  const slots = [];
  for (let t = open; t + step <= close; t += step) {
    const s = zonedToUtc(y, mo, d, Math.floor(t / 60), t % 60, tz);
    const e = s + step * 60_000;
    if (s < now + 15 * 60_000) continue;
    if (busy.some(([bs, be]) => bs < e && be > s)) continue;
    slots.push(`${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`);
  }
  return { date, open: true, timezone: tz, slotMinutes: step, slots };
}
