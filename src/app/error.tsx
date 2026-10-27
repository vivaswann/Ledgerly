"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h1>We couldn’t load your finances</h1>
      <p>
        Check that the database is initialized with npm run db:setup, then try
        again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
