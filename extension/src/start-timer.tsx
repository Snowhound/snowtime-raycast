import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { snowtimeUrl, type Organization, type RunningEntry } from "./api";
import { loadRecent } from "./api/load-recent";
import {
  CopyDescriptionAction,
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
import { TimerForm } from "./components/timer-form";
import { useElapsed } from "./hooks/use-elapsed";
import { formatDuration, formatTime } from "./lib/format";
import { entryLabel } from "./lib/names";
import { groupByDay, matches, newTimerFrom, runningEntryOf, suggestionsFrom, type EntryRow } from "./lib/rows";

// Start Timer: a list whose search bar is the description, with the user's recent entries
// to start again (docs/architecture/README.md, "Starting and continuing").

const EMPTY_TITLES: Record<string, string> = {
  "2": "No entries since yesterday",
  "7": "No entries in the last 7 days",
  "14": "No entries in the last 14 days",
};

async function loadSuggestions(organizationId: string | undefined, days: number) {
  const { organizations, organization, projects, entries } = await loadRecent(organizationId, days);
  return { organizations, organization, suggestions: suggestionsFrom(entries, projects) };
}

export default function Command(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  const { suggestionRange } = getPreferenceValues<Preferences>();
  const days = Number(suggestionRange) || 2;
  const [organizationId, setOrganizationId] = useState<string>();
  // Text from Raycast's root search: the Description argument, or the root search's text when
  // Start Timer runs as a fallback command. It fills the search bar as if typed there.
  const [launchText] = useState(() => (props.arguments.description || props.fallbackText || "").trim());
  const [searchText, setSearchText] = useState(launchText);
  // Whether the launch text opens the timer form instead: decided once, when the fresh
  // suggestions arrive, and only when none matches it.
  const [opensForm, setOpensForm] = useState<boolean>();

  const { data, isLoading, error, revalidate } = useCachedPromise(loadSuggestions, [organizationId, days], {
    onError: (error) => showApiFailure(error, { title: "Couldn't load recent entries" }),
  });
  const organization = data?.organization;

  const found = (data?.suggestions ?? []).filter((suggestion) => !searchText.trim() || matches(suggestion, searchText));
  const sections = groupByDay(found);
  // The running entry, if a suggestion holds it, for every row's Stop Timer.
  const running = data?.suggestions.find(({ entry }) => entry.stoppedAt === null);
  const runningEntry = running && runningEntryOf(running);

  useEffect(() => {
    if (opensForm !== undefined || !launchText || isLoading) return;
    const suggestions = data?.suggestions ?? [];
    setOpensForm(!error && !!data?.organization && !suggestions.some((row) => matches(row, launchText)));
  }, [opensForm, launchText, isLoading, data, error]);

  // Until then the list stays empty with its loading bar, so cached rows don't show for a
  // moment before the form replaces them.
  const deciding = !!launchText && opensForm === undefined;

  // In the list's place, so Esc goes back to root search (docs/architecture/README.md,
  // "Starting and continuing").
  if (opensForm && organization) {
    const { description, ticket } = newTimerFrom(launchText);
    return (
      <TimerForm
        navigationTitle="Start Timer"
        description={description}
        ticket={ticket}
        organizationId={organization.id}
      />
    );
  }

  return (
    <List
      navigationTitle="Start Timer"
      searchBarPlaceholder="What are you working on?"
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading || deciding}
      searchBarAccessory={
        <OrganizationDropdown
          organizations={data?.organizations ?? []}
          organization={organization}
          onChange={setOrganizationId}
        />
      }
    >
      {deciding || (!data && isLoading) ? null : error && !data ? (
        <ErrorView error={error} onRefresh={revalidate} />
      ) : data && !organization ? (
        <List.EmptyView
          icon={Icon.Building}
          title="No organizations"
          description="Join or create an organization in Snowtime to start a timer."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Snowtime" url={snowtimeUrl()} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Clock}
          title={EMPTY_TITLES[suggestionRange] ?? EMPTY_TITLES["2"]}
          description="Type what you're working on to start a timer."
          actions={
            organization && (
              <ActionPanel>
                <NewTimerAction text={searchText} organization={organization} />
              </ActionPanel>
            )
          }
        />
      )}
      {organization &&
        !deciding &&
        sections.map(({ title, rows }) => (
          <List.Section key={title} title={title}>
            {rows.map((suggestion) => (
              <SuggestionItem
                key={suggestion.entry.id}
                suggestion={suggestion}
                organization={organization}
                searchText={searchText}
                running={runningEntry}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
        ))}
      {organization && !deciding && searchText.trim() && (
        <List.Section title={found.length > 0 ? "New" : undefined}>
          <NewTimerItem text={searchText} organization={organization} />
        </List.Section>
      )}
    </List>
  );
}

function SuggestionItem({
  suggestion,
  organization,
  searchText,
  running,
  onRefresh,
}: {
  suggestion: EntryRow;
  organization: Organization;
  searchText: string;
  // The running timer, when a suggestion holds it.
  running: RunningEntry | undefined;
  onRefresh: () => void;
}) {
  const { entry, project } = suggestion;
  const isRunning = entry.stoppedAt === null;
  const now = useElapsed(isRunning ? entry.startedAt : null);
  return (
    <List.Item
      icon={projectIcon(project)}
      title={entryLabel(entry)}
      subtitle={project?.name ?? "No project"}
      accessories={[
        // Also when the ticket names the entry, so every row's ticket is a tag in one place.
        ...(entry.ticket ? [{ tag: entry.ticket }] : []),
        isRunning
          ? { tag: { value: `Running ${formatDuration(entry, now)}`, color: Color.Orange } }
          : { text: formatTime(entry.startedAt), tooltip: "Last started" },
      ]}
      actions={
        <ActionPanel>
          <StartAgainAction
            row={suggestion}
            organization={organization}
            title={isRunning ? "Start Again" : "Start Timer"}
          />
          <EditAndStartAction row={suggestion} organization={organization} navigationTitle="Start Timer" />
          <NewTimerAction text={searchText} organization={organization} />
          <CopyDescriptionAction entry={entry} />
          <OpenSnowtimeAction organization={organization} title="Open Snowtime" />
          <RefreshAction onRefresh={onRefresh} />
          {running && (
            <ActionPanel.Section title="Running Timer">
              <StopTimerAction running={running} shortcut={Keyboard.Shortcut.Common.Save} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

// New Timer (⌘N): the timer form with the typed text, as the New timer row opens it, or
// empty when nothing is typed.
function NewTimerAction({ text, organization }: { text: string; organization: Organization }) {
  const { description, ticket } = newTimerFrom(text);
  return (
    <Action.Push
      title="New Timer"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <TimerForm
          navigationTitle="Start Timer"
          description={description}
          ticket={ticket}
          organizationId={organization.id}
        />
      }
    />
  );
}

// The last row while the user types: a new timer with the typed text, opened in the form.
// ⌘N runs its action too, so New Timer's shortcut works on every row.
function NewTimerItem({ text, organization }: { text: string; organization: Organization }) {
  const { description, ticket } = newTimerFrom(text);
  return (
    <List.Item
      icon={Icon.Plus}
      title={description}
      subtitle="New timer"
      accessories={ticket ? [{ tag: ticket }] : []}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit and Start"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.New}
            target={
              <TimerForm
                navigationTitle="Start Timer"
                description={description}
                ticket={ticket}
                organizationId={organization.id}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}
