import { Form } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { api } from "./api";
import { showApiFailure } from "./api/toast";
import { TimerForm } from "./components/timer-form";
import { continueNote } from "./lib/continue";
import { loadRecent } from "./lib/recent";

// Continue Timer: the timer form, prefilled from the running entry, or from the newest entry
// of the last 14 days when none runs (docs/architecture/README.md, "Starting and continuing").

const DAYS = 14;

async function loadEntry() {
  const running = await api().timer();
  if (running) return running;
  // GET /api/v1/timer finds the timer in any organization; entries are read in the
  // remembered one. They come newest first.
  const { entries } = await loadRecent(undefined, DAYS);
  return entries[0] ?? null;
}

export default function Command() {
  // Not cached: the form takes its values once, so it waits for the current entry.
  const {
    data: entry,
    isLoading,
    error,
  } = usePromise(loadEntry, [], {
    onError: (error) => showApiFailure(error, { title: "Couldn't load the last entry" }),
  });

  if (isLoading) return <Form navigationTitle="Continue Timer" isLoading />;
  if (error || entry === undefined) return <TimerForm navigationTitle="Continue Timer" />;
  return (
    <TimerForm
      navigationTitle="Continue Timer"
      intro={continueNote(entry)}
      description={entry?.description}
      ticket={entry?.ticket}
      projectId={entry ? entry.projectId : undefined}
      organizationId={entry?.organizationId}
    />
  );
}
