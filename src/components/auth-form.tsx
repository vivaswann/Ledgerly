"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Landmark, ShieldCheck, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const signup = mode === "signup";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const credentials = {
        email: String(data.get("email")).trim().toLowerCase(),
        password: String(data.get("password")),
      };
      const result = signup
        ? await authClient.signUp.email({
            ...credentials,
            name: String(data.get("name")).trim(),
          })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        setError(
          signup
            ? "We couldn’t create this account. Check your details or try signing in."
            : "Email or password is incorrect. Please try again.",
        );
        return;
      }
      window.location.replace("/");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="auth-page">
      <Link href="/login" className="brand">
        <span className="brand-icon">
          <Landmark size={21} />
        </span>
        Ledgerly
      </Link>
      <section className="auth-card panel">
        <p className="eyebrow">YOUR MONEY. YOUR SPACE.</p>
        <h1>{signup ? "A clearer picture starts here." : "Welcome back."}</h1>
        <p className="auth-description">
          {signup
            ? "Create your private workspace for everyday money and long-term wealth."
            : "Sign in to your personal financial workspace."}
        </p>
        <form onSubmit={submit} method="post">
          {signup && (
            <label>
              Your name
              <input
                name="name"
                disabled={!ready || pending}
                autoComplete="name"
                required
                maxLength={100}
                autoFocus
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              disabled={!ready || pending}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              autoFocus={!signup}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              disabled={!ready || pending}
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
            />
          </label>
          {signup && (
            <p className="field-help">
              Use at least 12 characters. A unique passphrase works well.
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!ready || pending}>
            {pending && <LoaderCircle className="spin" size={16} />}{" "}
            {signup ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New to Ledgerly?"}{" "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
      <p className="auth-privacy">
        <ShieldCheck size={14} /> Only your signed-in account can access your
        finances.
      </p>
    </main>
  );
}
const subscribe = () => () => {};
