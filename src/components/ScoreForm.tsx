"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadGame, saveGame, type FormState } from "@/app/actions";
import { MAX_TOTAL, QUESTIONS, SETS, SLOTS, YEARS_OUT_LIMIT, scoreOf } from "@/lib/rounds";

type Answers = Record<string, boolean>;

export default function ScoreForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [yearsOut, setYearsOut] = useState(""); // kept as text so "-" can be typed
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
    let draft: { answers: Answers; notes: string; yearsOut?: string } | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    } catch {}
    loadGame(date, slot)
      .catch(() => null)
      .then((saved) => {
        if (id !== loadId.current) return; // a newer load superseded this one
        setAnswers(saved?.answers ?? draft?.answers ?? {});
        setNotes(saved?.notes ?? draft?.notes ?? "");
        setYearsOut(saved ? (saved.yearsOut === null ? "" : String(saved.yearsOut)) : (draft?.yearsOut ?? ""));
        setReady(true);
      });
  }, [date, slot, draftKey]);

  // Keep an unsaved draft so a dropped signal or reload doesn't lose the score.
  useEffect(() => {
    if (ready) localStorage.setItem(draftKey, JSON.stringify({ answers, notes, yearsOut }));
  }, [answers, notes, yearsOut, ready, draftKey]);

  const total = scoreOf(answers);
  const toggle = (key: string) => setAnswers((a) => ({ ...a, [key]: !a[key] }));
  const nudgeYears = (d: number) => {
    const n = yearsOut.trim() === "" || yearsOut.trim() === "-" ? 0 : Number(yearsOut);
    setYearsOut(String((Number.isFinite(n) ? Math.trunc(n) : 0) + d));
  };

  function save() {
    setMsg(undefined);
    const raw = yearsOut.trim();
    let yo: number | null = null;
    if (raw !== "") {
      yo = Number(raw);
      if (!Number.isInteger(yo) || Math.abs(yo) > YEARS_OUT_LIMIT) {
        setMsg({ error: `Years out must be a whole number, for example -4 or 3.` });
        return;
      }
    }
    start(async () => {
      try {
        const res = await saveGame({ playedOn: date, slot, answers, notes, yearsOut: yo });
        if (res?.ok) localStorage.removeItem(draftKey);
        setMsg(res);
      } catch {
        setMsg({ error: "Couldn't save - check your connection and try again. Your score is kept on this device." });
      }
    });
  }

  const sets = Array.from({ length: SETS }, (_, i) => i + 1);
  const finalQ = QUESTIONS.find((q) => q.kind === "final")!;
  const btn = (q: (typeof QUESTIONS)[number]) => (
    <button
      key={q.key}
      type="button"
      className={`q ${answers[q.key] ? "right" : ""} ${q.kind === "bonus" ? "bonus" : ""}`}
      aria-pressed={!!answers[q.key]}
      onClick={() => toggle(q.key)}
    >
      <span className="qname">{q.label}</span>
      <span className="qpts">{q.points} pts{q.kind === "bonus" ? " · bonus" : ""}</span>
    </button>
  );

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
            {QUESTIONS.filter((q) => q.set === s).map(btn)}
          </div>
        ))}
        <div className="qrow">{btn(finalQ)}</div>
      </div>

      <div className="card">
        <label htmlFor="years">Years out</label>
        <div className="stepper">
          <button type="button" aria-label="Years out minus" onClick={() => nudgeYears(-1)}>−</button>
          <input
            id="years"
            type="number"
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={yearsOut}
            onChange={(e) => setYearsOut(e.target.value)}
            style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 700 }}
          />
          <button type="button" className="plus" aria-label="Years out plus" onClick={() => nudgeYears(1)}>+</button>
        </div>
        <p className="muted">
          Your guess minus the correct year. A guess that was too early is negative: guessed 1970, answer 1974
          gives <strong>-4</strong>. Leave blank if there wasn't a year question.
        </p>
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
