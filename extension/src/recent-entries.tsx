import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { snowtimeUrl, type Organization } from "./api";
import { loadRecent } from "./api/load-recent";
import {
  CopyDescriptionAction,
  CopyTicketAction,
  EditAndStartAction,
  OpenSnowtimeAction,
  RefreshAction,
  StartAgainAction,
  StopTimerAction,
} from "./components/entry-actions";
import { ErrorView } from "./components/error-view";
import { showApiFailure } from "./components/failure-toast";
import { OrganizationDropdown } from "./components/organization-dropdown";
import { projectIcon } from "./components/project-icon";
import { useElapsed } from "./hooks/use-elapsed";
import { formatDuration, formatTime } from "./lib/format";
import { entryLabel } from "./lib/names";
import { groupByDay, matches, mergeByTicket, rowsFrom, runningEntryOf, totalOf, type EntryRow } from "./lib/rows";

// Recent Entries: the last 14 days of the user's entries, every one its own row, newest
// first. Any of them starts again; the running one stops.

const DAYS = 14;

async function loadEntries(organizationId: string | undefined) {
  const { organizations, organization, projects, entries } = await loadRecent(organizationId, DAYS);
  return { organizations, organization, rows: rowsFrom(entries, projects) };
}

export default function Command() {
  const { mergeTickets } = getPreferenceValues<Preferences.RecentEntries>();
  const [organizationId, setOrganizationId] = useState<string>();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate } = useCachedPromise(loadEntries, [organizationId], {
    onError: (error) => showApiFailure(error, { title: "Couldn't load entries" }),
  });
  const organization = data?.organization;
  const rows = data?.rows ?? [];
  const running = rows.find(({ entry }) => entry.stoppedAt === null);
  // Moves the running entry's duration and its day's total once a minute.
  const now = useElapsed(running?.entry.startedAt ?? null);

  const found = searchText.trim() ? rows.filter((row) => matches(row, searchText)) : rows;

  async function refresh() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing…" });
    try {
      await revalidate();
    } finally {
      await toast.hide();
    }
  }

  // After a start or a stop, so a second open shows the change at once.
  function afterChange(changed: boolean) {
    if (changed) revalidate();
  }

  return (
    <List
      navigationTitle="Recent Entries"
      searchBarPlaceholder="Search entries"
      filtering={false}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarAccessory={
        <OrganizationDropdown
          organizations={data?.organizations ?? []}
          organization={organization}
          onChange={setOrganizationId}
        />
      }
    >
      {!data && isLoading ? null : error && !data ? (
        <ErrorView error={error} onRefresh={revalidate} />
      ) : data && !organization ? (
        <List.EmptyView
          icon={Icon.Building}
          title="No organizations"
          description="Join or create an organization in Snowtime to track time."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Snowtime" url={snowtimeUrl()} />
            </ActionPanel>
          }
        />
      ) : searchText.trim() ? (
        <List.EmptyView
          icon={Icon.List}
          title="No matching entries"
          description={`Recent Entries shows the last ${DAYS} days.`}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Clock}
          title={`No entries in the last ${DAYS} days`}
          description="Start a timer, and it shows here."
          actions={
            <ActionPanel>
              <Action
                title="Start Timer"
                icon={Icon.Play}
                onAction={() => launchCommand({ name: "start-timer", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      )}
      {organization &&
        groupByDay(found, now).map(({ title, rows }) => (
          <List.Section key={title} title={title} subtitle={totalOf(rows, now)}>
            {mergeByTicket(rows, mergeTickets).map((group) => (
              <EntryItem
                key={group[0].entry.id}
                group={group}
                day={title}
                organization={organization}
                running={running}
                now={now}
                onChange={afterChange}
                onRefresh={refresh}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

// One entry, or, with Merge Tickets, a day's entries with one ticket, newest first: the
// newest names the row, and its actions act on the running entry if the group has it.
function EntryItem({
  group,
  day,
  organization,
  running,
  now,
  onChange,
  onRefresh,
}: {
  group: EntryRow[];
  // The title of the row's day, for Show Entries.
  day: string;
  organization: Organization;
  running: EntryRow | undefined;
  now: Date;
  onChange: (changed: boolean) => void;
  // Refresh, which Show Entries' rows leave out: their list is the merged row's.
  onRefresh?: () => void;
}) {
  const row = group.find(({ entry }) => entry.stoppedAt === null) ?? group[0];
  const { entry } = row;
  const isRunning = entry.stoppedAt === null;
  const runningEntry = running && runningEntryOf(running);
  // Each entry's start and end, oldest first.
  const spans = group
    .map(({ entry }) => `${formatTime(entry.startedAt)} – ${entry.stoppedAt ? formatTime(entry.stoppedAt) : "now"}`)
    .reverse()
    .join(", ");

  const startAgain = <StartAgainAction row={row} organization={organization} onChange={onChange} />;
  const edit = <EditAndStartAction row={row} organization={organization} navigationTitle="Edit and Start" />;

  return (
    <List.Item
      icon={projectIcon(group[0].project)}
      title={entryLabel(group[0].entry)}
      subtitle={group[0].project?.name ?? (group[0].entry.projectId ? "Archived project" : "No project")}
      accessories={[
        // Also when the ticket names the entry, so every row's ticket is a tag in one place.
        ...(group[0].entry.ticket ? [{ tag: group[0].entry.ticket }] : []),
        ...(isRunning ? [{ tag: { value: "Running", color: Color.Orange } }] : []),
        ...(group.length > 1
          ? [{ text: String(group.length), icon: Icon.List, tooltip: `${group.length} entries` }]
          : []),
        {
          text: group.length > 1 ? totalOf(group, now) : formatDuration(entry, now),
          icon: Icon.Clock,
          tooltip: spans,
        },
      ]}
      actions={
        <ActionPanel>
          {isRunning && runningEntry ? (
            <>
              <StopTimerAction running={runningEntry} onChange={onChange} />
              {edit}
              {startAgain}
            </>
          ) : (
            <>
              {startAgain}
              {edit}
            </>
          )}
          <ActionPanel.Section title="Entry">
            {group.length > 1 && (
              <Action.Push
                title="Show Entries"
                icon={Icon.List}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <MergedEntries
                    group={group}
                    day={day}
                    organization={organization}
                    running={running}
                    onChange={onChange}
                  />
                }
              />
            )}
            <CopyDescriptionAction entry={entry} />
            <CopyTicketAction entry={entry} />
            <OpenSnowtimeAction organization={organization} title="Open in Snowtime" />
          </ActionPanel.Section>
          {runningEntry && !isRunning && (
            <ActionPanel.Section title="Running Timer">
              <StopTimerAction running={runningEntry} shortcut={Keyboard.Shortcut.Common.Save} onChange={onChange} />
            </ActionPanel.Section>
          )}
          {onRefresh && (
            <ActionPanel.Section title="List">
              <RefreshAction onRefresh={onRefresh} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

// Show Entries: a merged row's entries, each its own row with its own actions.
function MergedEntries({
  group,
  day,
  organization,
  running,
  onChange,
}: {
  group: EntryRow[];
  day: string;
  organization: Organization;
  running: EntryRow | undefined;
  onChange: (changed: boolean) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const now = useElapsed(running?.entry.startedAt ?? null);
  const found = searchText.trim() ? group.filter((row) => matches(row, searchText)) : group;

  return (
    <List
      navigationTitle={`${group[0].entry.ticket} · ${day}`}
      searchBarPlaceholder="Search entries"
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.List} title="No matching entries" />
      <List.Section title={day} subtitle={totalOf(found, now)}>
        {found.map((row) => (
          <EntryItem
            key={row.entry.id}
            group={[row]}
            day={day}
            organization={organization}
            running={running}
            now={now}
            onChange={onChange}
          />
        ))}
      </List.Section>
    </List>
  );
}
