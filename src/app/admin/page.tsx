import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { createInvite } from "../actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await requireUser();
  if (!user.is_admin) redirect("/");
  const invites = await query<{ code: string; used_by: string | null; name: string | null }>(
    `SELECT i.code, i.used_by, u.display_name AS name
       FROM invites i LEFT JOIN users u ON u.id = i.used_by
      ORDER BY i.created_at DESC LIMIT 50`
  );
  const players = await query<{ display_name: string; email: string }>(
    "SELECT display_name, email FROM users ORDER BY created_at"
  );
  return (
    <>
      <h1>Invites</h1>
      <form action={createInvite}>
        <button className="btn">Create invite code</button>
      </form>
      <h2>Codes</h2>
      <div className="card">
        {invites.length === 0 && <p className="muted">No invites yet.</p>}
        <table>
          <tbody>
            {invites.map((i) => (
              <tr key={i.code}>
                <td><code className="invite">{i.code}</code></td>
                <td className="num muted">{i.used_by ? `used by ${i.name ?? "deleted user"}` : "unused"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Players ({players.length})</h2>
      <div className="card">
        <table>
          <tbody>
            {players.map((p) => (
              <tr key={p.email}><td>{p.display_name}</td><td className="num muted">{p.email}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
