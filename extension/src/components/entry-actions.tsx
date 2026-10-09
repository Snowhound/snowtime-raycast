import { Action, Icon, Keyboard } from "@raycast/api";
import { snowtimeUrl, type Entry, type Organization, type RunningEntry } from "../api";
import { timerOf, type EntryRow } from "../lib/rows";
import { startTimer } from "../timer/start";
import { stopTimer } from "../timer/stop";
import { TimerForm } from "./timer-form";

// The actions Start Timer and Recent Entries offer on an entry's row, so both name, icon, and
// bind them alike. `onChange` hears whether a start or stop went through.

type OnChange = (changed: boolean) => void;

// Starts a new timer from the row's entry at once.
export function StartAgainAction({
  row,
  organization,
  title = "Start Again",
  onChange,
}: {
  row: EntryRow;
  organization: Organization;
  title?: string;
  onChange?: OnChange;
}) {
  return (
    <Action
      title={title}
      icon={Icon.Play}
      onAction={async () => {
        // Started first: `onChange?.(await …)` would skip the start without an `onChange`.
        const started = await startTimer(organization, timerOf(row));
        onChange?.(started);
      }}
    />
  );
}

// Opens the timer form prefilled from the row's entry.
export function EditAndStartAction({
  row: { entry, project },
  organization,
  navigationTitle,
}: {
  row: EntryRow;
  organization: Organization;
  navigationTitle: string;
}) {
  return (
    <Action.Push
      title="Edit and Start"
      icon={Icon.Pencil}
      target={
        <TimerForm
          navigationTitle={navigationTitle}
          description={entry.description}
          ticket={entry.ticket}
          projectId={project?.id ?? null}
          organizationId={organization.id}
        />
      }
    />
  );
}

// Stops the running timer, wherever the row is.
export function StopTimerAction({
  running,
  shortcut,
  onChange,
}: {
  running: RunningEntry;
  shortcut?: Keyboard.Shortcut;
  onChange?: OnChange;
}) {
  return (
    <Action
      title="Stop Timer"
      icon={Icon.Stop}
      shortcut={shortcut}
      onAction={async () => {
        const stopped = await stopTimer(running);
        onChange?.(stopped);
      }}
    />
  );
}

export function CopyDescriptionAction({ entry }: { entry: Entry }) {
  if (!entry.description) return null;
  return (
    <Action.CopyToClipboard
      title="Copy Description"
      content={entry.description}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
  );
}

export function CopyTicketAction({ entry }: { entry: Entry }) {
  if (!entry.ticket) return null;
  return (
    <Action.CopyToClipboard
      title="Copy Ticket"
      icon={Icon.Tag}
      content={entry.ticket}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

// The organization's page in the web app.
export function OpenSnowtimeAction({ organization, title }: { organization: Organization; title: string }) {
  return (
    <Action.OpenInBrowser
      title={title}
      url={snowtimeUrl(`/${organization.slug}`)}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

export function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
