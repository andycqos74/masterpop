// Popmaster scoring: each day has two games (slot 1 and 2). Every game is
// 3 sets of [question 3pts, question 3pts, bonus 6pts] followed by one final
// question worth 3pts: 3 x 12 + 3 = 39 points maximum.
//
// Keys are stored in the database (game_rounds.round_key), so don't rename them.
export type Question = {
  key: string;
  label: string;
  points: number;
  set: number | null; // 1-3, or null for the final question
  kind: "standard" | "bonus" | "final";
};

export const SETS = 3;
export const SLOTS = [1, 2] as const;
export type Slot = (typeof SLOTS)[number];

// Questions are numbered 1-10 in the order they are asked; 3, 6 and 9 are the bonus questions.
export const QUESTIONS: Question[] = [
  ...Array.from({ length: SETS }, (_, i) => i + 1).flatMap<Question>((s) => {
    const n = (s - 1) * 3;
    return [
      { key: `s${s}q1`, label: `Question ${n + 1}`, points: 3, set: s, kind: "standard" },
      { key: `s${s}q2`, label: `Question ${n + 2}`, points: 3, set: s, kind: "standard" },
      { key: `s${s}bonus`, label: `Question ${n + 3}`, points: 6, set: s, kind: "bonus" },
    ];
  }),
  { key: "final", label: `Question ${SETS * 3 + 1}`, points: 3, set: null, kind: "final" },
];

export const MAX_TOTAL = QUESTIONS.reduce((n, q) => n + q.points, 0); // 39

export function scoreOf(answers: Record<string, boolean>): number {
  return QUESTIONS.reduce((n, q) => n + (answers[q.key] ? q.points : 0), 0);
}

export function londonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export const YEARS_OUT_LIMIT = 1000;

export function fmtYears(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || n === "") return "-";
  const v = Number(n);
  const t = v.toFixed(decimals);
  return v > 0 ? `+${t}` : t;
}
