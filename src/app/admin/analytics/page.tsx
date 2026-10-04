import type { Metadata } from "next";
import Link from "next/link";
import { fetchDashboard, gaConfig, type DateRange, type GaDailyPoint, type GaRow } from "@/lib/analytics/ga";

export const metadata: Metadata = { title: "Admin · Analytics" };

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "28d", label: "Last 28 days", days: 28 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "365d", label: "Last 12 months", days: 365 },
] as const;

const DEFAULT_PRESET = "28d";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return isoDay(d);
}

function resolveRange(params: Record<string, string | string[] | undefined>): DateRange & { preset: string | null } {
  const pick = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const start = pick("start");
  const end = pick("end");
  const today = isoDay(new Date());

  if (start && end && ISO_DATE.test(start) && ISO_DATE.test(end)) {
    const [s, e] = start <= end ? [start, end] : [end, start];
    return { start: s, end: e > today ? today : e, preset: null };
  }

  const preset = PRESETS.find((p) => p.id === pick("range")) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET)!;
  return { start: daysAgo(preset.days - 1), end: today, preset: preset.id };
}

const fmt = new Intl.NumberFormat("en-US");

function duration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function gaDateToIso(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function DailyChart({ points }: { points: GaDailyPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.pageViews));
  const width = 1000;
  const height = 220;
  const gap = points.length > 120 ? 0 : 2;
  const barW = width / points.length;
  const first = gaDateToIso(points[0].date);
  const last = gaDateToIso(points[points.length - 1].date);

  return (
    <figure className="ga-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Page views per day">
        {points.map((p, i) => {
          const h = (p.pageViews / max) * (height - 8);
          return (
            <rect key={p.date} x={i * barW + gap / 2} y={height - h} width={Math.max(1, barW - gap)} height={h} rx={barW > 8 ? 3 : 0}>
              <title>{`${prettyDate(gaDateToIso(p.date))}: ${fmt.format(p.pageViews)} page views, ${fmt.format(p.activeUsers)} users`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption>
        <span>{prettyDate(first)}</span>
        <span>Peak {fmt.format(max)} page views/day</span>
        <span>{prettyDate(last)}</span>
      </figcaption>
    </figure>
  );
}

function RankTable({ title, rows, labelHead, valueHead, secondaryHead, empty }: {
  title: string;
  rows: GaRow[];
  labelHead: string;
  valueHead: string;
  secondaryHead: string;
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="ga-card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="ga-empty">{empty}</p>
      ) : (
        <table className="ga-table">
          <thead>
            <tr>
              <th scope="col">{labelHead}</th>
              <th scope="col">{valueHead}</th>
              <th scope="col">{secondaryHead}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>
                  <span className="ga-bar" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
                  <span className="ga-label">{r.label}</span>
                </td>
                <td>{fmt.format(r.value)}</td>
                <td>{fmt.format(r.secondary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = resolveRange(await searchParams);
  const configured = gaConfig() !== null;

  let dashboard: Awaited<ReturnType<typeof fetchDashboard>> | null = null;
  let error: string | null = null;
  if (configured) {
    try {
      dashboard = await fetchDashboard(range);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load Google Analytics data";
    }
  }

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Analytics</h2>
          <p>
            Google Analytics for {prettyDate(range.start)} to {prettyDate(range.end)}. Date-range reports can lag a day behind; the live panel updates within seconds.
          </p>
        </div>
      </div>

      <nav className="chips" aria-label="Date range presets">
        {PRESETS.map((p) => (
          <Link key={p.id} className="chip" href={`/admin/analytics?range=${p.id}`} aria-current={range.preset === p.id ? "true" : undefined}>
            {p.label}
          </Link>
        ))}
      </nav>

      <form className="filters ga-range" action="/admin/analytics">
        <div className="f">
          <label htmlFor="ga-start">From</label>
          <input id="ga-start" name="start" type="date" className="field" defaultValue={range.start} max={range.end} required />
        </div>
        <div className="f">
          <label htmlFor="ga-end">To</label>
          <input id="ga-end" name="end" type="date" className="field" defaultValue={range.end} max={isoDay(new Date())} required />
        </div>
        <button className="btn" type="submit">Apply</button>
      </form>

      {!configured ? (
        <div className="empty">
          <p>Google Analytics isn&apos;t connected yet.</p>
          <p>Add <code>GA_PROPERTY_ID</code>, <code>GA_CLIENT_EMAIL</code> and <code>GA_PRIVATE_KEY</code> to the environment to show stats here.</p>
        </div>
      ) : error ? (
        <div className="empty">
          <p>Couldn&apos;t load Google Analytics data.</p>
          <p className="ga-error">{error}</p>
        </div>
      ) : dashboard ? (
        <>
          <section className="ga-card ga-live">
            <h3>
              Right now <small>last 30 minutes</small>
            </h3>
            <p className="ga-live-users">
              <b>{fmt.format(dashboard.realtime.activeUsers)}</b> active {dashboard.realtime.activeUsers === 1 ? "user" : "users"}
            </p>
            {dashboard.realtime.events.length > 0 ? (
              <ul className="ga-live-events">
                {dashboard.realtime.events.map((e) => (
                  <li key={e.label}>
                    <b>{fmt.format(e.value)}</b> {e.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ga-empty">No activity in the last 30 minutes.</p>
            )}
          </section>

          <ul className="admin-stats ga-stats">
            <li className="stat"><b>{fmt.format(dashboard.totals.pageViews)}</b><span>Page views</span></li>
            <li className="stat"><b>{fmt.format(dashboard.totals.activeUsers)}</b><span>Users</span></li>
            <li className="stat"><b>{fmt.format(dashboard.totals.newUsers)}</b><span>New users</span></li>
            <li className="stat"><b>{fmt.format(dashboard.totals.sessions)}</b><span>Sessions</span></li>
            <li className="stat"><b>{fmt.format(dashboard.totals.eventCount)}</b><span>Events</span></li>
            <li className="stat"><b>{duration(dashboard.totals.avgEngagementSeconds)}</b><span>Avg. engagement</span></li>
          </ul>

          <section className="ga-card">
            <h3>Page views per day</h3>
            {dashboard.daily.length > 0 ? <DailyChart points={dashboard.daily} /> : <p className="ga-empty">No traffic in this range.</p>}
          </section>

          <div className="ga-grid">
            <RankTable title="Top pages" rows={dashboard.topPages} labelHead="Page" valueHead="Views" secondaryHead="Users" empty="No page views in this range." />
            <RankTable title="Events" rows={dashboard.events} labelHead="Event" valueHead="Count" secondaryHead="Users" empty="No events in this range." />
            <RankTable title="Button clicks" rows={dashboard.buttons} labelHead="Button" valueHead="Clicks" secondaryHead="Users" empty="No button clicks recorded in this range." />
            <RankTable title="Form fills by page" rows={dashboard.forms} labelHead="Page" valueHead="Fills" secondaryHead="Users" empty="No form fills in this range." />
            <RankTable title="Traffic sources" rows={dashboard.sources} labelHead="Source" valueHead="Sessions" secondaryHead="Users" empty="No sessions in this range." />
          </div>
        </>
      ) : null}
    </>
  );
}
