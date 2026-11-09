"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadGame, saveGame, type FormState } from "@/app/actions";
import { MAX_TOTAL, QUESTIONS, SLOTS, YEARS_OUT_LIMIT, scoreOf } from "@/lib/rounds";

// true = right, false = wrong, undefined = not answered yet.
type Answers = Record<string, boolean | undefined>;

const LAST = QUESTIONS.length - 1;

function firstUnanswered(a: Answers): number {
  const i = QUESTIONS.findIndex((q) => a[q.key] === undefined);
  return i === -1 ? LAST : i;
}

export default function ScoreForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [idx, setIdx] = useState(0);
  const [yearsOut, setYearsOut] = useState(""); // kept as text so "-" can be typed
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<FormState>();
  const [ready, setReady] = useState(false);
  const [pending, start] = useTransition();
  const loadId = useRef(0);
  const dirty = useRef(false); // only persist a draft once the user has changed something

  const draftKey = `draft:${date}:${slot}`;

  // Load the saved game (or an unsaved local draft) whenever the date or round changes.
  useEffect(() => {
    const id = ++loadId.current;
    setReady(false);
    dirty.current = false;
    setMsg(undefined);
    let draft: { answers: Answers; notes: string; yearsOut?: string } | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
    } catch {}
    loadGame(date, slot)
      .catch(() => null)
      .then((saved) => {
        if (id !== loadId.current) return; // a newer load superseded this one
        const a: Answers = saved?.answers ?? draft?.answers ?? {};
        setAnswers(a);
        setIdx(firstUnanswered(a));
        setNotes(saved?.notes ?? draft?.notes ?? "");
        setYearsOut(saved ? (saved.yearsOut === null ? "" : String(saved.yearsOut)) : (draft?.yearsOut ?? ""));
        setReady(true);
      });
  }, [date, slot, draftKey]);

  // Keep an unsaved draft so a dropped signal or reload doesn't lose the score.
  useEffect(() => {
    if (ready && dirty.current) localStorage.setItem(draftKey, JSON.stringify({ answers, notes, yearsOut }));
  }, [answers, notes, yearsOut, ready, draftKey]);

  const q = QUESTIONS[idx];
  const total = scoreOf(answers);
  const answeredCount = QUESTIONS.filter((x) => answers[x.key] !== undefined).length;
  const reach = firstUnanswered(answers); // furthest question you may navigate to
  const allDone = answeredCount === QUESTIONS.length;
  const canForward = idx < LAST && answers[q.key] !== undefined;

  function answer(right: boolean) {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [q.key]: right }));
    if (idx < LAST) setIdx(idx + 1);
  }

  const nudgeYears = (d: number) => {
    dirty.current = true;
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
    const clean: Record<string, boolean> = {};
    for (const x of QUESTIONS) clean[x.key] = answers[x.key] === true;
    start(async () => {
      try {
        const res = await saveGame({ playedOn: date, slot, answers: clean, notes, yearsOut: yo });
        if (res?.ok) localStorage.removeItem(draftKey);
        setMsg(res);
      } catch {
        setMsg({ error: "Couldn't save - check your connection and try again. Your score is kept on this device." });
      }
    });
  }

  const cur = answers[q.key];
  const meta =
    q.kind === "bonus" ? `Bonus · ${q.points} points` : q.kind === "final" ? `Final · ${q.points} points` : `${q.points} points`;

  return (
    <div>
      <div className="tabs">
        {SLOTS.map((s) => (
          <button key={s} type="button" className={`tab ${s === slot ? "on" : ""}`} onClick={() => setSlot(s)}>
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

      <div className={`card qcard ${q.kind === "bonus" ? "bonus" : ""}`}>
        <div className="muted">Question {idx + 1} of {QUESTIONS.length}</div>
        <div className="qnum">{q.label}</div>
        <div className="qmeta">{meta}</div>

        <div className="bigbtns">
          <button
            type="button"
            className={`bigbtn right ${cur === true ? "picked" : ""}`}
            aria-pressed={cur === true}
            onClick={() => answer(true)}
            disabled={!ready}
          >
            <span className="ico" aria-hidden>✓</span>
            Right
          </button>
          <button
            type="button"
            className={`bigbtn wrong ${cur === false ? "picked" : ""}`}
            aria-pressed={cur === false}
            onClick={() => answer(false)}
            disabled={!ready}
          >
            <span className="ico" aria-hidden>✗</span>
            Wrong
          </button>
        </div>

        <div className="navrow">
          <button type="button" onClick={() => setIdx(idx - 1)} disabled={idx === 0}>← Back</button>
          <button type="button" onClick={() => setIdx(idx + 1)} disabled={!canForward}>Next →</button>
        </div>

        <div className="dots" role="group" aria-label="Questions">
          {QUESTIONS.map((x, i) => (
            <button
              key={x.key}
              type="button"
              className={`dot ${answers[x.key] === true ? "right" : answers[x.key] === false ? "wrong" : ""} ${i === idx ? "cur" : ""}`}
              disabled={i > reach}
              aria-label={`Question ${i + 1}`}
              aria-current={i === idx}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
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
            onChange={(e) => { dirty.current = true; setYearsOut(e.target.value); }}
            style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 700 }}
          />
          <button type="button" className="plus" aria-label="Years out plus" onClick={() => nudgeYears(1)}>+</button>
        </div>
        <p className="muted">
          Your guess minus the correct year. A guess that was too early is negative: guessed 1970, answer 1974
          gives <strong>-4</strong>. Leave blank if there wasn't a year question.
        </p>

        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => { dirty.current = true; setNotes(e.target.value); }} />
      </div>

      <button className="btn" onClick={save} disabled={pending || !ready}>
        {pending ? "Saving..." : ready ? `Save round ${slot}` : "Loading..."}
      </button>
      {msg?.error && <p className="error">{msg.error}</p>}
      {msg?.ok && <p className="ok">{msg.ok}</p>}
      <p className="muted">
        {allDone
          ? "All questions answered."
          : `${QUESTIONS.length - answeredCount} unanswered - these are saved as wrong.`}{" "}
        Saving again for the same date and round updates it.
      </p>
    </div>
  );
}
