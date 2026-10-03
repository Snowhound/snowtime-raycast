import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { isApiError, NO_ANSWER } from "../api";

// A list's empty view when it couldn't load: what failed, and the action that fixes it.
export function ErrorView({ error, onRefresh }: { error: Error; onRefresh: () => void }) {
  const preferences = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
  );
  const refresh = <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />;

  if (isApiError(error) && error.status === 401) {
    return (
      <List.EmptyView
        icon={Icon.Key}
        title={error.message.replace(/\.$/, "")}
        description="Check the API key in the extension's preferences."
        actions={<ActionPanel>{preferences}</ActionPanel>}
      />
    );
  }
  if (isApiError(error) && error.code === NO_ANSWER) {
    return (
      <List.EmptyView
        icon={Icon.WifiDisabled}
        title={error.message.replace(/\.$/, "")}
        description="Check your connection or the instance URL in the extension's preferences."
        actions={
          <ActionPanel>
            {refresh}
            {preferences}
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={error.message.replace(/\.$/, "")}
      actions={<ActionPanel>{refresh}</ActionPanel>}
    />
  );
}
