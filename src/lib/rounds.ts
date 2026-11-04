// Edit this list to match the show's scoring. Keys are stored in the database,
// so changing a label is safe but renaming a key orphans old data.
export type Round = { key: string; label: string; hint: string; max: number };

export const ROUNDS: Round[] = [
  { key: "r1", label: "Round 1", hint: "Subject questions", max: 10 },
  { key: "r2", label: "Round 2", hint: "Timed round", max: 20 },
  { key: "final", label: "Final", hint: "Last round", max: 20 },
];

export const MAX_TOTAL = ROUNDS.reduce((n, r) => n + r.max, 0);

export function londonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}
