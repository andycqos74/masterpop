"use client";
import { useEffect, useState, useTransition } from "react";
import { saveGame, type FormState } from "@/app/actions";
import { ROUNDS } from "@/lib/rounds";

type Props = {
  today: string;
  initial: Record<string, number>;
  initialNotes: string;
};

export default function ScoreForm({ today, initial, initialNotes }: Props) {
  const [date, setDate] = useState(today);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(ROUNDS.map((r) => [r.key, initial[r.key] ?? 0]))
  );
  const [notes, setNotes] = useState(initialNotes);
  const [msg, setMsg] = useState<FormState>();
  const [pending, start] = useTransition();

  // Keep an unsaved draft so a dropped signal or reload doesn't lose the score.
  useEffect(() => {
    if (date !== today) return;
    const raw = localStorage.getItem(`draft:${today}`);
    if (raw && Object.keys(initial).length === 0) {
      try {
        const d = JSON.parse(raw);
        setScores((s) => ({ ...s, ...d.scores }));
        setNotes(d.notes ?? "");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    localStorage.setItem(`draft:${today}`, JSON.stringify({ scores, notes }));
  }, [scores, notes, today]);

  const total = ROUNDS.reduce((n, r) => n + (scores[r.key] ?? 0), 0);
  const bump = (key: string, delta: number, max: number) =>
    setScores((s) => ({ ...s, [key]: Math.min(max, Math.max(0, (s[key] ?? 0) + delta)) }));

  function save() {
    setMsg(undefined);
    start(async () => {
      try {
        setMsg(await saveGame({ playedOn: date, scores, notes }));
      } catch {
        setMsg({ error: "Couldn't save - check your connection and try again. Your score is kept on this device." });
      }
    });
  }

  return (
    <div>
      <div className="card">
        <div className="muted" style={{ textAlign: "center" }}>Total</div>
        <div className="total">{total}</div>
      </div>

      {ROUNDS.map((r) => (
        <div className="card round" key={r.key}>
          <div>
            <div className="name">{r.label}</div>
            <div className="muted">{r.hint} · max {r.max}</div>
          </div>
          <div className="stepper">
            <button type="button" aria-label={`${r.label} minus`} onClick={() => bump(r.key, -1, r.max)}>−</button>
            <div className="val">{scores[r.key] ?? 0}</div>
            <button type="button" className="plus" aria-label={`${r.label} plus`} onClick={() => bump(r.key, 1, r.max)}>+</button>
          </div>
        </div>
      ))}

      <div className="card">
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button className="btn" onClick={save} disabled={pending}>
        {pending ? "Saving..." : "Save score"}
      </button>
      {msg?.error && <p className="error">{msg.error}</p>}
      {msg?.ok && <p className="ok">{msg.ok}</p>}
      <p className="muted">Saving again for the same date updates that day's score.</p>
    </div>
  );
}
