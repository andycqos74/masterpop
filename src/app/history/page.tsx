import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { MAX_TOTAL, fmtYears } from "@/lib/rounds";
import { deleteGame } from "../actions";

export const dynamic = "force-dynamic";

type Game = { id: string; played_on: string; slot: number; total: number; notes: string; years_out: number | null };

function Chart({ games }: { games: Game[] }) {
  const pts = [...games].reverse().slice(-30);
  if (pts.length < 2) return <p className="muted">Save a couple of scores to see your trend.</p>;
  const W = 600, H = 160, P = 18;
  const x = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v: number) => H - P - (v / MAX_TOTAL) * (H - 2 * P);
  const d = pts.map((g, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(g.total).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Score trend" style={{ width: "100%" }}>
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--line)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" />
      {pts.map((g, i) => (
        <circle key={g.id} cx={x(i)} cy={y(g.total)} r="4" fill="var(--accent)" />
      ))}
    </svg>
  );
}

export default async function History() {
  const user = await requireUser();
  const games = await query<Game>(
    "SELECT id, to_char(played_on,'YYYY-MM-DD') AS played_on, slot, total, notes, years_out FROM games WHERE user_id=$1 ORDER BY played_on DESC, slot DESC",
    [user.id]
  );
  const acc = await query<{ kind: string; pct: string }>(
    `SELECT CASE WHEN gr.round_key LIKE '%bonus' THEN 'bonus'
                 WHEN gr.round_key = 'final' THEN 'final'
                 ELSE 'standard' END AS kind,
            round(avg((gr.points > 0)::int) * 100) AS pct
       FROM game_rounds gr JOIN games g ON g.id = gr.game_id
      WHERE g.user_id=$1 GROUP BY 1`,
    [user.id]
  );
  const slotAvg = await query<{ slot: number; avg: string }>(
    "SELECT slot, round(avg(total), 1) AS avg FROM games WHERE user_id=$1 GROUP BY slot ORDER BY slot",
    [user.id]
  );
  const yo = (
    await query<{ n: string; avg: string | null; abs: string | null; best: number | null }>(
      `SELECT count(years_out) AS n, round(avg(years_out), 1) AS avg,
              round(avg(abs(years_out)), 1) AS abs, min(abs(years_out)) AS best
         FROM games WHERE user_id=$1`,
      [user.id]
    )
  )[0];
  const pctOf = (k: string) => {
    const v = acc.find((a) => a.kind === k)?.pct;
    return v === undefined ? "-" : `${v}%`;
  };
  const totals = games.map((g) => g.total);
  const avg = totals.length ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : "-";
  const best = totals.length ? Math.max(...totals) : "-";

  return (
    <>
      <h1>Your history</h1>
      <div className="card stats">
        <div><b>{games.length}</b><span className="muted">games</span></div>
        <div><b>{avg}</b><span className="muted">average</span></div>
        <div><b>{best}</b><span className="muted">best</span></div>
      </div>
      <div className="card"><Chart games={games} /></div>
      <div className="card">
        <div className="muted">Questions you get right</div>
        <table>
          <tbody>
            <tr><td>Standard (3 pts)</td><td className="num">{pctOf("standard")}</td></tr>
            <tr><td>Bonus (6 pts)</td><td className="num">{pctOf("bonus")}</td></tr>
            <tr><td>Final (3 pts)</td><td className="num">{pctOf("final")}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="muted">Average score by round</div>
        <table>
          <tbody>
            {slotAvg.length === 0 && <tr><td className="muted">No games yet.</td></tr>}
            {slotAvg.map((r) => (
              <tr key={r.slot}><td>Round {r.slot}</td><td className="num">{r.avg} / {MAX_TOTAL}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="muted">Years out</div>
        {Number(yo?.n ?? 0) === 0 ? (
          <p className="muted">No years-out scores yet.</p>
        ) : (
          <table>
            <tbody>
              <tr><td>Average miss (ignoring direction)</td><td className="num">{yo.abs} yrs</td></tr>
              <tr><td>Average (negative = you guess early)</td><td className="num">{fmtYears(yo.avg, 1)}</td></tr>
              <tr><td>Closest</td><td className="num">{yo.best} yrs</td></tr>
              <tr><td>Games with a year</td><td className="num">{yo.n}</td></tr>
            </tbody>
          </table>
        )}
      </div>
      <h2>All games</h2>
      <div className="card">
        {games.length === 0 ? (
          <p className="muted">No games yet.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th className="num">Score</th><th className="num">Yrs out</th><th /></tr></thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.played_on} · Round {g.slot}
                    {g.notes && <div className="muted">{g.notes}</div>}
                  </td>
                  <td className="num">{g.total} / {MAX_TOTAL}</td>
                  <td className="num">{fmtYears(g.years_out)}</td>
                  <td className="num">
                    <form action={deleteGame}>
                      <input type="hidden" name="id" value={g.id} />
                      <button className="btn small ghost" aria-label={`Delete ${g.played_on} round ${g.slot}`}>Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
