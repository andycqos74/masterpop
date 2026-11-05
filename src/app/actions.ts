"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, withTx } from "@/lib/db";
import {
  clearFails,
  createSession,
  destroySession,
  hashPassword,
  recordFail,
  requireUser,
  throttled,
  verifyPassword,
} from "@/lib/auth";
import { QUESTIONS, SLOTS, londonToday, scoreOf } from "@/lib/rounds";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (throttled(email)) return { error: "Too many attempts. Try again in 15 minutes." };
  const rows = await query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email=$1",
    [email]
  );
  const ok = rows[0] ? await verifyPassword(password, rows[0].password_hash) : false;
  if (!ok) {
    recordFail(email);
    return { error: "Wrong email or password." };
  }
  clearFails(email);
  await createSession(rows[0].id);
  redirect("/");
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const password = String(fd.get("password") ?? "");
  const code = str(fd, "invite").toUpperCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (name.length < 2 || name.length > 30) return { error: "Name must be 2-30 characters." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const hash = await hashPassword(password);
  let userId: string;
  try {
    userId = await withTx(async (c) => {
      // Serialise registrations so the "first user becomes admin" check is race-free.
      await c.query("LOCK TABLE users IN EXCLUSIVE MODE");
      const count = Number((await c.query("SELECT count(*) FROM users")).rows[0].count);
      const first = count === 0;
      if (!first) {
        const inv = await c.query(
          "SELECT code FROM invites WHERE code=$1 AND used_by IS NULL FOR UPDATE",
          [code]
        );
        if (!inv.rows[0]) throw new Error("INVITE");
      }
      const res = await c.query(
        "INSERT INTO users(email, display_name, password_hash, is_admin) VALUES ($1,$2,$3,$4) RETURNING id",
        [email, name, hash, first]
      );
      const id = res.rows[0].id as string;
      if (!first) {
        await c.query("UPDATE invites SET used_by=$1, used_at=now() WHERE code=$2", [id, code]);
      }
      return id;
    });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    if (err.message === "INVITE") return { error: "That invite code isn't valid or was already used." };
    if (err.code === "23505") return { error: "That email is already registered." };
    throw e;
  }
  await createSession(userId);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export type SavedGame = { answers: Record<string, boolean>; notes: string };

export async function loadGame(playedOn: string, slot: number): Promise<SavedGame | null> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) return null;
  const rows = await query<{ round_key: string; points: number; notes: string }>(
    `SELECT gr.round_key, gr.points, g.notes
       FROM games g JOIN game_rounds gr ON gr.game_id = g.id
      WHERE g.user_id=$1 AND g.played_on=$2 AND g.slot=$3`,
    [user.id, playedOn, slot]
  );
  if (rows.length === 0) return null;
  return {
    answers: Object.fromEntries(rows.map((r) => [r.round_key, r.points > 0])),
    notes: rows[0].notes,
  };
}

export async function saveGame(input: {
  playedOn: string;
  slot: number;
  answers: Record<string, boolean>;
  notes: string;
}): Promise<FormState> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.playedOn)) return { error: "Invalid date." };
  if (input.playedOn > londonToday()) return { error: "Date can't be in the future." };

  if (!(SLOTS as readonly number[]).includes(input.slot)) return { error: "Invalid round." };

  const total = scoreOf(input.answers);
  const rows: [string, number][] = QUESTIONS.map((q) => [q.key, input.answers[q.key] ? q.points : 0]);
  const notes = (input.notes ?? "").slice(0, 500);

  await withTx(async (c) => {
    const g = await c.query(
      `INSERT INTO games(user_id, played_on, slot, total, notes) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, played_on, slot) DO UPDATE SET total=EXCLUDED.total, notes=EXCLUDED.notes
       RETURNING id`,
      [user.id, input.playedOn, input.slot, total, notes]
    );
    const gid = g.rows[0].id as string;
    await c.query("DELETE FROM game_rounds WHERE game_id=$1", [gid]);
    for (const [k, v] of rows) {
      await c.query("INSERT INTO game_rounds(game_id, round_key, points) VALUES ($1,$2,$3)", [gid, k, v]);
    }
  });
  revalidatePath("/history");
  revalidatePath("/leaderboard");
  return { ok: `Saved ${total} points.` };
}

export async function deleteGame(fd: FormData) {
  const user = await requireUser();
  await query("DELETE FROM games WHERE id=$1 AND user_id=$2", [str(fd, "id"), user.id]);
  revalidatePath("/history");
  revalidatePath("/leaderboard");
}

export async function createInvite() {
  const user = await requireUser();
  if (!user.is_admin) return;
  const code = randomBytes(5).toString("hex").toUpperCase();
  await query("INSERT INTO invites(code, created_by) VALUES ($1,$2)", [code, user.id]);
  revalidatePath("/admin");
}
