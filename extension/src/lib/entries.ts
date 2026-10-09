// How the extension names an entry (docs/architecture/README.md, "Language and formats").

interface Named {
  description: string;
  ticket: string | null;
}

// As Snowtime's entryLabel names it: the description, else the ticket, else a stand-in.
export function entryLabel(entry: Named) {
  return entry.description || entry.ticket || "No description";
}

// The entry in a HUD: its description in quotes, a bare ticket as is, or null when it has
// neither, so the HUD says "a timer" or "the timer" instead.
export function hudName(entry: Named) {
  if (entry.description) return `“${entry.description}”`;
  return entry.ticket || null;
}
