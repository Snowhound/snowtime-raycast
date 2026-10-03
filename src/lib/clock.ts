// Whether times show in 12 or 24 hours (docs/architecture/README.md, "Language and
// formats"): the Time Format preference, whose System Default takes the hour cycle of the
// locale the extension runs in, as other Raycast extensions do.

export type HourCycle = "h12" | "h23";
export type TimeFormat = "system" | "12-hour" | "24-hour";

export function hourCycleFor(format: TimeFormat, systemLocale?: string): HourCycle {
  if (format === "12-hour") return "h12";
  if (format === "24-hour") return "h23";
  const { hourCycle, hour12 } = new Intl.DateTimeFormat(systemLocale, { hour: "numeric" }).resolvedOptions();
  return hour12 === false || hourCycle === "h23" || hourCycle === "h24" ? "h23" : "h12";
}
