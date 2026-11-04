import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";

const COOKIE = "sid";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
};

function scryptAsync(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt);
  return `s1$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [v, s, k] = stored.split("$");
  if (v !== "s1" || !s || !k) return false;
  const expected = Buffer.from(k, "base64");
  const actual = await scryptAsync(pw, Buffer.from(s, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await query("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1,$2,$3)", [
    sha(token),
    userId,
    expires,
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash=$1", [sha(token)]);
  jar.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<User>(
    `SELECT u.id, u.email, u.display_name, u.is_admin
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`,
    [sha(token)]
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

// Tiny in-memory throttle: 8 failed attempts per key per 15 minutes.
const fails = new Map<string, { n: number; reset: number }>();
export function throttled(key: string): boolean {
  const e = fails.get(key);
  return !!e && e.reset > Date.now() && e.n >= 8;
}
export function recordFail(key: string) {
  const e = fails.get(key);
  if (!e || e.reset < Date.now()) fails.set(key, { n: 1, reset: Date.now() + 15 * 60_000 });
  else e.n++;
}
export function clearFails(key: string) {
  fails.delete(key);
}
