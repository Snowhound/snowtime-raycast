// Fictional data in the shapes of Snowtime's /api/v1 answers (docs/api.md in the Snowtime
// repository), and the formatting the commands will use. Every prototype reads the same
// moment, NOW, so the pages agree on what is running and for how long.
(function () {
  const NOW = new Date(2026, 9, 5, 10, 42); // Monday 5 October 2026, 10:42 local time
  const MIN = 60_000;

  function at(daysAgo, hours, minutes) {
    const d = new Date(NOW);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  const orgs = {
    northwind: {
      id: "01920000-0000-7000-8000-000000000201",
      name: "Northwind Studio",
      slug: "northwind",
      role: "member",
    },
    harbor: { id: "01920000-0000-7000-8000-000000000202", name: "Harbor Consulting", slug: "harbor", role: "admin" },
  };

  const projects = {
    website: { id: "01920000-0000-7000-8000-000000000401", name: "Website redesign", color: "#3b82b8" },
    mobile: { id: "01920000-0000-7000-8000-000000000402", name: "Mobile app", color: "#8a5cc2" },
    internal: { id: "01920000-0000-7000-8000-000000000403", name: "Internal", color: null },
    onboarding: { id: "01920000-0000-7000-8000-000000000406", name: "Client onboarding", color: "#4f8f3a" },
  };

  let n = 0x500;
  function entry(project, description, ticket, startedAt, minutes, organizationId = orgs.northwind.id) {
    n++;
    return {
      id: `01920000-0000-7000-8000-000000000${n.toString(16)}`,
      organizationId,
      userId: "01920000-0000-7000-8000-000000000104",
      projectId: project?.id ?? null,
      description,
      ticket,
      startedAt,
      stoppedAt: minutes === null ? null : new Date(new Date(startedAt).getTime() + minutes * MIN).toISOString(),
      project,
    };
  }

  const running = entry(projects.website, "Landing page hero", "WEB-12", at(0, 9, 5), null);

  const entries = [
    running,
    entry(projects.internal, "Standup", null, at(0, 8, 45), 15),
    entry(projects.internal, "Inbox triage", "OPS-7", at(1, 16, 30), 25),
    entry(projects.website, "Landing page hero", "WEB-12", at(1, 13, 0), 180),
    entry(projects.mobile, "Inbox notifications on Android", "MOB-34", at(1, 10, 0), 120),
    entry(projects.internal, "Inbox triage", "OPS-7", at(1, 9, 0), 40),
    entry(projects.website, "Review navigation copy", "WEB-9", at(3, 14, 10), 95),
    entry(projects.mobile, "Push notification settings", "MOB-31", at(3, 10, 0), 160),
    entry(projects.internal, "Standup", null, at(3, 8, 45), 15),
    entry(projects.website, "Landing page hero", "WEB-12", at(4, 13, 0), 210),
    entry(null, "Invoices for September", null, at(4, 9, 30), 50),
    entry(projects.onboarding, "Kickoff call with Harbor", null, at(4, 8, 0), 60, orgs.harbor.id),
  ];

  // Entries without a description (task 001): one with only a ticket, one with neither. The
  // pages add them where a state needs them.
  const withoutDescription = {
    ticketOnly: entry(projects.website, "", "WEB-15", at(0, 8, 0), 40),
    bare: entry(projects.internal, "", null, at(1, 15, 0), 30),
  };

  // Raycast's UI is US English (docs/architecture/README.md, "Language and formats").
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

  // Elapsed or tracked time as h:mm, the way the menu bar shows it.
  function clock(ms) {
    const total = Math.floor(ms / MIN);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function duration(e) {
    const end = e.stoppedAt ? new Date(e.stoppedAt) : NOW;
    return clock(end - new Date(e.startedAt));
  }

  // An entry's name, as Snowtime's entryLabel gives it: the description, else the ticket,
  // else a stand-in. A list shows the ticket as a tag only when the description names the
  // entry, so it doesn't appear twice.
  function label(e) {
    return e.description || e.ticket || "No description";
  }

  // The entry in a HUD: its name in quotes, a bare ticket as is, or nothing.
  function hudName(e) {
    if (e.description) return `“${e.description}”`;
    return e.ticket ?? null;
  }

  function dayTitle(iso) {
    const d = new Date(iso);
    const today = new Date(NOW);
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return day.format(d);
  }

  window.Fixtures = {
    NOW,
    orgs,
    projects,
    running,
    entries,
    withoutDescription,
    me: {
      user: { id: "01920000-0000-7000-8000-000000000104", name: "Max Member", email: "max@example.com" },
      organizations: [orgs.harbor, orgs.northwind],
    },
    format: {
      time: (iso) => time.format(new Date(iso)),
      clock,
      duration,
      dayTitle,
      label,
      hudName,
      // Every ticket shows as a tag, also when it names the entry, so tags line up (task 004).
      ticketTag: (e) => (e.ticket ? [{ tag: e.ticket }] : []),
    },
  };
})();
