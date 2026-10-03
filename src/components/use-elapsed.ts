import { useEffect, useState } from "react";

const MINUTE = 60_000;

// The current time, updated whenever the time since `startedAt` reaches a new minute, so a
// running entry's h:mm keeps counting while its view stays open, or comes back from Raycast's
// cache.
export function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    let timer: NodeJS.Timeout;
    function schedule() {
      const elapsed = Date.now() - start;
      timer = setTimeout(tick, MINUTE - (((elapsed % MINUTE) + MINUTE) % MINUTE));
    }
    function tick() {
      setNow(new Date());
      schedule();
    }
    // Catch up at once: the view may be showing a time from before it was cached.
    setNow(new Date());
    schedule();
    return () => clearTimeout(timer);
  }, [startedAt]);
  return now;
}
