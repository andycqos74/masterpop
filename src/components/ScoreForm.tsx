"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadGame, saveGame, type FormState } from "@/app/actions";
import { MAX_TOTAL, QUESTIONS, SETS, SLOTS, scoreOf } from "@/lib/rounds";

type Answers = Record<string, boolean>;

export default function ScoreForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<FormState>();
  const [ready, setReady] = useState(false);
  const [pending, start] = useTransition();
  const loadId = useRef(0);

  const draftKey = `draft:${date}:${slot}`;

  // Load the saved game (or an unsaved local draft) whenever the date or round changes.
  useEffect(() => {
    const id = ++loadId.current;
    setReady(false);
    setMsg(undefined);
    let draft: { answers: Answers; notes: string } | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    } catch {}
    loadGame(date, slot)
      .catch(() => null)
      .then((saved) => {
        if (id !== loadId.current) return; // a newer load superseded this one
        const src = saved ?? draft;
        setAnswers(src?.answers ?? {});
        setNotes(src?.notes ?? "");
        setReady(true);
      });
  }, [date, slot, draftKey]);

  // Keep an unsaved draft so a dropped signal or reload doesn't lose the score.
  useEffect(() => {
    if (ready) localStorage.setItem(draftKey, JSON.stringify({ answers, notes }));
  }, [answers, notes, ready, draftKey]);

  const total = scoreOf(answers);
  const toggle = (key: string) => setAnswers((a) => ({ ...a, [key]: !a[key] }));

  function save() {
    setMsg(undefined);
    start(async () => {
      try {
        const res = await saveGame({ playedOn: date, slot, answers, notes });
        if (res?.ok) localStorage.removeItem(draftKey);
        setMsg(res);
      } catch {
        setMsg({ error: "Couldn't save - check your connection and try again. Your score is kept on this device." });
      }
    });
  }

  const sets = Array.from({ length: SETS }, (_, i) => i + 1);
  const finalQ = QUESTIONS.find((q) => q.kind === "final")!;

  return (
    <div>
      <div className="tabs">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            className={`tab ${s === slot ? "on" : ""}`}
            onClick={() => setSlot(s)}
          >
            Round {s}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="muted" style={{ textAlign: "center" }}>Score</div>
        <div className="total">
          {total}
          <span className="of"> / {MAX_TOTAL}</span>
        </div>
      </div>

      <div className="card">
        {sets.map((s) => (
          <div className="qrow" key={s}>
            {QUESTIONS.filter((q) => q.set === s).map((q) => (
              <button
                key={q.key}
                type="button"
                className={`q ${answers[q.key] ? "right" : ""} ${q.kind === "bonus" ? "bonus" : ""}`}
                aria-pressed={!!answers[q.key]}
                onClick={() => toggle(q.key)}
              >
                <span className="qname">{q.label}</span>
                <span className="qpts">{q.points} pts</span>
              </button>
            ))}
          </div>
        ))}
        <div className="qrow">
          <button
            type="button"
            className={`q ${answers[finalQ.key] ? "right" : ""}`}
            aria-pressed={!!answers[finalQ.key]}
            onClick={() => toggle(finalQ.key)}
          >
            <span className="qname">{finalQ.label}</span>
            <span className="qpts">{finalQ.points} pts</span>
          </button>
        </div>
      </div>

      <div className="card">
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button className="btn" onClick={save} disabled={pending || !ready}>
        {pending ? "Saving..." : ready ? `Save round ${slot}` : "Loading..."}
      </button>
      {msg?.error && <p className="error">{msg.error}</p>}
      {msg?.ok && <p className="ok">{msg.ok}</p>}
      <p className="muted">Tap a question when you got it right. Saving again for the same date and round updates it.</p>
    </div>
  );
}
