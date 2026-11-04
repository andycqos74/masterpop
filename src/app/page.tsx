import ScoreForm from "@/components/ScoreForm";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { londonToday } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const today = londonToday();
  const rows = await query<{ round_key: string; points: number; notes: string }>(
    `SELECT gr.round_key, gr.points, g.notes
       FROM games g JOIN game_rounds gr ON gr.game_id = g.id
      WHERE g.user_id=$1 AND g.played_on=$2`,
    [user.id, today]
  );
  const initial = Object.fromEntries(rows.map((r) => [r.round_key, r.points]));
  return (
    <>
      <h1>Hi {user.display_name}</h1>
      <p className="muted">
        Popmaster is on Greatest Hits Radio, weekdays 10am-1pm. Listen on the{" "}
        <a href="https://planetradio.co.uk/greatest-hits/" target="_blank" rel="noreferrer">
          Greatest Hits Radio site
        </a>{" "}
        or the Rayo app, then score here.
      </p>
      <ScoreForm today={today} initial={initial} initialNotes={rows[0]?.notes ?? ""} />
    </>
  );
}
