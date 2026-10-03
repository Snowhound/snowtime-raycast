import { getPreferenceValues } from "@raycast/api";
import { hourCycleFor, type HourCycle } from "./clock";

// The hour cycle the Time Format preference chooses.
export function preferredHourCycle(): HourCycle {
  return hourCycleFor(getPreferenceValues<Preferences>().timeFormat ?? "system");
}
