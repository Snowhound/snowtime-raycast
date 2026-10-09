// Ticket keys in descriptions, ported from Snowtime's src/lib/tickets.ts with its tests, so
// the extension finds and accepts the same keys as the web app and the API
// (docs/architecture/README.md, "Tickets from the description"). Keep the two in step.

// A key as Jira, Linear, and YouTrack write them: a letter, one to nine more letters or
// digits, a dash, and a number.
const KEY = String.raw`[A-Z][A-Z0-9]{1,9}-[1-9]\d{0,6}`;
const KEYS = new RegExp(String.raw`(?<![\w-])${KEY}(?![\w-])`, "g");
// A key at the start, optionally in brackets, and the separator after it.
const LEADING = new RegExp(String.raw`^\[?(${KEY})\]?(?:\s*[:|,/–—-]\s*|\s+|$)`);
// A pasted issue link, such as …/browse/KEY or …/issue/KEY, becomes its key.
const ISSUE_LINK = new RegExp(String.raw`https?://\S+?/(?:browse|issues?)/(${KEY})(?![\w-])\S*`, "gi");
// Standards whose numbers look like keys.
const NOT_TICKETS = new Set(["UTF", "ISO", "SHA", "COVID"]);

export const TICKET_PATTERN = new RegExp(`^${KEY}$`);

// The keys in a text, in order.
export function keysIn(text: string) {
  return [...text.matchAll(KEYS)].map((match) => match[0]);
}

// The description and ticket after committing `text`. A key at the start becomes the ticket
// and leaves the text, replacing any ticket the entry had; a key later in the text becomes it
// only when there is none, and stays so the sentence still reads. Other keys stay text, and
// so do keys in `known`. The timer form calls it only when Ticket is empty, so a ticket the
// user typed is never replaced.
export function detectTicket(text: string, known: ReadonlySet<string>, ticket: string | null) {
  const description = text.replace(ISSUE_LINK, (_, key: string) => key.toUpperCase()).trim();
  function fresh(key: string) {
    return !known.has(key) && !NOT_TICKETS.has(key.split("-")[0]);
  }
  const lead = LEADING.exec(description);
  if (lead && fresh(lead[1])) {
    return { description: description.slice(lead[0].length).trim(), ticket: lead[1] };
  }
  return { description, ticket: ticket ?? keysIn(description).find(fresh) ?? null };
}
