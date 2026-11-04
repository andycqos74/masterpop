import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ROUNDS, MAX_TOTAL } from "@/lib/rounds";
import { deleteGame } from "../actions";

export const dynamic = "force-dynamic";

type Game = { id: string; played_on: string; total: number; notes: string };

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
    "SELECT id, to_char(played_on,'YYYY-MM-DD') AS played_on, total, notes FROM games WHERE user_id=$1 ORDER BY played_on DESC",
    [user.id]
  );
  const per = await query<{ round_key: string; avg: string }>(
    `SELECT gr.round_key, avg(gr.points)::numeric(5,2) AS avg
       FROM game_rounds gr JOIN games g ON g.id=gr.game_id
      WHERE g.user_id=$1 GROUP BY gr.round_key`,
    [user.id]
  );
  const avgOf = (k: string) => per.find((p) => p.round_key === k)?.avg ?? "-";
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
        <div className="muted">Average per round</div>
        <table>
          <tbody>
            {ROUNDS.map((r) => (
              <tr key={r.key}><td>{r.label}</td><td className="num">{avgOf(r.key)} / {r.max}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>All games</h2>
      <div className="card">
        {games.length === 0 ? (
          <p className="muted">No games yet.</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th className="num">Score</th><th /></tr></thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.played_on}
                    {g.notes && <div className="muted">{g.notes}</div>}
                  </td>
                  <td className="num">{g.total}</td>
                  <td className="num">
                    <form action={deleteGame}>
                      <input type="hidden" name="id" value={g.id} />
                      <button className="btn small ghost" aria-label={`Delete ${g.played_on}`}>Delete</button>
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
