import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { snowtimeUrl, type Organization } from "./api";
import { showApiFailure } from "./api/toast";
import { ErrorView } from "./components/error-view";
import { OrganizationDropdown } from "./components/organization-dropdown";
import { projectIcon } from "./components/project-icon";
import { startTimer } from "./components/start";
import { TimerForm } from "./components/timer-form";
import { useElapsed } from "./components/use-elapsed";
import { entryLabel } from "./lib/entries";
import { formatDuration, formatTime } from "./lib/format";
import { loadRecent } from "./lib/recent";
import { groupByDay, matches, newTimerFrom, suggestionsFrom, type EntryRow } from "./lib/rows";

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

export default function Command() {
  const { suggestionRange } = getPreferenceValues<Preferences>();
  const days = Number(suggestionRange) || 2;
  const [organizationId, setOrganizationId] = useState<string>();
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, revalidate } = useCachedPromise(loadSuggestions, [organizationId, days], {
    onError: (error) => showApiFailure(error, { title: "Couldn't load recent entries" }),
  });
  const organization = data?.organization;

  const found = (data?.suggestions ?? []).filter((suggestion) => !searchText.trim() || matches(suggestion, searchText));
  const sections = groupByDay(found);

  return (
    <List
      navigationTitle="Start Timer"
      searchBarPlaceholder="What are you working on?"
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
                <Action.Push
                  title="Edit and Start"
                  icon={Icon.Pencil}
                  target={<TimerForm navigationTitle="Start Timer" organizationId={organization.id} />}
                />
              </ActionPanel>
            )
          }
        />
      )}
      {organization &&
        sections.map(({ title, rows }) => (
          <List.Section key={title} title={title}>
            {rows.map((suggestion) => (
              <SuggestionItem
                key={suggestion.entry.id}
                suggestion={suggestion}
                organization={organization}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
        ))}
      {organization && searchText.trim() && (
        <List.Section title={found.length > 0 ? "New" : undefined}>
          <NewTimerItem text={searchText} organization={organization} />
        </List.Section>
      )}
    </List>
  );
}

function SuggestionItem({
  suggestion: { entry, project },
  organization,
  onRefresh,
}: {
  suggestion: EntryRow;
  organization: Organization;
  onRefresh: () => void;
}) {
  const running = entry.stoppedAt === null;
  const now = useElapsed(running ? entry.startedAt : null);
  return (
    <List.Item
      icon={projectIcon(project)}
      title={entryLabel(entry)}
      subtitle={project?.name ?? "No project"}
      accessories={[
        ...(entry.description && entry.ticket ? [{ tag: entry.ticket }] : []),
        running
          ? { tag: { value: `Running ${formatDuration(entry, now)}`, color: Color.Orange } }
          : { text: formatTime(entry.startedAt), tooltip: "Last started" },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={running ? "Start Again" : "Start Timer"}
            icon={Icon.Play}
            onAction={() => startTimer(organization, { description: entry.description, ticket: entry.ticket, project })}
          />
          <Action.Push
            title="Edit and Start"
            icon={Icon.Pencil}
            target={
              <TimerForm
                navigationTitle="Start Timer"
                description={entry.description}
                ticket={entry.ticket}
                projectId={project?.id ?? null}
                organizationId={organization.id}
              />
            }
          />
          {entry.description && (
            <Action.CopyToClipboard
              title="Copy Description"
              content={entry.description}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action.OpenInBrowser
            title="Open Snowtime"
            url={snowtimeUrl(`/${organization.slug}`)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

// The last row while the user types: a new timer with the typed text, opened in the form.
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
