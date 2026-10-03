import { PopToRootType, showHUD } from "@raycast/api";
import { api, isApiError, type RunningEntry } from "../api";
import { showApiFailure } from "../api/toast";
import { stoppedHud } from "../lib/hud";
import { cacheTimer, refreshMenuBar } from "../lib/menu-bar";

// Stops the running timer, from any command: `running` when the caller knows it, else the
// timer the API says runs. It stops that entry by its id, so a timer started since in the
// web app keeps running, and closes Raycast with a HUD. Answers whether a timer stopped.
export async function stopTimer(running?: RunningEntry) {
  const client = api();
  let timer = running ?? null;
  try {
    timer ??= await client.timer();
    if (!timer) {
      await update(null);
      await hud("No timer is running");
      return false;
    }
    try {
      const stopped = await client.stopTimer(timer.id);
      await update(null);
      await hud(stoppedHud(stopped));
      return true;
    } catch (error) {
      // 404: the entry isn't the running timer any more; show whatever runs now.
      if (!isApiError(error) || error.status !== 404) throw error;
      await update(await client.timer());
      await hud("The timer already stopped");
      return false;
    }
  } catch (error) {
    await showApiFailure(error, { title: "Couldn't stop timer", organizationSlug: await slugOf(timer) });
    return false;
  }
}

async function update(timer: RunningEntry | null) {
  cacheTimer(timer);
  await refreshMenuBar();
}

function hud(title: string) {
  return showHUD(title, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}

// The organization's slug, for a read-only key's Open Snowtime Settings.
async function slugOf(running: RunningEntry | null) {
  if (!running) return undefined;
  try {
    const { organizations } = await api().me();
    return organizations.find((org) => org.id === running.organizationId)?.slug;
  } catch {
    return undefined;
  }
}
