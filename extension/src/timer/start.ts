import { environment, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { api, type Organization } from "../api";
import { showApiFailure } from "../components/failure-toast";
import { newEntryId } from "../lib/ids";
import { startedHud } from "../lib/names";
import type { NewTimer } from "../lib/rows";
import { rememberStart } from "../settings/organization";
import { cacheTimer, refreshMenuBar } from "./cache";

// Starts a timer as a new entry, from any command: remembers its organization and project
// for the next form, shows it in the menu bar, and closes Raycast with a HUD. A failure
// stays in the view as a toast. Answers whether the timer started.
export async function startTimer(organization: Organization, timer: NewTimer) {
  // The menu bar has no window for a toast.
  const toast =
    environment.commandMode === "menu-bar"
      ? undefined
      : await showToast({ style: Toast.Style.Animated, title: "Starting timer…" });
  try {
    const { started, stopped } = await api().startTimer(organization.id, {
      id: newEntryId(),
      description: timer.description,
      ticket: timer.ticket,
      projectId: timer.project?.id ?? null,
    });
    await rememberStart(organization.id, timer.project?.id ?? null);
    cacheTimer({ ...started, project: timer.project });
    await refreshMenuBar();
    await toast?.hide();
    await showHUD(startedHud(started, stopped), { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    return true;
  } catch (error) {
    await toast?.hide();
    await showApiFailure(error, { title: "Couldn't start timer", organizationSlug: organization.slug });
    return false;
  }
}
