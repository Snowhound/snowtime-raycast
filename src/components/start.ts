import { PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { api, type Organization, type Project } from "../api";
import { showApiFailure } from "../api/toast";
import { startedHud } from "../lib/hud";
import { newEntryId } from "../lib/ids";
import { cacheTimer, refreshMenuBar } from "../lib/menu-bar";
import { rememberStart } from "../lib/organization";

export interface NewTimer {
  description: string;
  ticket: string | null;
  project: Project | null;
}

// Starts a timer as a new entry, from any command: remembers its organization and project
// for the next form, shows it in the menu bar, and closes Raycast with a HUD. A failure
// stays in the view as a toast. Answers whether the timer started.
export async function startTimer(organization: Organization, timer: NewTimer) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Starting timer…" });
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
    await toast.hide();
    await showHUD(startedHud(started, stopped), { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    return true;
  } catch (error) {
    await toast.hide();
    await showApiFailure(error, { title: "Couldn't start timer", organizationSlug: organization.slug });
    return false;
  }
}
