import { LocalStorage } from "@raycast/api";

// The organization the extension works in, and the project of the last started timer, kept
// in LocalStorage so every command and the menu bar agree (docs/architecture/README.md,
// "Organizations" and "Starting and continuing").

const ORGANIZATION = "organizationId";
const PROJECT = "projectId";

// The remembered organization, or the first by name when there is none or the user has
// left it. GET /api/v1/me sorts organizations by name. Undefined when the user has none.
export function pickOrganization<T extends { id: string }>(organizations: T[], rememberedId?: string) {
  return organizations.find((org) => org.id === rememberedId) ?? organizations[0];
}

export async function rememberedOrganization<T extends { id: string }>(organizations: T[]) {
  return pickOrganization(organizations, await LocalStorage.getItem<string>(ORGANIZATION));
}

// Chooses an organization. Changing it forgets the project, which belonged to the old one.
export async function rememberOrganization(organizationId: string) {
  if ((await LocalStorage.getItem<string>(ORGANIZATION)) === organizationId) return;
  await LocalStorage.setItem(ORGANIZATION, organizationId);
  await LocalStorage.removeItem(PROJECT);
}

// Saves the organization and project of a timer just started.
export async function rememberStart(organizationId: string, projectId: string | null) {
  await LocalStorage.setItem(ORGANIZATION, organizationId);
  if (projectId) await LocalStorage.setItem(PROJECT, projectId);
  else await LocalStorage.removeItem(PROJECT);
}

// The remembered project, if it belongs to the organization and the organization still
// lists it: GET /api/v1/organizations/:orgId/projects lists only active projects, so an
// archived or deleted one falls back to no project.
export async function rememberedProject<T extends { id: string }>(organizationId: string, projects: T[]) {
  const [org, projectId] = await Promise.all([
    LocalStorage.getItem<string>(ORGANIZATION),
    LocalStorage.getItem<string>(PROJECT),
  ]);
  if (org !== organizationId) return undefined;
  return projects.find((project) => project.id === projectId);
}
