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

export const QUESTIONS: Question[] = [
  ...Array.from({ length: SETS }, (_, i) => i + 1).flatMap<Question>((s) => [
    { key: `s${s}q1`, label: "Question 1", points: 3, set: s, kind: "standard" },
    { key: `s${s}q2`, label: "Question 2", points: 3, set: s, kind: "standard" },
    { key: `s${s}bonus`, label: "Bonus", points: 6, set: s, kind: "bonus" },
  ]),
  { key: "final", label: "Final question", points: 3, set: null, kind: "final" },
];

export const MAX_TOTAL = QUESTIONS.reduce((n, q) => n + q.points, 0); // 39

export function scoreOf(answers: Record<string, boolean>): number {
  return QUESTIONS.reduce((n, q) => n + (answers[q.key] ? q.points : 0), 0);
}

export function londonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}
