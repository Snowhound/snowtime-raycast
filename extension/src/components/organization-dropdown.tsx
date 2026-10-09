import { Icon, List } from "@raycast/api";
import type { Organization } from "../api";
import { rememberOrganization } from "../settings/organization";

// The search bar's organization picker; none for a user in one organization. A pick is
// remembered for every command (docs/architecture/README.md, "Organizations").
export function OrganizationDropdown({
  organizations,
  organization,
  onChange,
}: {
  organizations: Organization[];
  organization: Organization | undefined;
  onChange: (id: string) => void;
}) {
  if (organizations.length < 2 || !organization) return null;
  function change(id: string) {
    if (id === organization?.id) return;
    rememberOrganization(id);
    onChange(id);
  }
  return (
    <List.Dropdown tooltip="Organization" value={organization.id} onChange={change}>
      {organizations.map((org) => (
        <List.Dropdown.Item key={org.id} value={org.id} title={org.name} icon={Icon.Building} />
      ))}
    </List.Dropdown>
  );
}
