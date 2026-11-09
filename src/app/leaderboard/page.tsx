import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtYears, londonToday } from "@/lib/rounds";

export const dynamic = "force-dynamic";

const PERIODS = { today: "Today", week: "7 days", month: "30 days", all: "All time" } as const;
type Period = keyof typeof PERIODS;

function since(p: Period): string {
  const d = new Date(`${londonToday()}T00:00:00Z`);
  if (p === "today") return londonToday();
  if (p === "week") d.setUTCDate(d.getUTCDate() - 6);
  else if (p === "month") d.setUTCDate(d.getUTCDate() - 29);
  else return "1970-01-01";
  return d.toISOString().slice(0, 10);
}

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const period: Period = sp.p && sp.p in PERIODS ? (sp.p as Period) : "week";

  const rows = await query<{
    id: string; display_name: string; games: string; avg: string; best: number; total: string; yrs: string | null;
  }>(
    `SELECT u.id, u.display_name, count(*) AS games,
            round(avg(g.total), 1) AS avg, max(g.total) AS best, sum(g.total) AS total,
            round(avg(abs(g.years_out)), 1) AS yrs
       FROM games g JOIN users u ON u.id = g.user_id
      WHERE g.played_on >= $1
      GROUP BY u.id, u.display_name
      ORDER BY avg(g.total) DESC, sum(g.total) DESC`,
    [since(period)]
  );

  return (
    <>
      <h1>Leaderboard</h1>
      <div className="tabs">
        {(Object.keys(PERIODS) as Period[]).map((k) => (
          <Link key={k} href={`/leaderboard?p=${k}`} className={k === period ? "on" : ""}>
            {PERIODS[k]}
          </Link>
        ))}
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted">No scores in this period yet.</p>
        ) : (
          <table className="tight">
            <thead>
              <tr><th>#</th><th>Player</th><th className="num">Avg</th><th className="num">Best</th><th className="num">Games</th><th className="num">Total</th><th className="num">Yrs out</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={r.id === me.id ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
                  <td>{i + 1}</td>
                  <td>{r.display_name}</td>
                  <td className="num">{r.avg}</td>
                  <td className="num">{r.best}</td>
                  <td className="num">{r.games}</td>
                  <td className="num">{r.total}</td>
                  <td className="num">{r.yrs ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted">Ranked by average score per game. Yrs out is the average miss in years, ignoring direction (lower is better).</p>
    </>
  );
}
