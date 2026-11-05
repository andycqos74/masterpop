import ScoreForm from "@/components/ScoreForm";
import { requireUser } from "@/lib/auth";
import { londonToday } from "@/lib/rounds";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  return (
    <>
      <h1>Hi {user.display_name}</h1>
      <p className="muted">
        Popmaster is on Greatest Hits Radio, weekdays 10am-1pm. Listen on the{" "}
        <a href="https://planetradio.co.uk/greatest-hits/" target="_blank" rel="noreferrer">
          Greatest Hits Radio site
        </a>{" "}
        or the Rayo app, then score here.
      </p>
      <ScoreForm today={londonToday()} />
    </>
  );
}
