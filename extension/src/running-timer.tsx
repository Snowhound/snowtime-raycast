import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  type LaunchProps,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { api, snowtimeUrl, type RunningEntry } from "./api";
import { hostOf } from "./api/client";
import { loadRecent } from "./api/load-recent";
import { showApiFailure } from "./components/failure-toast";
import { projectIcon } from "./components/project-icon";
import { formatDuration, formatTime } from "./lib/format";
import { menuError, startAgainFrom } from "./lib/menu";
import { entryLabel } from "./lib/names";
import { timerOf, type EntryRow } from "./lib/rows";
import { cachedTimer, cacheTimer, countBackgroundRun, type MenuBarContext } from "./timer/cache";
import { startTimer } from "./timer/start";
import { stopTimer } from "./timer/stop";

// Running Timer: the running timer's elapsed time in the menu bar, and a menu to stop it or
// start another (docs/architecture/README.md, "The menu bar").

const DAYS = 14;
const ICON = { source: "menu-bar-icon.png", tintColor: Color.PrimaryText };

// Whether this run reads the API: every fifth background run, and any run before anything
// is cached. Opening the menu and the other commands' refreshes show the cache, so opening
// and closing the menu sends no requests; Refresh reads the API on request.
function readsApi(background: boolean, fromCache: boolean) {
  if (cachedTimer() === undefined) return true;
  return background && !fromCache && countBackgroundRun();
}

async function readTimer(fromApi: boolean) {
  if (!fromApi) return cachedTimer() ?? null;
  const timer = await api().timer();
  cacheTimer(timer);
  return timer;
}

export default function Command(props: LaunchProps<{ launchContext: MenuBarContext }>) {
  const { showStartAgain, instanceUrl } = getPreferenceValues<Preferences.RunningTimer>();
  // Raycast's minute ticks run the command in the background; opening the menu and running
  // it from Raycast's search run it as the user's own.
  const background = environment.launchType === LaunchType.Background;
  const fromCache = props.launchContext?.fromCache === true;
  // Decided once per run: it counts the run.
  const [fromApi] = useState(() => readsApi(background, fromCache));

  const timer = usePromise(readTimer, [fromApi], { onError: () => undefined });
  // The Start Again section's entries, read with the timer; the other runs keep the last ones.
  const recent = useCachedPromise(() => loadRecent(undefined, DAYS), [], {
    execute: fromApi && showStartAgain,
    onError: () => undefined,
  });

  // The timer after an action in this menu, which the menu shows itself: the refresh Start
  // and Stop ask for can't reach the command that is running.
  const [changed, setChanged] = useState<RunningEntry | null>();
  // Whether an action runs. Raycast keeps the command loaded while `isLoading` is true, also
  // after the click has closed the menu, so the action's request isn't cut off.
  const [busy, setBusy] = useState(false);

  // A failed read keeps showing the last known timer.
  const running: RunningEntry | null =
    changed !== undefined ? changed : timer.data !== undefined ? timer.data : (cachedTimer() ?? null);

  const error = timer.error ?? recent.error;
  const organizations = recent.data?.organizations ?? [];
  const slug = organizations.find((org) => org.id === running?.organizationId)?.slug ?? recent.data?.organization?.slug;
  const startAgain =
    showStartAgain && recent.data ? startAgainFrom(recent.data.entries, recent.data.projects, running) : [];

  // Runs a start, a stop, or a refresh from the menu, showing `optimistic` meanwhile when
  // given. Start and Stop leave the cache as the API answered, or as it was when they failed.
  async function act(action: () => Promise<unknown>, optimistic?: null) {
    setChanged(optimistic);
    setBusy(true);
    try {
      await action();
    } finally {
      setChanged(cachedTimer() ?? null);
      setBusy(false);
    }
  }

  // Reads the API on request, as the menu's Refresh asks.
  async function refresh() {
    try {
      const [latest] = await Promise.all([api().timer(), showStartAgain ? recent.revalidate() : undefined]);
      cacheTimer(latest);
    } catch (error) {
      await showApiFailure(error, { title: "Couldn't refresh" });
    }
  }

  const footer = (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Open Snowtime"
        icon={Icon.Globe}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => open(snowtimeUrl(slug ? `/${slug}` : ""))}
      />
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => act(refresh)}
      />
      <MenuBarExtra.Item title="Configure Extension…" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
    </MenuBarExtra.Section>
  );

  const failure = error && menuError(error, hostOf(instanceUrl), !!running);

  return (
    <MenuBarExtra
      icon={ICON}
      title={running ? formatDuration(running) : undefined}
      tooltip={running ? `${entryLabel(running)} · ${formatDuration(running)}` : "No timer running"}
      isLoading={timer.isLoading || recent.isLoading || busy}
    >
      {failure ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={failure.title}
              tooltip={failure.title}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
            />
            <MenuBarExtra.Item title={failure.detail} />
          </MenuBarExtra.Section>
          {running && <RunningSection running={running} onStop={() => act(() => stopTimer(running), null)} />}
          {footer}
        </>
      ) : (
        <>
          {running ? (
            <RunningSection running={running} onStop={() => act(() => stopTimer(running), null)} />
          ) : (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title="No timer running" />
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Start Timer…"
              icon={Icon.Play}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => launch("start-timer")}
            />
            <MenuBarExtra.Item
              title="Continue Timer…"
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={() => launch("continue-timer")}
            />
            <MenuBarExtra.Item
              title="Recent Entries…"
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => launch("recent-entries")}
            />
          </MenuBarExtra.Section>
          {startAgain.length > 0 && recent.data?.organization && (
            <MenuBarExtra.Section title="Start Again">
              {startAgain.map((row, index) => (
                <StartAgainItem
                  key={row.entry.id}
                  row={row}
                  index={index}
                  onStart={() => {
                    const organization = recent.data?.organization;
                    if (!organization) return;
                    return act(() => startTimer(organization, timerOf(row)));
                  }}
                />
              ))}
            </MenuBarExtra.Section>
          )}
          {footer}
        </>
      )}
    </MenuBarExtra>
  );
}

// The running entry: its name, project and ticket, and start time, and Stop Timer. The title
// shows the elapsed time, so the menu doesn't repeat it.
// Lines without an action are information only.
function RunningSection({ running, onStop }: { running: RunningEntry; onStop: () => void }) {
  const details = [running.project?.name ?? "No project", running.description && running.ticket]
    .filter(Boolean)
    .join(" · ");
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title={entryLabel(running)}
        tooltip={entryLabel(running)}
        icon={projectIcon(running.project)}
      />
      <MenuBarExtra.Item title={details} />
      <MenuBarExtra.Item title={`Since ${formatTime(running.startedAt)}`} />
      <MenuBarExtra.Item
        title="Stop Timer"
        icon={Icon.Stop}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={onStop}
      />
    </MenuBarExtra.Section>
  );
}

// A recent entry to start again, with ⌘1 to ⌘5 by its place.
function StartAgainItem({
  row: { entry, project },
  index,
  onStart,
}: {
  row: EntryRow;
  index: number;
  onStart: () => void;
}) {
  return (
    <MenuBarExtra.Item
      title={entryLabel(entry)}
      subtitle={entry.description ? (entry.ticket ?? undefined) : undefined}
      icon={projectIcon(project)}
      tooltip={[entryLabel(entry), project?.name, entry.description && entry.ticket].filter(Boolean).join(" · ")}
      shortcut={{ modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent }}
      onAction={onStart}
    />
  );
}

function launch(name: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}
