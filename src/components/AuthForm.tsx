"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, register, type FormState } from "@/app/actions";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? login : register,
    undefined
  );
  const isReg = mode === "register";
  return (
    <form action={action} className="card" style={{ marginTop: 40 }}>
      <h1>{isReg ? "Join Masterpop" : "Masterpop"}</h1>
      {isReg && (
        <>
          <label htmlFor="name">Display name</label>
          <input id="name" name="name" required minLength={2} maxLength={30} autoComplete="nickname" />
        </>
      )}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={isReg ? 8 : undefined}
        autoComplete={isReg ? "new-password" : "current-password"}
      />
      {isReg && (
        <>
          <label htmlFor="invite">Invite code</label>
          <input id="invite" name="invite" autoComplete="off" />
          <p className="muted">The very first account on a new install doesn't need a code.</p>
        </>
      )}
      <button className="btn" disabled={pending}>{isReg ? "Create account" : "Log in"}</button>
      {state?.error && <p className="error">{state.error}</p>}
      <p className="muted">
        {isReg ? <Link href="/login">Already have an account?</Link> : <Link href="/register">Have an invite code?</Link>}
      </p>
    </form>
  );
}
