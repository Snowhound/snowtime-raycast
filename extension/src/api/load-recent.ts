import { api } from "./index";
import { lastDays } from "../lib/format";
import { pickOrganization, rememberedOrganization } from "../settings/organization";

// The user's own entries of the last `days` days in an organization, with its projects:
// `organizationId` when the user picked one, else the remembered one. An admin can read
// everyone's entries, so the request names the user.
export async function loadRecent(organizationId: string | undefined, days: number) {
  const client = api();
  const me = await client.me();
  const organization = organizationId
    ? pickOrganization(me.organizations, organizationId)
    : await rememberedOrganization(me.organizations);
  if (!organization) return { organizations: me.organizations, organization, projects: [], entries: [] };
  const [projects, entries] = await Promise.all([
    client.projects(organization.id),
    client.entries(organization.id, { ...lastDays(days), userId: me.user.id }),
  ]);
  return { organizations: me.organizations, organization, projects, entries };
}
