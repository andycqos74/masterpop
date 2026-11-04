"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Score" },
    { href: "/history", label: "History" },
    { href: "/leaderboard", label: "Leaderboard" },
    ...(isAdmin ? [{ href: "/admin", label: "Invites" }] : []),
  ];
  return (
    <nav className="bottom">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? "on" : ""}>
          {i.label}
        </Link>
      ))}
      <form action={logout} style={{ flex: 1, display: "flex" }}>
        <button style={{ flex: 1, background: "none", border: 0, color: "var(--muted)", fontSize: ".85rem" }}>
          Log out
        </button>
      </form>
    </nav>
  );
}
